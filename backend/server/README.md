# Backend Server

Axum-based backend API server with MySQL database integration.

## Features

- **Health Check Endpoint**: `/health` - Returns `{ "status": "ok" }` and verifies database connectivity
- **File Management**: Upload and parse CAD files (DXF/DWG)
- **Configuration**: Environment-based configuration using the `config` crate
- **Database**: MySQL with SQLx connection pooling and migrations
- **Offline Mode**: SQLx offline mode support via `sqlx-data.json`

## Configuration

The server reads configuration from environment variables with sensible defaults:

- `DATABASE_URL`: MySQL connection string (default: `mysql://root:password@localhost/cad_db`)
- `STORAGE_ROOT`: File storage directory (default: `storage/uploads`)
- `SERVER_HOST`: Server bind address (default: `127.0.0.1`)
- `SERVER_PORT`: Server port (default: `3000`)
- `MAX_FILE_SIZE`: Maximum file upload size in bytes (default: `104857600`)

## Development

### Prerequisites

- Rust 1.70+ with Cargo
- MySQL 8.0+
- Docker (optional, for database)

### Setup

1. Copy the `.env.example` to `.env` and configure:
   ```bash
   cp ../.env.example ../.env
   ```

2. Run database migrations:
   ```bash
   sqlx migrate run --database-url "mysql://root:password@localhost/cad_db"
   ```

3. Build and run:
   ```bash
   cargo run
   ```

### Testing

Run all tests:
```bash
cargo test
```

Run specific test suite:
```bash
cargo test --test health
cargo test --test upload
```

### Code Quality

Format code:
```bash
cargo fmt
```

Run linter:
```bash
cargo clippy
```

## Endpoints

- `GET /health` - Health check endpoint
- `POST /api/projects/:project_id/files` - Upload a file
- `POST /api/projects/:project_id/files/:file_id/parse` - Parse an uploaded file

## Project Structure

```
src/
├── main.rs           # Application entry point
├── lib.rs            # Library exports and app setup
├── config.rs         # Configuration management
├── error.rs          # Error types and handlers
├── models/           # Database models
├── routes/           # HTTP route handlers
│   ├── health.rs     # Health check endpoint
│   ├── files.rs      # File upload endpoints
│   └── parse.rs      # File parsing endpoints
└── services/         # Business logic
    ├── dxf_parser.rs # DXF file parser
    └── file_storage.rs # File storage service
```
