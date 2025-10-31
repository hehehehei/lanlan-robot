# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts ./frontend/
COPY frontend/.eslintrc.cjs frontend/.prettierrc ./frontend/
COPY frontend/index.html ./frontend/
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public

WORKDIR /app/frontend

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:1.25-alpine AS runtime
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
