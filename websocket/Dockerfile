# --- 1단계: 빌더(Builder) 스테이지 ---
# 표준 rust:latest 이미지를 사용하여 코드를 컴파일합니다.
FROM rust:latest as builder

WORKDIR /usr/src/app

# 의존성 캐싱을 위해 Cargo.toml을 먼저 복사하고 빌드합니다.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# 실제 소스 코드를 복사하고 다시 빌드합니다.
COPY . .
RUN cargo build --release


# --- 2단계: 러너(Runner) 스테이지 ---
# 실행에 필요한 모든 라이브러리가 포함된 동일한 이미지를 사용해 안정성을 확보합니다.
FROM rust:latest

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
COPY --from=builder /usr/src/app/target/release/websocket /usr/local/bin/websocket

# ✨✨✨ 변경점: 권한 문제를 확인하기 위해 아래 두 줄을 임시로 주석 처리합니다. ✨✨✨
# RUN useradd --create-home --shell /bin/bash appuser
# USER appuser

# 컨테이너 시작 시 root 사용자로 websocket 파일을 실행합니다.
CMD ["websocket"]
