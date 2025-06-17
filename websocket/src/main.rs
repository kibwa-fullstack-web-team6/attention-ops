use serde::Deserialize;
use serde_json::Value;
use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};
use std::time::Duration;
use tokio::time::interval;

// --- 데이터 구조체 정의 ---
#[derive(Deserialize, Debug)]
struct DataPayload {
    ear_left: f64,
    ear_right: f64,
}

#[derive(Deserialize, Debug)]
struct ClientMessage {
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "userId")]
    user_id: String,
    timestamp: String,
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Value,
}

// --- main 함수 ---
#[tokio::main]
async fn main() {
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

    let mut hup = signal(SignalKind::hangup()).expect("SIGHUP 핸들러 설치 실패");
    
    loop {
        tokio::select! {
            result = listener.accept() => {
                if let Ok((stream, _)) = result {
                    let client_clone = redis_client.clone();
                    tokio::spawn(handle_connection(stream, client_clone));
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

// --- 개별 클라이언트 연결 처리 함수 ---
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = match stream.peer_addr() {
        Ok(addr) => addr,
        Err(e) => { eprintln!("🔴 stream.peer_addr() 실패: {:?}", e); return; }
    };
    
    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => { eprintln!("🔴 Redis 연결 실패 ({}): {:?}", addr, e); return; }
    };

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            // ✨✨✨ 핵심 변경점: 로그 레벨 조정 ✨✨✨
            if let tokio_tungstenite::tungstenite::Error::Protocol(
                tokio_tungstenite::tungstenite::error::ProtocolError::MissingConnectionUpgradeHeader
            ) = e {
                println!("ℹ️  ALB 상태 검사 요청 수신 (정상 동작)");
            } else {
                eprintln!("� 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e);
            }
            return;
        }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30));

    let mut consecutive_closed_eyes = 0;
    const EAR_THRESHOLD: f64 = 0.2;
    const CONSECUTIVE_FRAMES_TRIGGER: i32 = 2;

    loop {
        tokio::select! {
            msg_result = read.next() => {
                let msg = match msg_result { Some(Ok(m)) => m, _ => break };

                match msg {
                    Message::Text(text) => {
                        if redis_conn.publish::<_, _, i64>("attention-events", &text).await.is_err() {
                            eprintln!("🔴 Redis 발행 실패");
                        }
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            if client_msg.event_type == "data" {
                                if let Ok(data_payload) = serde_json::from_value::<DataPayload>(client_msg.payload) {
                                    if data_payload.ear_left < EAR_THRESHOLD && data_payload.ear_right < EAR_THRESHOLD {
                                        consecutive_closed_eyes += 1;
                                    } else {
                                        consecutive_closed_eyes = 0;
                                    }
                                    if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                        let alarm_msg = "Drowsiness Detected!";
                                        if write.send(Message::Text(alarm_msg.to_string())).await.is_err() { break; }
                                        consecutive_closed_eyes = 0;
                                    }
                                }
                            }
                        }
                    },
                    Message::Close(_) => break,
                    _ => { /* 다른 메시지 타입은 무시 */ }
                }
            },
            _ = ping_interval.tick() => {
                if write.send(Message::Ping(vec![])).await.is_err() { break; }
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}