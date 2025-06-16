// ✨ 1. JSON 처리를 위한 serde 모듈을 추가로 use 합니다.
use serde::Deserialize;
use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};
use std::time::Duration;
use tokio::time::interval;

// ✨ 2. 클라이언트가 보내는 데이터 구조에 맞춰 Rust 구조체를 정의합니다.
// #[derive(Deserialize)]는 JSON을 이 구조체로 자동 변환해
#[derive(Deserialize, Debug)]
struct EarData {
    timestamp: String,
    ear_left: f64,
    ear_right: f64,
}

#[derive(Deserialize, Debug)]
struct ClientMessage {
    sessionId: String,
    eventType: String,
    payload: Option<EarData>, // payload는 data 이벤트에만 존재하므로 Option 타입으로 감쌉니다.
}


#[tokio::main]
async fn main() {
    // main 함수는 변경 없습니다.
    // ... (이전 코드와 동일) ...
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);
    let redis_client = redis::Client::open(redis_url).expect("Invalid Redis URL");
    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(&addr).await.expect("Binding failed");
    println!("🚀 WebSocket 서버가 다음 주소에서 실행을 시작합니다.");
    let mut hup = signal(SignalKind::hangup()).expect("Failed to install SIGHUP handler");
    loop {
        tokio::select! {
            result = listener.accept() => { /* ... */ },
            _ = signal::ctrl_c() => { /* ... */ break; },
            _ = hup.recv() => { /* ... */ }
        }
    }
}


// ✨ 3. handle_connection 함수에 분석 및 알람 로직을 추가합니다.
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("addr");
    let mut redis_conn = redis_client.get_async_connection().await.expect("redis conn");
    let ws_stream = accept_async(stream).await.expect("handshake");
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30));

    // ✨ 4. 각 클라이언트의 상태를 저장할 변수를 선언
    let mut consecutive_closed_eyes = 0; // 연속으로 눈 감은 횟수
    const EAR_THRESHOLD: f64 = 0.2;      // 눈 감음 판단 임계값
    const CONSECUTIVE_FRAMES_TRIGGER: i32 = 2; // 알람을 보낼 연속 횟수 (약 2초)

    loop {
        tokio::select! {
            // 클라이언트로부터 메시지 수신
            msg = read.next() => {
                let msg = match msg {
                    Some(Ok(m)) => m,
                    _ => {
                        println!("ℹ️ '{}'와의 스트림이 비정상적으로 종료되었습니다.", addr);
                        break;
                    }
                };

                if let Message::Text(text) = msg {
                    // 받은 JSON 문자열을 우리가 정의한 구조체로 파싱
                    let parsed: Result<ClientMessage, _> = serde_json::from_str(&text);

                    match parsed {
                        Ok(client_msg) => {
                            // data 이벤트일 경우에만 분석 로직 실행
                            if client_msg.eventType == "data" {
                                if let Some(payload) = client_msg.payload {
                                    println!("<- [data] EAR: L={:.3}, R={:.3}", payload.ear_left, payload.ear_right);
                                    
                                    // ✨ 5. 집중도 분석 및 알람 로직
                                    if payload.ear_left < EAR_THRESHOLD && payload.ear_right < EAR_THRESHOLD {
                                        consecutive_closed_eyes += 1;
                                        println!("🟡 눈 감음 감지... (연속 {}회)", consecutive_closed_eyes);
                                    } else {
                                        // 눈을 뜨면 카운터 초기화
                                        consecutive_closed_eyes = 0;
                                    }

                                    // 정해진 횟수 이상 눈을 감으면 알람 전송
                                    if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                        let alarm_msg = "Drowsiness detected! Please take a break.";
                                        println!("🚨 알람 전송! -> {}", addr);
                                        if write.send(Message::Text(alarm_msg.to_string())).await.is_err() {
                                            break; // 에러 시 루프 종료
                                        }
                                        // 알람을 보낸 후에는 카운터를 다시 초기화합니다.
                                        consecutive_closed_eyes = 0;
                                    }
                                }
                            }
                            // 받은 모든 메시지는 Redis에 발행
                            let _ : () = redis_conn.publish("attention-data", &text).await.unwrap_or_default();
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
                if write.send(Message::Ping(vec![])).await.is_err() {
                    break;
                }
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}

