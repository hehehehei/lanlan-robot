# Frontend Application

This is a Vite React application with TypeScript, configured with Chinese localization (zh-CN) and a dark theme.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for routing (project/file viewer)
- **React i18next** for Chinese localization (zh-CN)
- **Pixi.js** for canvas rendering
- **Dark Theme** with black background (#000) and white strokes
- **ESLint + Prettier** for code quality
- **Vitest** for testing

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

This will start the development server at `http://localhost:5173/`

### Linting

```bash
pnpm lint        # Check for issues
pnpm lint:fix    # Auto-fix issues
pnpm format      # Format code with Prettier
```

### Testing

```bash
pnpm test        # Run tests
```

### Type Checking

```bash
pnpm typecheck   # Check TypeScript types
```

### Build

```bash
pnpm build       # Build for production
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── Layout.tsx    # Main layout component
│   │   ├── Sidebar.tsx   # Sidebar with layer toggles
│   │   └── CanvasContainer.tsx  # Pixi.js canvas container
│   ├── pages/            # Page components
│   │   ├── ProjectViewer.tsx
│   │   └── FileViewer.tsx
│   ├── routes/           # Router configuration
│   │   └── index.tsx
│   ├── i18n/             # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       └── zh-CN.json
│   ├── styles/           # Global styles
│   │   └── theme.css
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── eslint.config.js      # ESLint configuration
```

## Routes

- `/` - Redirects to `/project`
- `/project` - Project viewer with canvas
- `/file/:fileId` - File viewer with canvas

## Theme

The application uses a dark theme with CSS variables defined in `src/styles/theme.css`:

- Background: `#000000` (black)
- Text/Strokes: `#ffffff` (white)
- Sidebar: `#1a1a1a` (dark gray)
- Borders: `#333333` (gray)

## Localization

Default locale is Chinese (zh-CN). Translation strings are in `src/i18n/locales/zh-CN.json`.
