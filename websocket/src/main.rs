use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};
use std::time::{Duration, Instant};
use tokio::time::interval;
use chrono::Utc;

// --- 데이터 구조체 정의 ---
#[derive(Deserialize, Debug, Clone, Copy)]
struct Landmark { index: u32, x: f64, y: f64, z: f64 }

#[derive(Deserialize, Debug)]
struct DataPayload { landmarks: Vec<Landmark> }

#[derive(Deserialize, Debug)]
struct StatusPayload { status: String }

// ✨ ClientMessage 구조체에 Clone 기능을 추가합니다.
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

// --- 헬퍼 함수들 (변경 없음) ---
fn get_distance(p1: &Landmark, p2: &Landmark) -> f64 { ((p1.x - p2.x).powi(2) + (p1.y - p2.y).powi(2)).sqrt() }
fn get_ear(eye_landmarks: &[Landmark]) -> f64 { let ver_dist1 = get_distance(&eye_landmarks[1], &eye_landmarks[5]); let ver_dist2 = get_distance(&eye_landmarks[2], &eye_landmarks[4]); let hor_dist = get_distance(&eye_landmarks[0], &eye_landmarks[3]); if hor_dist == 0.0 { return 0.0; } (ver_dist1 + ver_dist2) / (2.0 * hor_dist) }
fn get_mar(mouth_landmarks: &[Landmark]) -> f64 { let ver_dist1 = get_distance(&mouth_landmarks[2], &mouth_landmarks[5]); let ver_dist2 = get_distance(&mouth_landmarks[3], &mouth_landmarks[6]); let ver_dist3 = get_distance(&mouth_landmarks[4], &mouth_landmarks[7]); let hor_dist = get_distance(&mouth_landmarks[0], &mouth_landmarks[1]); if hor_dist == 0.0 { return 0.0; } (ver_dist1 + ver_dist2 + ver_dist3) / (3.0 * hor_dist) }
fn get_head_yaw(landmarks_map: &HashMap<u32, Landmark>) -> f64 { if let (Some(&nose), Some(&left_cheek), Some(&right_cheek)) = (landmarks_map.get(&1), landmarks_map.get(&234), landmarks_map.get(&454)) { let dist_left = (nose.x - left_cheek.x).abs(); let dist_right = (right_cheek.x - nose.x).abs(); if (dist_left + dist_right) == 0.0 { return 0.0; } (dist_right - dist_left) / (dist_left + dist_right) } else { 0.0 } }

