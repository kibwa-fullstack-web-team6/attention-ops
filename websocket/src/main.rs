use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;

#[tokio::main]
async fn main() {
    // main 함수는 변경 없습니다.
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);

    let redis_client = match redis::Client::open(redis_url) {
        Ok(client) => client,
        Err(e) => {
            eprintln!("🔴 치명적 에러: Redis 클라이언트 생성 실패: {:?}", e);
            return;
        }
    };

    let addr = "0.0.0.0:9001";
    let listener = match TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(e) => {
            eprintln!("🔴 치명적 에러: TCP 리스너 바인딩 실패 ({}): {:?}", addr, e);
            return;
        }
    };
    
    println!("🚀 WebSocket 서버가 다음 주소에서 실행을 시작합니다.");

    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, _)) => {
                        let client_clone = redis_client.clone();
                        tokio::spawn(handle_connection(stream, client_clone));
                    }
                    Err(e) => {
                        eprintln!("� 클라이언트 접속 수락(accept) 실패: {:?}", e);
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

// ✨ handle_connection 함수의 루프 로직을 더 상세하게 수정합니다.
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("연결된 스트림은 peer 주소를 가져야 합니다.");
    
    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("🔴 Redis 연결 실패 ({}): {:?}", addr, e);
            return;
        }
    };

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("🔴 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e);
            return;
        }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    // while let 대신 loop와 match를 사용하여 모든 경우를 처리합니다.
    loop {
        match read.next().await {
            Some(Ok(Message::Text(text))) => {
                println!("<- [Text] '{}'로부터 수신", addr);
                let channel = "attention-data";
                match redis_conn.publish::<_, _, i64>(channel, &text).await {
                    Ok(_) => {
                        let _ = write.send(Message::Text("OK".to_string())).await;
                    },
                    Err(e) => {
                        eprintln!("🔴 Redis 발행 실패: {:?}", e);
                        break;
                    }
                };
            },
            Some(Ok(msg)) => {
                // Text가 아닌 다른 종류의 메시지를 받았을 경우 로그를 남깁니다.
                println!("<- [Other Msg] '{}'로부터 다른 타입의 메시지 수신: {:?}", addr, msg);
                // 다른 메시지 타입은 일단 무시하고 루프를 계속합니다.
                // 만약 Close 메시지였다면, 다음 루프에서 None이 되어 종료될 것입니다.
            },
            Some(Err(e)) => {
                // 메시지를 읽는 과정에서 프로토콜 에러가 발생한 경우
                eprintln!("🔴 메시지 수신 중 프로토콜 에러 발생: {:?}", e);
                break;
            },
            None => {
                // 스트림이 정상적으로 끝난 경우 (보통 Close 메시지 이후)
                println!("ℹ️ '{}'와의 스트림이 정상적으로 종료되었습니다.", addr);
                break;
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}