# --- 1단계: 빌더(Builder) 스테이지 ---
# 정적 링킹을 위해 'musl' 타겟을 사용하는 특별한 Rust 이미지를 사용합니다.
FROM rust:latest as builder

# '정적 링킹'을 위한 musl 타겟을 추가로 설치합니다.
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /usr/src/app

# 먼저 의존성 파일만 복사
COPY Cargo.toml Cargo.lock* ./

# 의존성 빌드를 위해 가짜 main.rs 생성
RUN mkdir src && echo "fn main() {}" > src/main.rs
# --target 옵션을 주어 musl 환경에 맞게 의존성을 정적으로 컴파일합니다.
RUN cargo build --target x86_64-unknown-linux-musl --release

# 실제 소스 코드를 복사해서 덮어씁니다.
COPY . .

# 실제 소스 코드로 다시 한번 빌드합니다.
RUN cargo build --target x86_64-unknown-linux-musl --release


# --- 2단계: 러너(Runner) 스테이지 ---
# 'alpine'은 musl libc를 기반으로 하는 매우 가볍고 안정적인 리눅스 이미지입니다.
# 정적으로 빌드된 우리 실행 파일과 최고의 궁합을 자랑합니다.
FROM alpine:latest

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
# 경로가 --target 옵션에 맞게 변경됩니다.
COPY --from=builder /usr/src/app/target/x86_64-unknown-linux-musl/release/websocket /usr/local/bin/websocket

# 컨테이너 시작 시 이 파일을 실행합니다.
CMD ["websocket"]
