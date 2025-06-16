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

// 클라이언트가 보내는 데이터 구조체 정의
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
    payload: Option<EarData>,
}

#[tokio::main]
async fn main() {
    // Redis 클라이언트 및 TCP 리스너 설정
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
    
    // 메인 루프 실행
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

// 개별 클라이언트 연결 처리 함수
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = stream.peer_addr().expect("addr");
    
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
    let mut ping_interval = interval(Duration::from_secs(30));

    // 각 클라이언트의 상태를 저장할 변수 선언
    let mut consecutive_closed_eyes = 0;
    const EAR_THRESHOLD: f64 = 0.2;
    const CONSECUTIVE_FRAMES_TRIGGER: i32 = 2; // 약 2초

    loop {
        tokio::select! {
            // 클라이언트로부터 메시지 수신
            msg_result = read.next() => {
                let msg = match msg_result {
                    Some(Ok(m)) => m,
                    _ => {
                        println!("ℹ️ '{}'와의 스트림이 비정상적으로 종료되었습니다.", addr);
                        break;
                    }
                };

                match msg {
                    Message::Text(text) => {
                        let parsed: Result<ClientMessage, _> = serde_json::from_str(&text);

                        match parsed {
                            Ok(client_msg) => {
                                // data 이벤트일 경우에만 분석 로직 실행
                                if client_msg.eventType == "data" {
                                    if let Some(payload) = client_msg.payload {
                                        println!("<- [data] EAR: L={:.3}, R={:.3}", payload.ear_left, payload.ear_right);
                                        
                                        // 집중도 분석 및 알람 로직
                                        if payload.ear_left < EAR_THRESHOLD && payload.ear_right < EAR_THRESHOLD {
                                            consecutive_closed_eyes += 1;
                                            println!("🟡 눈 감음 감지... (연속 {}회)", consecutive_closed_eyes);
                                        } else {
                                            consecutive_closed_eyes = 0; // 눈 뜨면 카운터 초기화
                                        }

                                        if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                            let alarm_msg = "Drowsiness Detected! Please take a break.";
                                            println!("🚨 알람 전송! -> {}", addr);
                                            if write.send(Message::Text(alarm_msg.to_string())).await.is_err() {
                                                break;
                                            }
                                            consecutive_closed_eyes = 0; // 알람 보낸 후 카운터 초기화
                                        }
                                    }
                                }
                                // 받은 모든 메시지는 Redis에 발행
                                if redis_conn.publish::<_, _, i64>("attention-data", &text).await.is_err() {
                                    eprintln!("🔴 Redis 발행 실패");
                                }
                            },
                            Err(e) => {
                                eprintln!("🔴 JSON 파싱 에러: {:?}, 원본: {}", e, text);
                            }
                        }
                    },
                    Message::Close(_) => {
                        println!("<- '{}'로부터 연결 종료 메시지 수신", addr);
                        break;
                    },
                    _ => { /* 다른 메시지 타입은 무시 */ }
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
