use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};

// Tokio의 비동기 main 함수 어트리뷰트
#[tokio::main]
async fn main() {
    // 서버 주소 설정 (모든 IP의 9001 포트에서 수신)
    let addr = "0.0.0.0:9001";
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

    println!("✅ WebSocket 서버가 다음 주소에서 실행 중입니다: {}", addr);

    // 클라이언트의 접속을 무한정 기다림
    while let Ok((stream, _)) = listener.accept().await {
        // 새 클라이언트가 접속하면, 별도의 비동기 태스크로 처리
        tokio::spawn(handle_connection(stream));
    }
}

// 개별 클라이언트 연결을 처리하는 비동기 함수
async fn handle_connection(stream: TcpStream) {
    let addr = stream.peer_addr().expect("connected streams should have a peer address");
    println!("🤝 새로운 클라이언트 접속: {}", addr);

    // TCP 스트림을 웹소켓 스트림으로 업그레이드(핸드셰이크)
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            println!("🔴 웹소켓 핸드셰이크 중 에러 발생: {}", e);
            return;
        }
    };

    println!("🚀 WebSocket 연결 성공: {}", addr);

    // 웹소켓 스트림을 읽기(read)와 쓰기(write)로 분리
    let (mut write, mut read) = ws_stream.split();

    // 클라이언트로부터 메시지를 기다리는 루프
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("<- '{}'로부터 텍스트 수신: {}", addr, text);
                // 받은 텍스트 메시지를 그대로 다시 클라이언트에게 보냄 (에코)
                if write.send(Message::Text(text)).await.is_err() {
                    println!("🔴 '{}'에게 메시지 전송 실패, 연결 종료.", addr);
                    break;
                }
            }
            Ok(Message::Binary(bin)) => {
                println!("<- '{}'로부터 바이너리 데이터 수신: {:02X?}", addr, bin);
                // 받은 바이너리 메시지를 그대로 다시 보냄 (에코)
                if write.send(Message::Binary(bin)).await.is_err() {
                    println!("🔴 '{}'에게 메시지 전송 실패, 연결 종료.", addr);
                    break;
                }
            }
            Ok(Message::Ping(_)) => {
                println!("<- '{}'로부터 Ping 수신", addr);
            }
            Ok(Message::Close(_)) => {
                println!("-> '{}'가 연결을 종료했습니다.", addr);
                break;
            }
            Err(e) => {
                println!("🔴 '{}'와의 연결에서 에러 발생: {}", addr, e);
                break;
            }
            _ => { /* Pong, Frame 등 다른 메시지 타입은 무시 */ }
        }
    }
}
