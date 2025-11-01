# Project

This is a monorepo project using pnpm workspaces.

## Workspace Structure

```
.
├── frontend/          # React frontend application
└── migrations/        # Database migrations
```

## Prerequisites

- Node.js 18+
- pnpm 8+

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
