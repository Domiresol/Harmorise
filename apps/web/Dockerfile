# ══════════════════════════════════════════════════════════════
# Stage 1 — Builder
# ══════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder
WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 전체 복사 후 NX 빌드
COPY . .
RUN npx nx build web

# ══════════════════════════════════════════════════════════════
# Stage 2 — Runner (nginx)
# ══════════════════════════════════════════════════════════════
FROM nginx:alpine AS runner

# Vite 빌드 결과물 복사
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx 설정 (SPA + API 프록시)
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
