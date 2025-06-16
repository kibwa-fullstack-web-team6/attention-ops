use std::thread;
use std::time::Duration;

fn main() {
    println!("✅ Rust 'Hello World' 테스트 서버가 성공적으로 시작되었습니다.");
    loop {
        thread::sleep(Duration::from_secs(60));
        println!("... still alive ...");
    }
}