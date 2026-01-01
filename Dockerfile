# ==========================================
# STAGE 1: Pruner
# ==========================================
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --scope=@repo/backend --docker

# ==========================================
# STAGE 2: Base & Builder
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat sqlite
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy pruned files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

ENV DB_FILE_NAME=file:/app/apps/backend/local.db

# Web app environment variables (build-time)
ARG VITE_BACKEND_URL

ENV VITE_BACKEND_URL=${VITE_BACKEND_URL:-}

RUN  cd /app/apps/backend && pnpm drizzle-kit generate
RUN cd /app/apps/backend && pnpm drizzle-kit push

RUN pnpm build --filter=web... --filter=@repo/backend...

RUN pnpm --filter @repo/backend --prod deploy pruned-backend

# ==========================================
# STAGE 3: Backend Runner
# ==========================================
FROM node:20-alpine AS backend
WORKDIR /app

RUN apk add --no-cache sqlite libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=builder /app/pruned-backend .
COPY --from=builder /app/apps/backend/dist ./dist

RUN mkdir -p storage && chown -R nodejs:nodejs storage

# Copy the 'seed' database created during build
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/local.db ./storage/local.db

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_FILE_NAME=file:storage/local.db

EXPOSE 3000

CMD ["node", "dist/index.js"]

# ==========================================
# STAGE 4: Web Runner (Nginx)
# ==========================================
FROM nginx:alpine AS web
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/apps/web/dist .

RUN echo 'server { \
    listen 80; \
    \
    # Enable Gzip compression for faster loading \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy API requests to the backend container \
    location /api/ { \
        proxy_pass http://backend:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    \
    # Proxy storage requests to the backend container \
    location /storage/ { \
        proxy_pass http://backend:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        client_max_body_size 10M; \
    } \
    \
    # Proxy WebSocket connections for Socket.io \
    location /socket.io/ { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_read_timeout 86400; \
        proxy_send_timeout 86400; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]