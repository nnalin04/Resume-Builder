# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# VITE_API_URL must be set at build time — Vite bakes it into the JS bundle
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: nginx static server ─────────────────────────────────────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: serve index.html for all routes
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
