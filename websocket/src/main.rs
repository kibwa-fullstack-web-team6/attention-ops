use serde::Deserialize;
use std::env;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
// ✨ Redis, 시간 관련 모듈은 잠시 사용하지 않으므로 주석 처리합니다.
// use redis::AsyncCommands;
// use std::time::Duration;
// use tokio::time::interval;
use tokio::signal;
use tokio::signal::unix::{signal, SignalKind};

// 데이터 구조체 정의는 그대로 둡니다.
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
    // ✨ Redis 관련 코드는 잠시 주석 처리합니다.
    // let redis_client = ...

    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(&addr).await.expect("Binding failed");
    println!("🚀 [진단 모드] WebSocket 서버가 다음 주소에서 실행을 시작합니다.");

    let mut hup = signal(SignalKind::hangup()).expect("Failed to install SIGHUP handler");

    loop {
        tokio::select! {
            result = listener.accept() => {
                if let Ok((stream, _)) = result {
                    // ✨ Redis 클라이언트를 전달하지 않습니다.
                    tokio::spawn(handle_connection(stream));
                }
            },
            _ = signal::ctrl_c() => { break; },
            _ = hup.recv() => { /* ... */ }
        }
    }
}

// ✨ 가장 단순화된 handle_connection 함수
async fn handle_connection(stream: TcpStream) {
    let addr = stream.peer_addr().expect("addr");
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("🔴 웹소켓 핸드셰이크 에러 ({}): {:?}", addr, e);
            return;
        }
    };
    println!("🚀 WebSocket 연결 성공: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    while let Some(msg_result) = read.next().await {
        match msg_result {
            Ok(Message::Text(text)) => {
                println!("<-- '{}'로부터 텍스트 수신", addr);

                // ✨ 오직 JSON 파싱만 시도하고 결과를 로그로 남깁니다.
                let parsed: Result<ClientMessage, _> = serde_json::from_str(&text);
                match parsed {
                    Ok(client_msg) => {
                        // 파싱에 성공하면 성공 로그를 남깁니다.
                        println!("✅ JSON 파싱 성공: {:?}", client_msg);
                    },
                    Err(e) => {
                        // 파싱에 실패하면 에러 로그를 남깁니다.
                        eprintln!("🔴 JSON 파싱 에러: {:?}, 원본: {}", e, text);
                    }
                }
                
                // 클라이언트에게 간단한 응답을 보내 연결을 유지합니다.
                if write.send(Message::Text("Parsed".to_string())).await.is_err() {
                    break;
                }
            },
            Ok(Message::Close(_)) => {
                println!("<- '{}'로부터 연결 종료 메시지 수신", addr);
                break;
            },
            Ok(_) => {
                // Binary, Ping, Pong 등 다른 메시지 타입은 무시하고 계속 진행
                println!("<- '{}'로부터 다른 타입의 메시지 수신 (무시됨)", addr);
            },
            Err(e) => {
                eprintln!("🔴 메시지 수신 중 에러 발생: {:?}", e);
                break;
            }
        }
    }
    println!("🔌 '{}' 와의 연결이 종료되었습니다.", addr);
}