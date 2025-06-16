use serde::Deserialize;
use serde_json::Value; // 어떤 형태의 payload든 받을 수 있는 만능 타입
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

// 'data' 이벤트의 payload를 위한 구조체
#[derive(Deserialize, Debug)]
struct DataPayload {
    ear_left: f64,
    ear_right: f64,
    // 나중에 여기에 head_yaw, mar 등 추가
}

// 모든 메시지를 받기 위한 최상위 구조체
#[derive(Deserialize, Debug)]
struct ClientMessage {
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "userId")]
    user_id: String,
    timestamp: String,
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Value, // payload를 유연하게 받기 위해 Value 타입 사용
}

// --- main 함수 (변경 없음) ---
#[tokio::main]
async fn main() {
    // ... 이전과 동일한 코드 ...
}

// --- 개별 클라이언트 연결 처리 함수 ---
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("addr");
    let mut redis_conn = redis_client.get_async_connection().await.expect("redis conn");
    let ws_stream = accept_async(stream).await.expect("handshake");
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30));

    // 각 클라이언트의 집중도 상태를 저장할 변수
    let mut consecutive_closed_eyes = 0;
    const EAR_THRESHOLD: f64 = 0.2;
    const CONSECUTIVE_FRAMES_TRIGGER: i32 = 2; // 약 2초

    loop {
        tokio::select! {
            // 클라이언트로부터 메시지 수신
            msg_result = read.next() => {
                let msg = match msg_result {
                    Some(Ok(m)) => m,
                    _ => { break; }
                };

                if let Message::Text(text) = msg {
                    // 1. 받은 모든 메시지를 Redis의 'attention-events' 채널에 발행
                    if redis_conn.publish::<_, _, i64>("attention-events", &text).await.is_err() {
                        eprintln!("🔴 Redis 발행 실패");
                    }

                    // 2. 메시지를 ClientMessage 구조체로 파싱
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(client_msg) => {
                            println!("<- [수신] eventType: '{}', session: {}", client_msg.event_type, client_msg.session_id);

                            // 3. 'data' 이벤트일 경우에만 분석 로직 실행
                            if client_msg.event_type == "data" {
                                // payload를 우리가 원하는 DataPayload 구조체로 한번 더 파싱
                                if let Ok(data_payload) = serde_json::from_value::<DataPayload>(client_msg.payload) {
                                    
                                    // 집중도 분석 및 알람 로직
                                    if data_payload.ear_left < EAR_THRESHOLD && data_payload.ear_right < EAR_THRESHOLD {
                                        consecutive_closed_eyes += 1;
                                    } else {
                                        consecutive_closed_eyes = 0;
                                    }

                                    if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                        let alarm_msg = "Drowsiness Detected!";
                                        println!("🚨 알람 전송! -> {}", addr);
                                        if write.send(Message::Text(alarm_msg.to_string())).await.is_err() {
                                            break;
                                        }
                                        consecutive_closed_eyes = 0;
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            eprintln!("🔴 JSON 파싱 에러: {:?}, 원본: {}", e, text);
                        }
                    }
                } else if msg.is_close() {
                    break;
                }
            },
            // 30초마다 Ping 보내기
            _ = ping_interval.tick() => {
                if write.send(Message::Ping(vec![])).await.is_err() { break; }
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}