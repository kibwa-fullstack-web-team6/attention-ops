use std::env;
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;

#[tokio::main]
async fn main() {
    // --- 1. 환경 변수 읽기 ---
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);
    println!("ℹ️ 준비: Redis 접속 시도 -> {}", redis_url);

    // --- 2. Redis 클라이언트 생성 (에러 처리 추가) ---
    let redis_client = match redis::Client::open(redis_url) {
        Ok(client) => {
            println!("✅ 준비: Redis 클라이언트 생성 성공");
            client
        },
        Err(e) => {
            eprintln!("🔴 치명적 에러: Redis 클라이언트 생성 실패: {:?}", e);
            return; // 클라이언트 생성 실패 시 프로그램 종료
        }
    };

    // --- 3. 웹소켓 서버 바인딩 (에러 처리 추가) ---
    let addr = "0.0.0.0:9001";
    let listener = match TcpListener::bind(&addr).await {
        Ok(listener) => {
            println!("✅ 준비: TCP 리스너 바인딩 성공 -> {}", addr);
            listener
        },
        Err(e) => {
            eprintln!("🔴 치명적 에러: TCP 리스너 바인딩 실패 ({}): {:?}", addr, e);
            return; // 바인딩 실패 시 프로그램 종료
        }
    };
    
    println!("🚀 WebSocket 서버가 다음 주소에서 실행을 시작합니다.");

    // --- 4. 메인 루프 실행 ---
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

// 개별 클라이언트 연결을 처리하는 비동기 함수
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
            let channel = "attention-data";
            let _: () = match redis_conn.publish(channel, &text).await {
                Ok(_) => {
                    // 클라이언트에 다시 메시지를 보내는 부분은 지금 중요하지 않으므로, 에러가 나도 무시하고 계속 진행
                    let _ = write.send(Message::Text(format!("Echo: {}", text))).await;
                    continue;
                },
                Err(e) => {
                    eprintln!("🔴 '{}'의 메시지를 Redis에 발행 실패: {:?}", addr, e);
                    break;
                }
            };
        }
        break; // Text 메시지가 아니거나, 에러 발생 시 루프 종료
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
