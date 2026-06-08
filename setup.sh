#!/bin/bash
# ================================================
# Harmrise - 앱 생성 스크립트 (NX 워크스페이스 생성 이후 실행)
# 실행 방법: cd /Users/dosol/Desktop/Dosol/project/Harmrise && bash setup.sh
# ================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║   Harmrise - 앱 및 라이브러리 생성      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── STEP 3. NestJS 앱 생성 ──
echo -e "${YELLOW}[1/3] NestJS 백엔드 앱 생성 중...${NC}"
npx nx add @nx/nest
npx nx g @nx/nest:app \
  --name=api \
  --directory=apps/api \
  --no-interactive
echo -e "${GREEN}✅ apps/api (NestJS) 생성 완료${NC}"

# ── STEP 4. React + Vite 앱 생성 ──
echo -e "${YELLOW}[2/3] React + Vite 프론트엔드 앱 생성 중...${NC}"
npx nx add @nx/react
npx nx g @nx/react:app \
  --name=web \
  --directory=apps/web \
  --bundler=vite \
  --routing=true \
  --style=css \
  --no-interactive
echo -e "${GREEN}✅ apps/web (React + Vite) 생성 완료${NC}"

# ── STEP 5. 공유 타입 라이브러리 생성 ──
echo -e "${YELLOW}[3/3] 공유 타입 라이브러리 생성 중...${NC}"
npx nx add @nx/js
npx nx g @nx/js:lib \
  --name=shared \
  --directory=libs/shared \
  --unitTestRunner=none \
  --no-interactive
echo -e "${GREEN}✅ libs/shared 생성 완료${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗"
echo "║   ✅ 앱 구조 생성 완료!                ║"
echo "║                                        ║"
echo "║   apps/api    - NestJS 백엔드          ║"
echo "║   apps/web    - React + Vite 프론트    ║"
echo "║   libs/shared - 공유 타입 라이브러리   ║"
echo "║                                        ║"
echo "║   다음 단계: docker-compose.yml 설정   ║"
echo -e "╚════════════════════════════════════════╝${NC}"
