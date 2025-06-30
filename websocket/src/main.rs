// --- 외부 라이브러리(Crate) 가져오기 ---
// 이 섹션에서는 프로젝트에 필요한 모든 외부 라이브러리들을 선언합니다.
use serde::{Deserialize, Serialize}; // JSON 데이터를 Rust 구조체로 자동 변환하거나, 그 반대의 작업을 수행합니다.
use serde_json::{json, Value}; // JSON 데이터를 좀 더 유연하게 다루기 위한 기능들을 제공합니다.
use std::collections::HashMap; // 랜드마크 인덱스를 키(Key)로, 랜드마크 데이터를 값(Value)으로 저장하기 위한 해시맵 자료구조입니다.
use std::env; // REDIS_HOST와 같은 시스템 환경 변수를 읽어오기 위해 사용합니다.
use tokio::net::{TcpListener, TcpStream}; // 비동기(Non-blocking) 방식으로 네트워크 연결을 처리하기 위한 Tokio 라이브러리입니다.
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message}; // 비동기 웹소켓 프로토콜 통신을 구현하기 위한 라이브러리입니다.
use futures_util::{StreamExt, SinkExt}; // 웹소켓과 같은 비동기 데이터 스트림을 더 편리하게 다루기 위한 유틸리티입니다.
use redis::AsyncCommands; // Redis에 비동기적으로 명령(publish, set, get 등)을 보내기 위해 사용합니다.
use tokio::signal; // Ctrl+C와 같은 시스템 종료 신호를 감지하여 서버를 안전하게 종료시키기 위해 사용합니다.
use tokio::signal::unix::{signal, SignalKind}; // 유닉스 계열 시스템의 특정 신호(SIGHUP 등)를 처리하기 위한 모듈입니다.
use std::time::{Duration, Instant}; // 상태 변화 시간 측정 등 시간 관련 처리를 위해 사용합니다.
use tokio::time::interval; // 주기적으로 Ping 메시지를 보내는 등 정해진 간격으로 작업을 수행하기 위해 사용합니다.
use chrono::Utc; // 이벤트 발생 시각을 UTC 국제 표준시로 기록하기 위해 사용합니다.

// --- 데이터 구조체 정의 ---
// 이 섹션에서는 클라이언트와 서버가 주고받는 JSON 데이터의 형식을 Rust 구조체로 정의합니다.

// 클라이언트가 보내는 랜드마크 하나의 데이터 구조입니다.
#[derive(Deserialize, Debug, Clone, Copy)]
struct Landmark { index: u32, x: f64, y: f64, z: f64 }

// 랜드마크 목록 전체를 담는 데이터 구조입니다.
#[derive(Deserialize, Debug)]
struct DataPayload { landmarks: Vec<Landmark> }

// 클라이언트의 특정 상태(얼굴 미감지, 일시정지 등)를 전달하기 위한 구조체입니다.
#[derive(Deserialize, Debug)]
struct StatusPayload { status: String }

// 클라이언트로부터 받는 모든 메시지의 기본 형식입니다. `serde(rename = ...)`는 JSON의 키 이름과 Rust 변수 이름을 매핑합니다.
#[derive(Deserialize, Debug, Clone)]
struct ClientMessage {
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "userId")]
    user_id: String,
    #[serde(rename = "eventType")]
    event_type: String,
    payload: Value,
}

// 서버가 Redis에 발행(Publish)하는 이벤트의 표준 형식입니다.
#[derive(Serialize, Debug)]
struct ServerEvent<'a> {
    #[serde(rename = "sessionId")]
    session_id: &'a str,
    #[serde(rename = "userId")]
    user_id: &'a str,
    timestamp: String,
    #[serde(rename = "eventType")]
    event_type: &'a str,
    payload: Value,
}


// --- 특징 계산 헬퍼(도우미) 함수들 ---
// 이 섹션의 함수들은 순수하게 계산만 담당하는 보조 함수들입니다.

