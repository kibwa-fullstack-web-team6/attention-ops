FROM rust:latest

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 먼저 의존성 파일만 복사
COPY Cargo.toml Cargo.lock* ./

# 의존성을 미리 설치합니다.
RUN cargo build --release
# 실제로는 의존성만 컴파일되지만, 레이어 캐시를 위해 빈 main.rs를 만들지 않고 바로 실행합니다.

# 전체 소스 코드를 복사합니다.
COPY . .

# 전체 프로젝트를 다시 빌드합니다.
RUN cargo build --release

# 컨테이너 시작 시, 컴파일된 최종 실행 파일을 실행합니다.
# 경로가 /usr/src/app/target/release/websocket 으로 변경됩니다.
CMD ["/usr/src/app/target/release/websocket"]
