# Project

This is a monorepo project using pnpm workspaces.

## Workspace Structure

```
.
├── backend/           # Backend services
│   └── server/        # DXF parser service (Rust)
├── frontend/          # React frontend application
└── migrations/        # Database migrations
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (for backend services)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
# Start frontend development server
pnpm dev

# Or from the frontend directory
pnpm --filter frontend dev
```

The frontend will be available at http://localhost:5173/

### Available Commands

From the root directory:

```bash
pnpm dev           # Start frontend dev server
pnpm build         # Build frontend for production
pnpm lint          # Lint frontend code
pnpm test          # Run frontend tests
```

From the frontend directory:

```bash
pnpm --filter frontend dev         # Start dev server
pnpm --filter frontend build       # Build for production
pnpm --filter frontend lint        # Lint code
pnpm --filter frontend lint:fix    # Auto-fix linting issues
pnpm --filter frontend format      # Format code with Prettier
pnpm --filter frontend test        # Run tests
pnpm --filter frontend typecheck   # Type check
pnpm --filter frontend preview     # Preview production build
```

## Backend

See [backend/server/README.md](backend/server/README.md) for detailed backend documentation.

### DXF Parser Service (Rust)

- Parse DXF CAD files using the `dxf` crate
- Support for line, polyline, arc, circle, text, and insert entities
- Chinese text encoding support (GB18030)
- Bounding box computation
- Layer extraction
- Independent, async-ready service interface

### Backend Commands

```bash
cd backend/server

# Build the parser
cargo build --release

# Run tests
cargo test

# Parse a DXF file
cargo run -- path/to/file.dxf
```

## Frontend

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

### Key Features

- React 18 with TypeScript
- Vite for fast development
- Chinese localization (zh-CN) using react-i18next
- Dark theme with black background and white strokes
- React Router for routing
- Pixi.js for canvas rendering
- ESLint + Prettier for code quality
- Vitest for testing

## Project Structure

```
project/
├── backend/
│   └── server/            # DXF parser service (Rust)
│       ├── src/
│       │   ├── models/    # Entity models
│       │   └── services/  # Parser service
│       ├── tests/         # Integration tests
│       ├── fixtures/      # Test fixtures (sample.dxf)
│       └── Cargo.toml     # Rust dependencies
├── frontend/              # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── routes/        # Router configuration
│   │   ├── i18n/          # Internationalization
│   │   └── styles/        # Global styles
│   ├── public/            # Static assets
│   ├── index.html         # HTML template
│   ├── vite.config.ts     # Vite configuration
│   ├── tsconfig.json      # TypeScript configuration
│   └── eslint.config.js   # ESLint configuration
├── migrations/            # Database migrations
├── pnpm-workspace.yaml    # pnpm workspace config
└── package.json           # Root package.json
```
