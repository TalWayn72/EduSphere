# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
ARG PNPM_VERSION=10

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json tsconfig.base.json ./
COPY packages/ packages/
# Copy all apps so pnpm workspace resolution succeeds with --frozen-lockfile
COPY apps/ apps/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
RUN pnpm turbo build --filter='./packages/*'
RUN pnpm --filter @edusphere/transcription-worker build

FROM base AS runner
RUN addgroup -g 1001 -S edusphere && adduser -u 1001 -S worker -G edusphere
COPY --from=deps --chown=worker:edusphere /app/node_modules ./node_modules
COPY --from=deps --chown=worker:edusphere /app/packages ./packages
COPY --from=builder --chown=worker:edusphere /app/apps/transcription-worker/dist ./apps/transcription-worker/dist
USER worker

ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "apps/transcription-worker/dist/main.js"]
