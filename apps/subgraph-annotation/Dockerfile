# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=9

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/subgraph-annotation/ apps/subgraph-annotation/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
RUN pnpm --filter @edusphere/subgraph-annotation build

FROM base AS runner
RUN addgroup -g 1001 -S edusphere && adduser -u 1001 -S app -G edusphere
COPY --from=deps --chown=app:edusphere /app/node_modules ./node_modules
COPY --from=deps --chown=app:edusphere /app/packages ./packages
COPY --from=builder --chown=app:edusphere /app/apps/subgraph-annotation/dist ./apps/subgraph-annotation/dist
USER app
EXPOSE 4003
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:4003/health || exit 1
CMD ["node", "apps/subgraph-annotation/dist/main.js"]
