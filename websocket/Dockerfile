# --- 1단계: 빌더(Builder) 스테이지 ---
# 모든 개발 도구가 포함된 최신 Rust 이미지를 사용합니다.
FROM rust:latest as builder

# 정적 링킹을 시도했던 musl 타겟은 이제 필요 없으므로, 표준 타겟으로 빌드합니다.
WORKDIR /usr/src/app

# 먼저 의존성 파일만 복사하여 캐시 효율을 높입니다.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# 실제 소스 코드를 복사하고 다시 빌드합니다.
COPY src ./src
RUN cargo build --release


# --- 2단계: 러너(Runner) 스테이지 ---
# ✨✨✨ 핵심 변경점: 최종 실행 환경도 rust:latest를 사용합니다. ✨✨✨
# 이렇게 하면 실행에 필요한 모든 시스템 라이브러리가 보장됩니다.
FROM rust:latest

# 보안을 위해 root가 아닌 일반 사용자를 생성하여 앱을 실행합니다.
RUN useradd --create-home --shell /bin/bash appuser

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
COPY --from=builder /usr/src/app/target/release/websocket /usr/local/bin/websocket

# 사용자 변경
USER appuser

# 컨테이너 시작 명령어
CMD ["websocket"]
