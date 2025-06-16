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

// 데이터 구조체 정의 (변경 없음)
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

// main 함수 (변경 없음)
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
            _ = signal::ctrl_c() => { break; },
            _ = hup.recv() => { }
        }
    }
}

// ✨ handle_connection 함수의 .expect()를 모두 match로 교체하여 안정성 확보
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = match stream.peer_addr() {
        Ok(addr) => addr,
        Err(e) => {
            eprintln!("🔴 stream.peer_addr() 실패: {:?}", e);
            return;
        }
    };
    
    let mut redis_conn = match redis_client.get_async_connection().await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("🔴 Redis 연결 실패 ({}): {:?}", addr, e);
            return; // 현재 클라이언트 처리만 실패하고 종료, 서버 전체는 죽지 않음
        }
    };

    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("🔴 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e);
            return; // 현재 클라이언트 처리만 실패하고 종료
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
                if let Message::Text(text) = msg {
                    if redis_conn.publish::<_, _, i64>("attention-events", &text).await.is_err() {
                        eprintln!("🔴 Redis 발행 실패");
                    }
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        if client_msg.event_type == "data" {
                            if let Ok(payload) = serde_json::from_value::<DataPayload>(client_msg.payload) {
                                if payload.ear_left < EAR_THRESHOLD && payload.ear_right < EAR_THRESHOLD {
                                    consecutive_closed_eyes += 1;
                                } else {
                                    consecutive_closed_eyes = 0;
                                }
                                if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                    if write.send(Message::Text("Drowsiness Detected!".to_string())).await.is_err() { break; }
                                    consecutive_closed_eyes = 0;
                                }
                            }
                        }
                    }
                } else if msg.is_close() { break; }
            },
            _ = ping_interval.tick() => {
                if write.send(Message::Ping(vec![])).await.is_err() { break; }
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