// 두 랜드마크 사이의 2D 거리를 유클리드 공식으로 계산합니다.
fn get_distance(p1: &Landmark, p2: &Landmark) -> f64 { ((p1.x - p2.x).powi(2) + (p1.y - p2.y).powi(2)).sqrt() }
// 눈의 랜드마크 6개를 받아 눈의 개방 비율(EAR)을 계산하여 졸음을 판단합니다.
fn get_ear(eye_landmarks: &[Landmark]) -> f64 { let ver_dist1 = get_distance(&eye_landmarks[1], &eye_landmarks[5]); let ver_dist2 = get_distance(&eye_landmarks[2], &eye_landmarks[4]); let hor_dist = get_distance(&eye_landmarks[0], &eye_landmarks[3]); if hor_dist == 0.0 { return 0.0; } (ver_dist1 + ver_dist2) / (2.0 * hor_dist) }
// 입의 랜드마크 8개를 받아 입의 개방 비율(MAR)을 계산하여 하품을 판단합니다.
fn get_mar(mouth_landmarks: &[Landmark]) -> f64 { let ver_dist1 = get_distance(&mouth_landmarks[2], &mouth_landmarks[5]); let ver_dist2 = get_distance(&mouth_landmarks[3], &mouth_landmarks[6]); let ver_dist3 = get_distance(&mouth_landmarks[4], &mouth_landmarks[7]); let hor_dist = get_distance(&mouth_landmarks[0], &mouth_landmarks[1]); if hor_dist == 0.0 { return 0.0; } (ver_dist1 + ver_dist2 + ver_dist3) / (3.0 * hor_dist) }
// 코와 양 볼의 랜드마크를 이용해 고개의 좌우 회전(Yaw) 정도를 추정하여 주의 분산을 판단합니다.
fn get_head_yaw(landmarks_map: &HashMap<u32, Landmark>) -> f64 { if let (Some(&nose), Some(&left_cheek), Some(&right_cheek)) = (landmarks_map.get(&1), landmarks_map.get(&234), landmarks_map.get(&454)) { let dist_left = (nose.x - left_cheek.x).abs(); let dist_right = (right_cheek.x - nose.x).abs(); if (dist_left + dist_right) == 0.0 { return 0.0; } (dist_right - dist_left) / (dist_left + dist_right) } else { 0.0 } }


// --- 프로그램의 시작점, main 함수 ---
#[tokio::main] // Tokio 비동기 런타임을 활성화하는 매크로입니다.
async fn main() {
    // 1. 환경 변수에서 Redis 접속 정보를 읽어옵니다. (없으면 기본값 "127.0.0.1", "6379" 사용)
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);
    let redis_client = match redis::Client::open(redis_url) { Ok(client) => client, Err(e) => { eprintln!("🔴 Redis client creation failed: {:?}", e); return; } };

    // 2. 웹소켓 서버가 사용할 주소(0.0.0.0: 모든 네트워크 인터페이스)와 포트(9001)를 설정하고, TCP 리스너를 바인딩합니다.
    let addr = "0.0.0.0:9001";
    let listener = match TcpListener::bind(&addr).await { Ok(listener) => listener, Err(e) => { eprintln!("🔴 TCP listener bind failed: {:?}", e); return; } };
    println!("🚀 WebSocket server starting...");

    // 3. 시스템 종료 신호(Ctrl+C)와 재시작 신호(SIGHUP)를 처리할 핸들러를 설정합니다.
    let mut hup = signal(SignalKind::hangup()).expect("Failed to install SIGHUP handler");

    // 4. 메인 루프: 새로운 클라이언트 접속 및 시스템 신호를 비동기적으로 동시에 기다립니다.
    loop {
        tokio::select! {
            // 새 클라이언트가 접속하면...
            result = listener.accept() => {
                if let Ok((stream, _)) = result {
                    // Redis 클라이언트를 복제하여 새 클라이언트 처리 작업에 넘겨줍니다. (소유권 문제 방지)
                    let client_clone = redis_client.clone();
                    // 각 클라이언트를 독립적인 비동기 작업(일종의 경량 스레드)으로 생성하여 동시에 처리합니다. (Rust 동시성의 핵심)
                    tokio::spawn(handle_connection(stream, client_clone));
                }
            },
            // Ctrl+C 신호를 받으면...
            _ = signal::ctrl_c() => {
                println!("\nℹ️ Ctrl+C received, shutting down.");
                break; // 루프를 종료하여 프로그램을 안전하게 끝냅니다.
            },
            // SIGHUP 신호를 받으면... (보통 설정 리로드 등에 쓰이지만 여기선 무시)
            _ = hup.recv() => {
                println!("🟡 SIGHUP received, ignoring.");
            }
        }
    }
}

