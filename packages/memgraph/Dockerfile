# Dependencies stage - install all dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json bun.lock ./
COPY packages/memgraph/package.json ./packages/memgraph/
COPY packages/core/package.json ./packages/core/

# Install dependencies
RUN bun install

# Codegen stage - generate GraphQL schema and types
FROM deps AS codegen
WORKDIR /app

# Copy source files needed for codegen
COPY packages/core/src ./packages/core/src
COPY packages/memgraph/src ./packages/memgraph/src

# Set environment variables for codegen
ARG NODE_ENV=production
ARG PORT=4000
ARG MEMGRAPH_CONNECTION_LIFETIME=86400000
ARG MEMGRAPH_CONNECTION_TIMEOUT=86400000
ARG MEMGRAPH_MAX_CONNECTIONS=100
ARG MEMGRAPH_URL=bolt://localhost:7687
ARG MEMGRAPH_USER=neo4j
ARG MEMGRAPH_PASSWORD=default
ARG MEMGRAPH_DATABASE_NAME=memgraph
ARG ENABLE_GRAPHIQL=false
ARG ENABLE_LANDING_PAGE=false

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV MEMGRAPH_CONNECTION_LIFETIME=${MEMGRAPH_CONNECTION_LIFETIME}
ENV MEMGRAPH_CONNECTION_TIMEOUT=${MEMGRAPH_CONNECTION_TIMEOUT}
ENV MEMGRAPH_MAX_CONNECTIONS=${MEMGRAPH_MAX_CONNECTIONS}
ENV MEMGRAPH_URL=${MEMGRAPH_URL}
ENV MEMGRAPH_USER=${MEMGRAPH_USER}
ENV MEMGRAPH_PASSWORD=${MEMGRAPH_PASSWORD}
ENV MEMGRAPH_DATABASE_NAME=${MEMGRAPH_DATABASE_NAME}
ENV ENABLE_GRAPHIQL=${ENABLE_GRAPHIQL}
ENV ENABLE_LANDING_PAGE=${ENABLE_LANDING_PAGE}

# Run codegen
WORKDIR /app/packages/memgraph
RUN bun run codegen

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy only production dependencies (Bun workspaces install everything to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and generated files
COPY packages/core/src ./packages/core/src
COPY packages/memgraph/src ./packages/memgraph/src
COPY --from=codegen /app/packages/memgraph/src/client/generated ./packages/memgraph/src/client/generated

# Copy package.json files
COPY package.json ./
COPY packages/memgraph/package.json ./packages/memgraph/

WORKDIR /app/packages/memgraph

EXPOSE 4000

CMD ["bun", "run", "start"] 