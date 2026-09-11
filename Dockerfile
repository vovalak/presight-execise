# syntax=docker/dockerfile:1

# Single image that serves the API and the built React client on port 3000.
# glibc-based image so better-sqlite3 can use its prebuilt binaries (x64 and arm64).

# Stage the dependency installs start from. better-sqlite3 downloads a prebuilt binary for
# Node 22 on linux x64/arm64, so by default no compiler is installed (and no apt/dpkg runs,
# which hangs on the WSL2 6.18.33 kernel — microsoft/WSL#41113). If the prebuilt download is
# unavailable, build with `--build-arg DEPS_BASE=toolchain` to compile it from source.
ARG DEPS_BASE=base

FROM node:22-bookworm-slim AS base
WORKDIR /app

# Compiler toolchain for building better-sqlite3 from source (needs python3/make/g++).
FROM base AS toolchain
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# All dependencies (including dev) for building.
FROM ${DEPS_BASE} AS deps
COPY package.json yarn.lock ./
COPY server/package.json server/
COPY client/package.json client/
RUN yarn install --frozen-lockfile --non-interactive

# Compile the server and bundle the client.
FROM deps AS build
COPY server server
COPY client client
RUN yarn workspace presight-server build && yarn workspace presight-client build

# Production dependencies only.
FROM ${DEPS_BASE} AS prod-deps
COPY package.json yarn.lock ./
COPY server/package.json server/
COPY client/package.json client/
RUN yarn install --frozen-lockfile --non-interactive --production \
  && mkdir -p server/node_modules client/node_modules

# Minimal runtime image.
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/directory.db \
    STATIC_DIR=/app/client/dist \
    SEED_COUNT=10000 \
    SEED=42
RUN mkdir -p /data && chown node:node /data
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY package.json ./package.json
COPY server/package.json ./server/package.json
USER node
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
# Seed the database on first start (no-op once it has users), then serve.
CMD ["sh", "-c", "node server/dist/seed/run.js --if-missing && exec node server/dist/index.js"]
