# Dependencies stage - install all dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json bun.lock ./
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/core/package.json ./packages/core/

# Install dependencies
RUN bun install

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY packages/core/src ./packages/core/src
COPY packages/mcp/src ./packages/mcp/src
COPY packages/memgraph/src ./packages/memgraph/src

# Copy package.json files to maintain workspace structure
COPY package.json ./
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/core/package.json ./packages/core/

WORKDIR /app/packages/mcp

EXPOSE 8080

CMD ["bun", "run", "start"]
