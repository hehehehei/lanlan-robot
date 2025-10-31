# syntax=docker/dockerfile:1

FROM rust:1.75-slim AS builder
WORKDIR /workspace

# Install required build dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Pre-build dependency layers
COPY Cargo.toml ./
COPY rustfmt.toml ./
COPY Clippy.toml ./
COPY server/Cargo.toml server/Cargo.toml
RUN mkdir -p server/src
RUN echo "fn main() {}" > server/src/main.rs
RUN cargo build --release -p server || true
RUN rm -rf server/src

# Build the real binary
COPY migrations migrations
COPY server/src server/src
RUN cargo build --release -p server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && \
    apt-get install -y ca-certificates tzdata && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/target/release/server /usr/local/bin/server
COPY --from=builder /workspace/migrations ./migrations

ENV APP_PORT=8080 \
    RUST_LOG=server=info,sqlx=warn,tower_http=warn

EXPOSE 8080

CMD ["/usr/local/bin/server"]
