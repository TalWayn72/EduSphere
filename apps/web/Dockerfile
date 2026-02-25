# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=10

FROM node:${NODE_VERSION}-alpine AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ packages/
# Copy all apps so pnpm workspace resolution succeeds with --frozen-lockfile
COPY apps/ apps/
RUN pnpm install --frozen-lockfile

ARG VITE_GRAPHQL_URL
ARG VITE_GRAPHQL_WS_URL
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=edusphere
ARG VITE_KEYCLOAK_CLIENT_ID=edusphere-app

RUN pnpm --filter @edusphere/web build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
