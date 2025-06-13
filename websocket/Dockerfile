FROM rust:1.78 as builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY src ./src
RUN cargo build --release
FROM debian:bookworm-slim
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /usr/src/app/target/release/websocket /usr/local/bin/websocket
USER appuser
CMD ["websocket"]