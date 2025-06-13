# --- 1단계: 빌더(Builder) 스테이지 ---
# 정적 링킹을 위해 musl 타겟을 사용하는 것은 동일합니다.
FROM rust:latest as builder

RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /usr/src/app

COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --target x86_64-unknown-linux-musl --release

COPY src ./src
RUN cargo build --target x86_64-unknown-linux-musl --release


# --- 2단계: 러너(Runner) 스테이지 ---
# ✨✨✨ 변경점: scratch 대신 alpine 이미지를 사용합니다. ✨✨✨
# alpine은 매우 가벼우면서도 완전한 리눅스 환경을 제공하여 안정성이 높습니다.
FROM alpine:latest

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
COPY --from=builder /usr/src/app/target/x86_64-unknown-linux-musl/release/websocket /usr/local/bin/websocket

# 컨테이너 시작 시 이 파일을 실행합니다.
CMD ["websocket"]
