use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};

#[tokio::main]
async fn main() {
    // --- Redis 클라이언트 및 TCP 리스너 설정 ---
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);

    let redis_client = match redis::Client::open(redis_url) {
        Ok(client) => client,
        Err(e) => { eprintln!("🔴 치명적 에러: Redis 클라이언트 생성 실패: {:?}", e); return; }
    };

    let addr = "0.0.0.0:9001";
    let listener = match TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(e) => { eprintln!("🔴 치명적 에러: TCP 리스너 바인딩 실패 ({}): {:?}", addr, e); return; }
    };
    println!("🚀 WebSocket 서버가 다음 주소에서 실행을 시작합니다.");

    // --- SIGHUP 신호 핸들러 추가 ---
    let mut hup = signal(SignalKind::hangup()).expect("SIGHUP 핸들러 설치 실패");
    
    // --- 메인 루프 실행 ---
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
            },
            _ = hup.recv() => {
                println!("🟡 SIGHUP 신호 수신, 무시하고 계속 실행합니다.");
            }
        }
    }
}

async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("연결된 스트림은 peer 주소를 가져야 합니다.");
    
    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => { eprintln!("🔴 Redis 연결 실패 ({}): {:?}", addr, e); return; }
    };

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => { eprintln!("🔴 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e); return; }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        if let Ok(Message::Text(text)) = msg {
            println!("<- '{}'로부터 텍스트 수신", addr);
            let channel = "attention-data";
            match redis_conn.publish::<_, _, i64>(channel, &text).await {
                Ok(subscribers_count) => {
                    println!("-> Redis 발행 성공 ({}명 수신)", subscribers_count);
                    if write.send(Message::Text("OK".to_string())).await.is_err() { break; }
                },
                Err(e) => {
                    eprintln!("🔴 Redis 발행 실패: {:?}", e);
                    break;
                }
            };
        } else {
            println!("<- '{}'로부터 Text가 아닌 메시지 수신, 연결 종료.", addr);
            break;
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
