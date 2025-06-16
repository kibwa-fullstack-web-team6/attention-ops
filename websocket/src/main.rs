use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use redis::AsyncCommands;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};
use std::time::Duration;
use tokio::time::interval;

// --- 1. 데이터 구조체 정의 (새로운 payload 형식에 맞춤) ---

#[derive(Deserialize, Debug, Clone, Copy)]
struct Landmark {
    index: u32,
    x: f64,
    y: f64,
    z: f64,
}

#[derive(Deserialize, Debug)]
struct DataPayload {
    landmarks: Vec<Landmark>,
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

// --- 2. 특징 계산을 위한 헬퍼 함수들 (Rust 버전) ---

fn get_distance(p1: &Landmark, p2: &Landmark) -> f64 {
    ((p1.x - p2.x).powi(2) + (p1.y - p2.y).powi(2)).sqrt()
}

fn get_ear(eye_landmarks: &[Landmark]) -> f64 {
    let ver_dist1 = get_distance(&eye_landmarks[1], &eye_landmarks[5]);
    let ver_dist2 = get_distance(&eye_landmarks[2], &eye_landmarks[4]);
    let hor_dist = get_distance(&eye_landmarks[0], &eye_landmarks[3]);
    (ver_dist1 + ver_dist2) / (2.0 * hor_dist)
}

// --- main 함수 (변경 없음) ---
#[tokio::main]
async fn main() { /* ... 이전과 동일 ... */ }

// --- 3. 개별 클라이언트 연결 처리 함수 (핵심 로직 수정) ---
async fn handle_connection(stream: TcpStream, redis_client: redis::Client) {
    // ... (상단 연결 코드는 동일) ...
    let (mut write, mut read) = ws_stream.split();
    let mut ping_interval = interval(Duration::from_secs(30));

    // 각 클라이언트의 집중도 상태를 저장할 변수
    let mut consecutive_closed_eyes = 0;
    const EAR_THRESHOLD: f64 = 0.2;
    const CONSECUTIVE_FRAMES_TRIGGER: i32 = 2;

    loop {
        tokio::select! {
            msg_result = read.next() => {
                // ... (메시지 수신 부분) ...
                if let Message::Text(text) = msg {
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(client_msg) => {
                            if client_msg.event_type == "data" {
                                if let Ok(data_payload) = serde_json::from_value::<DataPayload>(client_msg.payload) {
                                    
                                    // 랜드마크를 인덱스로 빠르게 찾기 위해 HashMap으로 변환
                                    let landmarks_map: HashMap<u32, Landmark> = 
                                        data_payload.landmarks.iter().map(|&lm| (lm.index, lm)).collect();

                                    // ✨ EAR 계산
                                    let right_eye_indices = [33, 160, 158, 133, 153, 144];
                                    let left_eye_indices = [362, 385, 387, 263, 373, 380];
                                    
                                    let right_eye_landmarks: Vec<Landmark> = right_eye_indices.iter().map(|&i| landmarks_map[&i]).collect();
                                    let left_eye_landmarks: Vec<Landmark> = left_eye_indices.iter().map(|&i| landmarks_map[&i]).collect();

                                    let ear_right = get_ear(&right_eye_landmarks);
                                    let ear_left = get_ear(&left_eye_landmarks);

                                    println!("<- [data] Server-side EAR: L={:.3}, R={:.3}", ear_left, ear_right);

                                    // ✨ 집중도 분석 및 알람 로직
                                    if ear_left < EAR_THRESHOLD && ear_right < EAR_THRESHOLD {
                                        consecutive_closed_eyes += 1;
                                    } else {
                                        consecutive_closed_eyes = 0;
                                    }

                                    if consecutive_closed_eyes >= CONSECUTIVE_FRAMES_TRIGGER {
                                        let alarm_msg = "Drowsiness Detected on Server!";
                                        println!("🚨 서버 기반 알람 전송! -> {}", addr);
                                        if write.send(Message::Text(alarm_msg.to_string())).await.is_err() { break; }
                                        consecutive_closed_eyes = 0;
                                    }

                                    // ✨ 나중에 여기에 head_pose, mar 계산 로직 추가...
                                }
                            }
                            // 받은 원본 메시지를 Redis에 발행
                            let _ = redis_conn.publish::<_, _, i64>("attention-events", &text).await;
                        },
                        Err(e) => { /* ... */ }
                    }
                }
                // ... (이하 로직 동일) ...
            },
            _ = ping_interval.tick() => { /* ... */ }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}
