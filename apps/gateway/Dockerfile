# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=10

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json tsconfig.base.json ./
COPY packages/ packages/
# Copy all apps so pnpm workspace resolution succeeds with --frozen-lockfile
COPY apps/ apps/
RUN pnpm install --frozen-lockfile

FROM base AS runner
RUN addgroup -g 1001 -S edusphere && adduser -u 1001 -S app -G edusphere
COPY --from=deps --chown=app:edusphere /app/node_modules ./node_modules
COPY --from=deps --chown=app:edusphere /app/packages ./packages
COPY --from=deps --chown=app:edusphere /app/apps/gateway ./apps/gateway
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:4000/healthz || exit 1
CMD ["node_modules/.bin/tsx", "apps/gateway/src/index.ts"]
