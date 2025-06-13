use std::env;
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal; // 종료 신호를 감지하기 위해 필요

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

    // ✨ 메인 루프 구조를 변경하여 accept() 에러를 명시적으로 로깅합니다.
    loop {
        tokio::select! {
            // 클라이언트 연결 수락
            result = listener.accept() => {
                match result {
                    Ok((stream, _)) => {
                        // 성공 시, 이전과 동일하게 연결 처리
                        let client_clone = redis_client.clone();
                        tokio::spawn(handle_connection(stream, client_clone));
                    }
                    Err(e) => {
                        // accept()에서 에러가 발생하면 로그를 남깁니다.
                        eprintln!("🔴 클라이언트 접속 수락(accept) 실패: {:?}", e);
                    }
                }
            },

            // Ctrl+C 종료 신호 감지
            _ = signal::ctrl_c() => {
                println!("\nℹ️ Ctrl+C 신호 수신. 서버를 종료합니다.");
                break; // loop를 빠져나가 main 함수를 종료합니다.
            }
        }
    }
}
// handle_connection 함수는 이전과 동일합니다.
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("연결된 스트림은 peer 주소를 가져야 합니다.");
    println!("🤝 새로운 클라이언트 접속: {}", addr);

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
            let channel = "attention-data";
            let _: () = match redis_conn.publish(channel, &text).await {
                Ok(_) => {
                    if write.send(Message::Text(format!("Echo: {}", text))).await.is_err() {
                        break;
                    }
                    continue;
                },
                Err(e) => {
                    println!("🔴 '{}'의 메시지를 Redis에 발행 실패: {}", addr, e);
                    break;
                }
            };
        }
        break;
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
