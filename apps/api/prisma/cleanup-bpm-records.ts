/**
 * BpmRecord 중복 데이터 정리 스크립트
 *
 * 문제: 연습 기록 수정 시 기존 BpmRecord를 삭제하지 않고 append하던 버그로
 *       동일 sessionId에 여러 BpmRecord가 쌓인 상태.
 *
 * 실행: npx ts-node apps/api/prisma/cleanup-bpm-records.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 BpmRecord 현황 조회 중...\n');

  const total = await prisma.bpmRecord.count();
  const orphaned = await prisma.bpmRecord.count({ where: { sessionId: null } });

  // sessionId 기준으로 중복된 레코드 파악
  const grouped = await prisma.$queryRaw<{ sessionId: string; cnt: bigint }[]>`
    SELECT "sessionId", COUNT(*) as cnt
    FROM "bpm_records"
    WHERE "sessionId" IS NOT NULL
    GROUP BY "sessionId"
    HAVING COUNT(*) > 1
  `;

  const duplicateSessionCount = grouped.length;
  const duplicateRecordCount  = grouped.reduce((acc, r) => acc + Number(r.cnt) - 1, 0);

  console.log(`전체 BpmRecord: ${total}개`);
  console.log(`고아 레코드 (sessionId=NULL): ${orphaned}개`);
  console.log(`중복이 있는 세션: ${duplicateSessionCount}개 (삭제될 레코드 ${duplicateRecordCount}개)\n`);

  if (orphaned === 0 && duplicateSessionCount === 0) {
    console.log('✅ 정리할 데이터가 없습니다.');
    return;
  }

  // ── 1. 고아 레코드 삭제 (세션이 삭제되어 sessionId가 NULL이 된 것) ──
  if (orphaned > 0) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM "bpm_records" WHERE "sessionId" IS NULL
    `;
    console.log(`🗑️  고아 레코드 ${deleted}개 삭제 완료`);
  }

  // ── 2. 중복 레코드 삭제 (sessionId당 최신 1개만 남김) ──
  if (duplicateSessionCount > 0) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM "bpm_records"
      WHERE ("id", "recordedAt") NOT IN (
        SELECT DISTINCT ON ("sessionId") id, "recordedAt"
        FROM "bpm_records"
        WHERE "sessionId" IS NOT NULL
        ORDER BY "sessionId", "recordedAt" DESC
      )
      AND "sessionId" IS NOT NULL
    `;
    console.log(`🗑️  중복 레코드 ${deleted}개 삭제 완료`);
  }

  const after = await prisma.bpmRecord.count();
  console.log(`\n✅ 완료. BpmRecord: ${total}개 → ${after}개`);
}

main()
  .catch((e) => { console.error('❌ 오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
