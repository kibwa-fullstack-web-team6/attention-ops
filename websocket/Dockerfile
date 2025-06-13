FROM rust:latest as builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY src ./src
RUN cargo build --release
FROM rust:latest

# 보안을 위해 root가 아닌 일반 사용자를 생성하여 앱을 실행
RUN useradd --create-home --shell /bin/bash appuser

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사
COPY --from=builder /usr/src/app/target/release/websocket /usr/local/bin/websocket

# 사용자 변경
CMD ["websocket"]