use std::env;
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands; // Redis 비동기 명령을 위한 트레이트

#[tokio::main]
async fn main() {
    // ✨ 2. 환경 변수에서 Redis 접속 정보를 읽어옵니다.
    // Docker Compose에서 주입해 줄 예정입니다.
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);

    // Redis 클라이언트를 생성합니다.
    let redis_client = redis::Client::open(redis_url).expect("유효하지 않은 Redis URL입니다.");

    // 웹소켓 서버 주소를 설정하고 리스너를 바인딩합니다.
    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(&addr).await.expect("바인딩 실패");

    println!("✅ WebSocket 서버가 다음 주소에서 실행 중입니다: {}", addr);
    println!("🔌 Redis 접속 대상: {}:{}", redis_host, redis_port);


    // 클라이언트 접속을 기다리는 루프
    while let Ok((stream, _)) = listener.accept().await {
        // ✨ 3. 각 클라이언트 연결마다 Redis 클라이언트를 복제(clone)하여 전달합니다.
        // Rust의 소유권(Ownership) 규칙 때문에, 여러 비동기 태스크에서 안전하게
        // 클라이언트를 공유하기 위한 일반적인 패턴입니다.
        let client_clone = redis_client.clone();
        tokio::spawn(handle_connection(stream, client_clone));
    }
}

// ✨ handle_connection 함수가 이제 Redis 클라이언트도 인자로 받습니다.
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("연결된 스트림은 peer 주소를 가져야 합니다.");
    println!("🤝 새로운 클라이언트 접속: {}", addr);

    // Redis에 비동기로 연결합니다.
    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            println!("🔴 Redis 연결 실패 ({}): {}", addr, e);
            return;
        }
    };
    println!("🟢 Redis 연결 성공 (클라이언트: {})", addr);


    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            println!("🔴 웹소켓 핸드셰이크 에러: {}", e);
            return;
        }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        if let Ok(Message::Text(text)) = msg {
            println!("<- '{}'로부터 텍스트 수신: {}", addr, &text);

            // ✨ 4. 받은 메시지를 Redis 채널에 발행(Publish)합니다.
            let channel = "attention-data";
            let _: () = match redis_conn.publish(channel, &text).await {
                Ok(_) => {
                    println!("-> '{}'의 메시지를 Redis 채널 '{}'에 발행 성공", addr, channel);
                    // 받은 메시지를 그대로 클라이언트에게 다시 보냄 (에코)
                    if write.send(Message::Text(text)).await.is_err() {
                        break; // 에러 시 루프 종료
                    }
                    continue; // 성공 시 다음 메시지 기다림
                },
                Err(e) => {
                    println!("🔴 '{}'의 메시지를 Redis에 발행 실패: {}", addr, e);
                    break;
                }
            };
        }
        // 다른 타입의 메시지나 에러가 오면 연결 종료
        break;
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}