// 클라이언트의 집중도 상태를 명확하게 관리하기 위한 '상태 머신(State Machine)'입니다.
#[derive(PartialEq, Debug, Clone, Copy)]
enum AttentionState {
    Focused,      // 집중 상태
    Drowsy,       // 졸음 상태
    Distracted,   // 주의 분산 상태
    UserLeft,     // 자리 비움 상태
    Paused,       // 사용자가 직접 일시정지한 상태
}

// --- 개별 클라이언트 연결을 처리하는 핵심 함수 ---
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    // 1. 초기 설정: 클라이언트 주소 확인, Redis 연결, 웹소켓 핸드셰이크(HTTP 연결을 웹소켓 연결로 업그레이드)를 수행합니다.
    let addr = match stream.peer_addr() { Ok(addr) => addr, Err(_) => return };
    let mut redis_conn = match redis_client.get_async_connection().await { Ok(conn) => conn, Err(_) => return };
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            // AWS 로드밸런서가 주기적으로 보내는 헬스 체크 요청은 정상 처리하고, 실제 에러만 로그에 남깁니다.
            if let tokio_tungstenite::tungstenite::Error::Protocol(tokio_tungstenite::tungstenite::error::ProtocolError::MissingConnectionUpgradeHeader) = e {
                println!("ℹ️  ALB Health Check received (normal behavior)");
            } else {
                eprintln!("🔴 WebSocket handshake error ({}): {:?}", addr, e);
            }
            return;
        }
    };
    println!("🚀 WebSocket connection established: {}", addr);

    // 2. 웹소켓 스트림을 '쓰기 전용(write)'과 '읽기 전용(read)'으로 분리하고, 각종 상태 변수들을 초기화합니다.
    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30)); // 30초마다 연결 유지를 위한 Ping 메시지를 보내도록 타이머 설정

    let mut current_state = AttentionState::Focused; // 현재 집중도 상태의 초기값은 '집중'으로 설정합니다.
    let mut state_changed_at = Instant::now(); // 상태가 마지막으로 변경된 시각을 기록합니다.
    let mut yawn_count: u32 = 0; // 하품 횟수를 세기 위한 카운터입니다.

    // 3. 분석에 사용할 각종 임계값(Threshold)을 상수로 정의합니다.
    const EAR_THRESHOLD: f64 = 0.21;     // 이 값보다 EAR이 작으면 '졸음'으로 판단합니다.
    const MAR_THRESHOLD: f64 = 0.6;      // 이 값보다 MAR이 크면 '하품'으로 판단합니다.
    const YAW_THRESHOLD: f64 = 0.3;      // 이 값보다 고개 회전이 크면 '주의 분산'으로 판단합니다.

    // 4. 클라이언트와의 모든 상호작용을 처리하는 메인 이벤트 루프입니다.
    loop {
        tokio::select! {
            // 클라이언트로부터 메시지가 오기를 비동기적으로 기다립니다.
            msg_result = read.next() => {
                let msg = match msg_result { Some(Ok(m)) => m, _ => break }; // 메시지가 없거나 에러가 발생하면 연결을 종료합니다.

                // 텍스트 형식의 메시지만 처리합니다.
                if let Message::Text(text) = msg {
                    // 받은 텍스트(JSON)를 ClientMessage 구조체로 안전하게 파싱합니다.
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {

                        // 만약 '일시정지' 상태에서 'data' 이벤트가 오면, 분석은 건너뛰고 데이터만 Redis에 기록합니다.
                        if current_state == AttentionState::Paused && client_msg.event_type == "data" {
                            let _ = redis_conn.publish::<_, _, i64>("attention-events", &text).await;
                            continue; // 다음 루프로 넘어갑니다.
                        }

                        let mut new_state = current_state;

                        // 이벤트 타입에 따라 다른 로직을 수행합니다.
                        match client_msg.event_type.as_str() {
                            "data" => { // 핵심: 집중도 분석 로직
                                // payload의 랜드마크 데이터를 파싱합니다.
                                if let Ok(data_payload) = serde_json::from_value::<DataPayload>(client_msg.payload.clone()) {
                                    // 랜드마크 데이터를 인덱스로 빠르게 찾기 위해 해시맵으로 변환합니다.
                                    let landmarks_map: HashMap<u32, Landmark> =
                                        data_payload.landmarks.iter().map(|&lm| (lm.index, lm)).collect();

                                    // EAR, MAR, Head Yaw 등 주요 특징 값을 계산합니다.
                                    let ear_left = get_ear(&get_landmarks_by_indices(&landmarks_map, &[362, 385, 387, 263, 373, 380]));
                                    let ear_right = get_ear(&get_landmarks_by_indices(&landmarks_map, &[33, 160, 158, 133, 153, 144]));
                                    let mar = get_mar(&get_landmarks_by_indices(&landmarks_map, &[61, 291, 13, 81, 178, 14, 311, 402]));
                                    let head_yaw = get_head_yaw(&landmarks_map);

                                    // 계산된 값을 바탕으로 사용자의 새로운 상태를 결정합니다.
                                    new_state = if ear_left < EAR_THRESHOLD && ear_right < EAR_THRESHOLD {
                                        AttentionState::Drowsy
                                    } else if head_yaw.abs() > YAW_THRESHOLD {
                                        AttentionState::Distracted
                                    } else {
                                        AttentionState::Focused
                                    };

                                    // 하품을 감지하면 Redis에 이벤트를 발행하고, 5회마다 클라이언트에게 알람을 보냅니다.
                                    if mar > MAR_THRESHOLD {
                                        create_and_publish_event(&mut redis_conn, &client_msg, "YAWN_DETECTED", json!({})).await;
                                        yawn_count += 1;
                                        if yawn_count > 0 && yawn_count % 5 == 0 {
                                            let yawn_alarm = format!("하품 {}회 감지! 스트레칭 한번 어떠세요? 🤸", yawn_count);
                                            send_alarm(&mut write, &yawn_alarm).await;
                                        }
                                    }
                                }
                            },
                            "status_update" => { // 얼굴 미감지, 일시정지 등 클라이언트의 상태 변경을 처리합니다.
                                if let Ok(status_payload) = serde_json::from_value::<StatusPayload>(client_msg.payload.clone()) {
                                    match status_payload.status.as_str() {
                                        "no_face_detected" => new_state = AttentionState::UserLeft,
                                        "paused" => new_state = AttentionState::Paused,
                                        "resumed" => new_state = AttentionState::Focused,
                                        _ => {} // 그 외의 상태는 무시합니다.
                                    }
                                }
                            },
                            "start" => { create_and_publish_event(&mut redis_conn, &client_msg, "SESSION_START", client_msg.payload.clone()).await; continue; },
                            "end" => { create_and_publish_event(&mut redis_conn, &client_msg, "SESSION_END", client_msg.payload.clone()).await; break; },
                            _ => {} // 정의되지 않은 이벤트 타입은 무시합니다.
                        }

                        // 상태가 실제로 변경되었는지 확인하여, 불필요한 이벤트 발행을 막습니다.
                        if new_state != current_state {
                            let duration_ms = state_changed_at.elapsed().as_millis(); // 이전 상태가 지속된 시간을 계산합니다.

                            // 이전 상태와 새 상태를 기반으로 "DROWSINESS_STARTED" 등 의미 있는 이벤트 타입을 결정합니다.
                            let event_type = match (current_state, new_state) {
                                (AttentionState::Paused, AttentionState::Focused) => "SESSION_RESUMED",
                                (_, AttentionState::Focused) => "FOCUS_RESTORED",
                                (_, AttentionState::Paused) => "SESSION_PAUSED",
                                (_, AttentionState::Drowsy) => "DROWSINESS_STARTED",
                                (_, AttentionState::Distracted) => "DISTRACTION_STARTED",
                                (_, AttentionState::UserLeft) => "USER_LEFT",
                            };

                            // 결정된 상태 변경 이벤트를 생성하여 Redis에 발행합니다.
                            create_and_publish_event(&mut redis_conn, &client_msg, event_type, json!({ "previousStateDurationMs": duration_ms })).await;

                            // 현재 상태를 새로운 상태로 업데이트하고, 상태 변경 시각을 지금으로 재설정합니다.
                            current_state = new_state;
                            state_changed_at = Instant::now();

                            // 새로운 상태에 맞는 알람 메시지를 생성하여 클라이언트에게 실시간으로 전송합니다.
                            let alarm_msg = match new_state {
                                AttentionState::Drowsy => "졸음이 감지되었습니다! 잠시 쉬어가는 건 어떨까요? ☕",
                                AttentionState::Distracted => "주의가 분산되었습니다! 다시 집중해볼까요? 💪",
                                AttentionState::UserLeft => "사용자가 자리를 비웠나요? 얼굴이 감지되지 않습니다. 🤔",
                                _ => "" // 알람을 보낼 필요 없는 상태
                            };
                            if !alarm_msg.is_empty() { send_alarm(&mut write, alarm_msg).await; }
                        }
                    }
                }
            },
            // 30초마다 Ping 메시지를 보내 연결이 끊겼는지 확인하고, 연결 유지를 돕습니다.
            _ = ping_interval.tick() => {
                if write.send(Message::Ping(vec![])).await.is_err() { break; } // Ping 전송 실패 시 연결 끊김으로 간주하고 루프 종료
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}


// --- 나머지 헬퍼(도우미) 함수들 ---
// 이 섹션의 함수들은 반복되는 작업을 재사용하기 위해 만들어진 함수들입니다.

// 표준화된 형식의 서버 이벤트를 생성하고 Redis의 특정 채널에 발행(Publish)하는 함수입니다.
async fn create_and_publish_event(
    redis_conn: &mut redis::aio::Connection,
    original_msg: &ClientMessage,
    event_type: &str,
    payload: Value,
) {
    let event = ServerEvent {
        session_id: &original_msg.session_id,
        user_id: &original_msg.user_id,
        timestamp: Utc::now().to_rfc3339(),
        event_type,
        payload,
    };
    if let Ok(event_json) = serde_json::to_string(&event) {
        println!("-> [발행] eventType: '{}'", event.event_type);
        // "attention-meaningful-events" 채널로 이벤트 발행
        if redis_conn.publish::<_, _, i64>("attention-meaningful-events", &event_json).await.is_err() {
            eprintln!("🔴 Redis 발행 실패");
        }
    }
}

// 전체 랜드마크 해시맵에서, 필요한 인덱스의 랜드마크들만 효율적으로 뽑아서 벡터로 반환하는 함수입니다.
fn get_landmarks_by_indices(map: &HashMap<u32, Landmark>, indices: &[u32]) -> Vec<Landmark> {
    indices.iter().filter_map(|&i| map.get(&i).copied()).collect()
}

// 클라이언트에게 웹소켓을 통해 알람 메시지를 전송하는 함수입니다.
async fn send_alarm(write_half: &mut (impl SinkExt<Message, Error = tokio_tungstenite::tungstenite::Error> + Unpin), message: &str) {
    println!("🚨 알람 전송! -> {}", message);
    let _ = write_half.send(Message::Text(message.to_string())).await;
}
