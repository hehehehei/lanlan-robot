# Backend Server

Rust-based backend server using Axum web framework.

## Prerequisites

- Rust 1.70+
- MySQL 8.0+
- cargo

## Setup

1. Create a `.env` file in the backend directory:

```env
DATABASE_URL=mysql://root:password@localhost/cad_db
STORAGE_ROOT=storage/uploads
SERVER_HOST=127.0.0.1
SERVER_PORT=3000
MAX_FILE_SIZE=104857600
```

2. Run database migrations (from project root):

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features mysql

# Run migrations
sqlx migrate run --source ../migrations
```

## Development

### Build

```bash
cd backend/server
cargo build
```

### Run

```bash
cd backend/server
cargo run
```

### Test

```bash
cd backend/server
cargo test
```

## API Endpoints

### Upload File

**POST** `/api/projects/{project_id}/files`

Upload a DXF or DWG file to a project.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form field `file` with the file to upload
- Max file size: 100MB

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "example.dxf",
  "size": 12345,
  "checksum": "abc123...",
  "storage_path": "uuid/original.dxf",
  "encoding": "UTF-8",
  "status": "uploaded_awaiting_parse",
  "created_at": "2023-11-01T10:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Project not found
- `400 Bad Request`: Invalid file type or missing file
- `413 Payload Too Large`: File exceeds 100MB limit
- `409 Conflict`: Storage limit exceeded (stub)

## Features

- Multipart file upload with size limit enforcement
- File storage on disk with UUID-based organization
- SHA-256 checksum calculation
- Character encoding detection (UTF-8, GBK, GB2312, Big5)
- Database integration with MySQL
- Comprehensive error handling
- Integration tests

## Project Structure

```
backend/
├── server/
│   ├── src/
│   │   ├── config.rs          # Configuration management
│   │   ├── error.rs           # Error handling
│   │   ├── lib.rs             # Library entry point
│   │   ├── main.rs            # Binary entry point
│   │   ├── models/            # Data models
│   │   │   ├── file.rs
│   │   │   ├── project.rs
│   │   │   └── mod.rs
│   │   ├── routes/            # API routes
│   │   │   ├── files.rs
│   │   │   └── mod.rs
│   │   └── services/          # Business logic
│   │       ├── file_storage.rs
│   │       └── mod.rs
│   ├── tests/
│   │   └── upload.rs          # Integration tests
│   └── Cargo.toml
├── fixtures/                  # Test fixtures
│   ├── sample_utf8.dxf
│   └── sample_gbk.dxf
└── Cargo.toml                 # Workspace configuration
```
