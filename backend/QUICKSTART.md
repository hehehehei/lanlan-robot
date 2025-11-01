# Quick Start Guide

This guide will help you get the backend server up and running quickly.

## Prerequisites

Ensure you have the following installed:
- Rust 1.70 or later (install from https://rustup.rs)
- MySQL 8.0 or later
- Git

## Setup Steps

### 1. Install Rust (if not already installed)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Set up MySQL Database

```bash
# Log into MySQL
mysql -u root -p

# Create database
CREATE DATABASE cad_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional)
CREATE USER 'cad_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON cad_db.* TO 'cad_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL=mysql://root:password@localhost/cad_db
STORAGE_ROOT=storage/uploads
SERVER_HOST=127.0.0.1
SERVER_PORT=3000
MAX_FILE_SIZE=104857600
```

### 4. Run Database Migrations

```bash
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features mysql

# Run migrations from project root
cd ..
sqlx migrate run --database-url "mysql://root:password@localhost/cad_db" --source migrations
```

### 5. Build and Run

```bash
cd backend/server
cargo build
cargo run
```

The server will start on `http://127.0.0.1:3000`

### 6. Test the API

Upload a test file:

```bash
curl -X POST http://localhost:3000/api/projects/1/files \
  -F "file=@../fixtures/sample_utf8.dxf"
```

Note: You'll need to create a project first. You can do this manually in MySQL:

```sql
INSERT INTO projects (name, description) VALUES ('Test Project', 'A test project');
```

## Running Tests

```bash
cd backend/server

# Unit tests only (no database required)
cargo test --lib

# All tests (requires database)
cargo test
```

## Development Tips

### Watch mode for auto-rebuild

Install cargo-watch:

```bash
cargo install cargo-watch
```

Run with auto-reload:

```bash
cargo watch -x run
```

### Check code before commit

```bash
# Format code
cargo fmt

# Check for issues
cargo clippy

# Run tests
cargo test
```

## Troubleshooting

### Database Connection Error

If you see "Connection refused" errors:
1. Ensure MySQL is running: `sudo systemctl status mysql`
2. Check your DATABASE_URL in `.env`
3. Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Port Already in Use

If port 3000 is already in use, change `SERVER_PORT` in `.env`

### Storage Directory Permissions

Ensure the storage directory is writable:

```bash
mkdir -p storage/uploads
chmod 755 storage/uploads
```

## Next Steps

- Read [README.md](README.md) for detailed documentation
- See [API_EXAMPLES.md](API_EXAMPLES.md) for API usage examples
- Check [fixtures/README.md](fixtures/README.md) for test file information
