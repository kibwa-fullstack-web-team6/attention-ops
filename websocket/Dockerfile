# --- 1단계: 빌더(Builder) 스테이지 ---
# 모든 개발 도구가 포함된 최신 Rust 이미지를 사용합니다.
FROM rust:latest as builder

# '정적 링킹'을 위한 musl 타겟을 추가로 설치합니다.
RUN rustup target add x86_64-unknown-linux-musl

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# 먼저 의존성 파일만 복사하여 캐시 효율을 높입니다.
COPY Cargo.toml Cargo.lock* ./
# 빈 src 디렉토리와 main.rs 파일을 만들어 의존성만 빌드합니다.
RUN mkdir src && echo "fn main() {}" > src/main.rs
# --target 옵션을 주어 musl 환경에 맞게 의존성을 컴파일합니다.
RUN cargo build --target x86_64-unknown-linux-musl --release

# 이제 실제 소스 코드를 복사합니다.
COPY src ./src

# 소스 코드가 변경되었으므로, 다시 빌드하여 최종 실행 파일을 만듭니다.
RUN cargo build --target x86_64-unknown-linux-musl --release


# --- 2단계: 러너(Runner) 스테이지 ---
# 'scratch'는 비어있는, 세상에서 가장 작은 베이스 이미지입니다.
# 우리 실행 파일은 이제 아무런 외부 라이브러리도 필요 없으므로 여기서 실행 가능합니다.
FROM scratch

# 빌더 스테이지에서 컴파일된 최종 실행 파일을 현재 스테이지로 복사합니다.
# 경로는 --target 옵션에 맞게 변경됩니다.
COPY --from=builder /usr/src/app/target/x86_64-unknown-linux-musl/release/websocket /websocket

# 컨테이너 시작 시 이 파일을 실행합니다.
CMD ["/websocket"]
