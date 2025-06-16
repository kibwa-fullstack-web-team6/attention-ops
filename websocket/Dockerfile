# --- 1단계: 빌더(Builder) 스테이지 ---
FROM rust:latest as builder

WORKDIR /usr/src/app

# 먼저 의존성 파일만 복사
COPY Cargo.toml Cargo.lock* ./

# ✨✨✨ 빠졌던 부분 추가: 의존성 빌드를 위해 가짜 main.rs 생성 ✨✨✨
RUN mkdir src && echo "fn main() {}" > src/main.rs

# 이제 cargo build는 가짜 main.rs를 보고 의존성만 성공적으로 컴파일합니다.
RUN cargo build --release

# 실제 소스 코드를 복사해서 덮어씁니다.
COPY . .

# 실제 소스 코드로 다시 한번 빌드합니다.
RUN cargo build --release


# --- 2단계: 러너(Runner) 스테이지 ---
# 매우 가벼운 최종 실행 환경
FROM debian:bookworm-slim

# 보안을 위해 root가 아닌 일반 사용자를 생성하여 앱을 실행합니다.
RUN useradd --create-home --shell /bin/bash appuser

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
COPY --from=builder /usr/src/app/target/release/websocket /usr/local/bin/websocket

# 사용자 변경
USER appuser

# 컨테이너 시작 명령어
CMD ["websocket"]