// --- main 함수 (변경 없음) ---
#[tokio::main]
async fn main() {
    let redis_host = env::var("REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let redis_port = env::var("REDIS_PORT").unwrap_or_else(|_| "6379".to_string());
    let redis_url = format!("redis://{}:{}", redis_host, redis_port);
    let redis_client = match redis::Client::open(redis_url) { Ok(client) => client, Err(e) => { eprintln!("🔴 Redis client creation failed: {:?}", e); return; } };
    let addr = "0.0.0.0:9001";
    let listener = match TcpListener::bind(&addr).await { Ok(listener) => listener, Err(e) => { eprintln!("🔴 TCP listener bind failed: {:?}", e); return; } };
    println!("🚀 WebSocket server starting...");
    let mut hup = signal(SignalKind::hangup()).expect("Failed to install SIGHUP handler");
    loop {
        tokio::select! {
            result = listener.accept() => { if let Ok((stream, _)) = result { let client_clone = redis_client.clone(); tokio::spawn(handle_connection(stream, client_clone)); } },
            _ = signal::ctrl_c() => { println!("\nℹ️ Ctrl+C received, shutting down."); break; },
            _ = hup.recv() => { println!("🟡 SIGHUP received, ignoring."); }
        }
    }
}

// 클라이언트의 집중도 상태를 추적하기 위한 enum
#[derive(PartialEq, Debug, Clone, Copy)]
enum AttentionState { Focused, Drowsy, Distracted, UserLeft }

// --- 개별 클라이언트 연결 처리 함수 ---
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    let addr = match stream.peer_addr() { Ok(addr) => addr, Err(_) => return };
    let mut redis_conn = match redis_client.get_async_connection().await { Ok(conn) => conn, Err(_) => return };
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(_) => { return; }
    };
    println!("🚀 WebSocket connection established: {}", addr);

    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30));
    let mut current_state = AttentionState::Focused;
    let mut state_changed_at = Instant::now();
    const EAR_THRESHOLD: f64 = 0.21;
    const MAR_THRESHOLD: f64 = 0.45;
    const YAW_THRESHOLD: f64 = 0.3;
    const CONSECUTIVE_FRAMES_TRIGGER: u64 = 3;

    loop {
        tokio::select! {
            msg_result = read.next() => {
                let msg = match msg_result { Some(Ok(m)) => m, _ => break };

                if let Message::Text(text) = msg {
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        
                        let mut new_state = current_state;
                        
                        match client_msg.event_type.as_str() {
                            "data" => {
                                if let Ok(data_payload) = serde_json::from_value::<DataPayload>(client_msg.payload.clone()) {
                                    let landmarks_map: HashMap<u32, Landmark> = 
                                        data_payload.landmarks.iter().map(|&lm| (lm.index, lm)).collect();
                                    
                                    let ear_left = get_ear(&get_landmarks_by_indices(&landmarks_map, &[362, 385, 387, 263, 373, 380]));
                                    let ear_right = get_ear(&get_landmarks_by_indices(&landmarks_map, &[33, 160, 158, 133, 153, 144]));
                                    let mar = get_mar(&get_landmarks_by_indices(&landmarks_map, &[61, 291, 13, 81, 178, 14, 311, 402]));
                                    let head_yaw = get_head_yaw(&landmarks_map);
                                    
                                    new_state = if ear_left < EAR_THRESHOLD && ear_right < EAR_THRESHOLD {
                                        AttentionState::Drowsy
                                    } else if head_yaw.abs() > YAW_THRESHOLD {
                                        AttentionState::Distracted
                                    } else {
                                        AttentionState::Focused
                                    };
                                    
                                    if mar > MAR_THRESHOLD {
                                        create_and_publish_event(&mut redis_conn, &client_msg, "YAWN_DETECTED", json!({})).await;
                                    }
                                }
                            },
                            "status_update" => { new_state = AttentionState::UserLeft; },
                            // ✨ payload를 .clone()하여 소유권을 넘기지 않고 복사본을 전달합니다.
                            "start" => { create_and_publish_event(&mut redis_conn, &client_msg, "SESSION_START", client_msg.payload.clone()).await; continue; },
                            "end" => { create_and_publish_event(&mut redis_conn, &client_msg, "SESSION_END", client_msg.payload.clone()).await; break; },
                            _ => {}
                        }

                        if new_state != current_state {
                            let duration_ms = state_changed_at.elapsed().as_millis();
                            let event_type = match new_state {
                                AttentionState::Focused => "FOCUS_RESTORED",
                                AttentionState::Drowsy => "DROWSINESS_STARTED",
                                AttentionState::Distracted => "DISTRACTION_STARTED",
                                AttentionState::UserLeft => "USER_LEFT",
                            };
                            create_and_publish_event(&mut redis_conn, &client_msg, event_type, json!({ "previousStateDurationMs": duration_ms })).await;
                            
                            current_state = new_state;
                            state_changed_at = Instant::now();

                            let alarm_msg = match new_state {
                                AttentionState::Drowsy => "Drowsiness Detected!",
                                AttentionState::Distracted => "Distracted! Please focus.",
                                AttentionState::UserLeft => "Are you there? Face not detected.",
                                _ => ""
                            };
                            if !alarm_msg.is_empty() { send_alarm(&mut write, alarm_msg).await; }
                        }
                    }
                }
            },
            _ = ping_interval.tick() => {
                if write.send(Message::Ping(vec![])).await.is_err() { break; }
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}

// 헬퍼 함수들
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
        if redis_conn.publish::<_, _, i64>("attention-meaningful-events", &event_json).await.is_err() {
            eprintln!("🔴 Redis 발행 실패");
        }
    }
}

fn get_landmarks_by_indices(map: &HashMap<u32, Landmark>, indices: &[u32]) -> Vec<Landmark> {
    indices.iter().filter_map(|&i| map.get(&i).copied()).collect()
}

async fn send_alarm(write_half: &mut (impl SinkExt<Message, Error = tokio_tungstenite::tungstenite::Error> + Unpin), message: &str) {
    println!("🚨 알람 전송! -> {}", message);
    let _ = write_half.send(Message::Text(message.to_string())).await;
}
