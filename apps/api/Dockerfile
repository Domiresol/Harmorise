# ══════════════════════════════════════════════════════════════
# Stage 1 — Builder
# ══════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder
WORKDIR /app

# 의존성 설치 (package-lock 기준으로 재현 가능하게)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 전체 복사 후 NX 빌드
COPY . .
RUN npx nx build api

# Prisma 클라이언트 생성 (빌드 후 명시적으로 한번 더)
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

# ══════════════════════════════════════════════════════════════
# Stage 2 — Runner
# ══════════════════════════════════════════════════════════════
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 컴파일된 앱
COPY --from=builder /app/apps/api/dist ./dist

# Prisma 스키마 (migrate deploy에 필요)
COPY --from=builder /app/apps/api/prisma ./prisma

# Prisma 클라이언트 (네이티브 바이너리 포함)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 런타임 node_modules (webpack이 번들링 못하는 네이티브 dep)
# .prisma만 선택적으로 가져왔으므로 나머지 런타임 deps도 필요
COPY --from=builder /app/node_modules ./node_modules

# package.json (prisma CLI 실행에 필요)
COPY --from=builder /app/package.json ./

EXPOSE 3000

# DB 마이그레이션 적용 후 서버 기동
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
