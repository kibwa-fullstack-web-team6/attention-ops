use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;

// main 함수는 변경 없습니다.
#[tokio::main]
async fn main() {
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);
    let redis_client = redis::Client::open(redis_url).expect("유효하지 않은 Redis URL입니다.");

    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(&addr).await.expect("바인딩 실패");

    println!("✅ WebSocket 서버가 다음 주소에서 실행 중입니다: {}", addr);
    println!("🔌 Redis 접속 대상: {}:{}", redis_host, redis_port);

    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, _)) => {
                        let client_clone = redis_client.clone();
                        tokio::spawn(handle_connection(stream, client_clone));
                    }
                    Err(e) => {
                        eprintln!("🔴 클라이언트 접속 수락(accept) 실패: {:?}", e);
                    }
                }
            },
            _ = signal::ctrl_c() => {
                println!("\nℹ️ Ctrl+C 신호 수신. 서버를 종료합니다.");
                break;
            }
        }
    }
}

// ✨ handle_connection 함수만 이 코드로 교체해주세요.
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("연결된 스트림은 peer 주소를 가져야 합니다.");

    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("🔴 Redis 연결 실패 ({}): {:?}", addr, e);
            return;
        }
    };
    println!("🟢 Redis 연결 성공 (클라이언트: {})", addr);

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("🔴 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e);
            return;
        }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        if let Ok(Message::Text(text)) = msg {
            println!("<- '{}'로부터 텍스트 수신: {}", addr, &text);
            
            let channel = "attention-data";
            // ✨ 2. `publish`에 반환 타입을 명시적으로 알려줍니다.
            match redis_conn.publish::<&str, &str, i64>(channel, &text).await {
                Ok(subscribers_count) => {
                    println!("-> '{}'의 메시지를 Redis 채널 '{}'에 발행 성공 ({}명 수신)", addr, channel, subscribers_count);
                    // 에코 메시지 전송
                    if write.send(Message::Text(format!("Echo: {}", text))).await.is_err() {
                        break;
                    }
                },
                Err(e) => {
                    eprintln!("🔴 '{}'의 메시지를 Redis에 발행 실패: {:?}", addr, e);
                    break;
                }
            };
        } else {
            // 텍스트 메시지가 아니거나, 에러 발생 시 연결 종료
            break;
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
