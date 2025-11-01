# Quick Start Guide

## Local Development

### 1. Start MySQL Database

Using Docker Compose (recommended):
```bash
cd backend
docker-compose up -d
```

Or use your local MySQL installation.

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit .env if needed
```

### 3. Run Migrations

```bash
cd backend
sqlx migrate run --database-url "mysql://root:password@localhost/cad_db"
```

### 4. Run the Server

```bash
cd backend
cargo run
```

The server will start on `http://127.0.0.1:3000` by default.

### 5. Test Health Endpoint

```bash
curl http://127.0.0.1:3000/health
```

Expected response:
```json
{"status":"ok"}
```

## Running Tests

```bash
cd backend
cargo test
```

Note: Integration tests require a running MySQL database. Set `DATABASE_URL` environment variable to point to a test database.

## Development Commands

- **Format code**: `cargo fmt`
- **Lint code**: `cargo clippy`
- **Build**: `cargo build`
- **Build release**: `cargo build --release`
- **Watch mode**: `cargo watch -x run` (requires `cargo-watch`)

## Troubleshooting

### Database Connection Failed

1. Ensure MySQL is running:
   ```bash
   docker-compose ps
   ```

2. Check DATABASE_URL in `.env` file

3. Test connection:
   ```bash
   mysql -h 127.0.0.1 -u root -ppassword cad_db
   ```

### Compilation Issues

1. Ensure you have the latest stable Rust:
   ```bash
   rustup update stable
   ```

2. Clean and rebuild:
   ```bash
   cargo clean
   cargo build
   ```

### SQLx Offline Mode

If you see SQLx compilation errors, regenerate the metadata:
```bash
cargo sqlx prepare --database-url "mysql://root:password@localhost/cad_db"
```
