# ---- Stage 1: generate gh/data JSON from the committed gh/star.db ----
# Uses a glibc base (node:20-slim) so better-sqlite3 resolves a prebuilt binary
# or compiles from source; the runtime stage stays on alpine.
FROM node:20-slim AS data

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /data
COPY gh/package.json gh/pnpm-lock.yaml ./
RUN pnpm i

COPY gh/ ./
RUN pnpm run star:generate

# ---- Stage 2: runtime ----
FROM node:20-alpine

ARG GIT_COMMIT
LABEL org.opencontainers.image.revision=${GIT_COMMIT}
ENV GIT_COMMIT=${GIT_COMMIT}

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set working directory
WORKDIR /app

# Copy and install root shared dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm i

# Copy and install backend dependencies
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
RUN cd backend && pnpm i

# Copy source code needed for build
COPY shared/ ./shared/
COPY backend/ ./backend/

# Copy generated gh data (gh/data/ is gitignored, so it cannot be copied from the repo)
COPY --from=data /data/data ./gh/data

# Expose port
EXPOSE 8080

# Start the application
WORKDIR /app/backend
CMD ["./node_modules/.bin/tsx", "main.ts"]
