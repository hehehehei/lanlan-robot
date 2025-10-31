# CAD Monorepo

A monorepo that hosts the CAD viewer/editor backend (Rust) and frontend (React + Pixi.js).

## Repository Structure

```
.
├── backend/            # Rust workspace containing the Axum server
├── frontend/           # Vite + React + Pixi.js application
├── docker-compose.yml  # Local orchestration with MySQL, backend, frontend
├── pnpm-workspace.yaml # PNPM workspace configuration (frontend only)
└── .github/workflows   # Continuous integration pipelines
```

## Prerequisites

- **Rust** (1.75 or newer) with `cargo`
- **Node.js** (>= 18) with **pnpm** (>= 8) — `corepack enable` recommended
- **MySQL** (8.x) — available locally or via Docker

## Environment Variables

Create a copy of `.env.example` (backend) and `frontend/.env.local.example` for local overrides.

### Backend (`server` crate)

| Variable           | Description                                     | Default (example)                             |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`     | MySQL connection string                         | `mysql://root:password@localhost:3306/cad`    |
| `APP_PORT`         | HTTP port for the Axum server                   | `8080`                                         |
| `FILE_STORAGE_DIR` | Path for persisted file storage                 | `storage`                                      |
| `RUST_LOG`         | Tracing filter for logging output               | `server=info,sqlx=warn,tower_http=warn`        |

### Frontend

| Variable             | Description                      | Default (example)               |
| -------------------- | -------------------------------- | ------------------------------- |
| `VITE_API_BASE_URL`  | Base URL for backend API calls   | `http://localhost:8080`         |

## Local Development

### Backend

```bash
cd backend
cargo run
```

The server starts on `0.0.0.0:8080` by default. A readiness probe is available at `GET /healthz`, returning:

```json
{ "status": "ok" }
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The development server runs on [http://localhost:5173](http://localhost:5173) with a black Pixi canvas and Chinese UI placeholders. The application reads the API base URL from `VITE_API_BASE_URL`.

## Docker Compose Quickstart

```bash
cp .env.example .env
docker compose up --build
```

Services exposed:

- **MySQL** on `localhost:3306`
- **Backend** on `http://localhost:8080`
- **Frontend** on `http://localhost:5173`

The backend waits for database readiness before serving traffic and logs the bound port when ready. File uploads/storage are persisted in the `backend-storage` volume.

## Continuous Integration

GitHub Actions validate both projects:

- Rust formatting, clippy, and build for the backend
- PNPM lint and build for the frontend

## Additional Tooling

A `.devcontainer` configuration is provided for VS Code users, bundling Rust and Node tooling and wiring the workspace through `docker-compose.yml`.
