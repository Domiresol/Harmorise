import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ──────────────────────────────────────────────────────────────
  // 1. 악기 마스터 데이터
  // ──────────────────────────────────────────────────────────────
  const instruments = [
    { name: '기타',           category: '현악기' },
    { name: '베이스',         category: '현악기' },
    { name: '피아노',         category: '건반' },
    { name: '드럼',           category: '타악기' },
    { name: '바이올린',       category: '현악기' },
    { name: '첼로',           category: '현악기' },
    { name: '우쿨렐레',       category: '현악기' },
    { name: '보컬',           category: '보컬' },
    { name: '플루트',         category: '관악기' },
    { name: '색소폰',         category: '관악기' },
    { name: '트럼펫',         category: '관악기' },
    { name: '기타(직접입력)', category: null },
  ];

  for (const inst of instruments) {
    await prisma.instrument.upsert({
      where:  { name: inst.name },
      update: {},
      create: inst,
    });
  }
  console.log(`✅ instruments: ${instruments.length}개 완료`);

  // ──────────────────────────────────────────────────────────────
  // 2. 캐릭터 아이템 마스터 데이터
  // ──────────────────────────────────────────────────────────────
  const characterItems = [
    // ── 기본 지급 (is_default: true) ──────────────────────────
    {
      code:            'hair_default',
      itemType:        'HAIR'       as const,
      name:            '기본 헤어',
      description:     '처음부터 주어지는 기본 헤어 스타일',
      isDefault:       true,
      isPremium:       false,
      sortOrder:       0,
    },
    {
      code:            'outfit_default',
      itemType:        'OUTFIT'     as const,
      name:            '기본 의상',
      description:     '처음부터 주어지는 기본 연습복',
      isDefault:       true,
      isPremium:       false,
      sortOrder:       0,
    },
    {
      code:            'bg_practice_room',
      itemType:        'BACKGROUND' as const,
      name:            '연습실',
      description:     '아늑한 개인 연습실 배경',
      isDefault:       true,
      isPremium:       false,
      sortOrder:       0,
    },

    // ── 스트리크 해금 아이템 ────────────────────────────────────
    {
      code:            'outfit_rock_001',
      itemType:        'OUTFIT'     as const,
      name:            '록 밴드 의상',
      description:     '무대를 장악할 록스타 스타일',
      unlockCondition: '7일 연속 연습',
      unlockStreak:    7,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       10,
    },
    {
      code:            'hair_messy_001',
      itemType:        'HAIR'       as const,
      name:            '록스타 헤어',
      description:     '자유분방한 록스타 헤어스타일',
      unlockCondition: '14일 연속 연습',
      unlockStreak:    14,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       11,
    },
    {
      code:            'bg_concert_hall',
      itemType:        'BACKGROUND' as const,
      name:            '콘서트홀',
      description:     '화려한 콘서트홀 무대 배경',
      unlockCondition: '30일 연속 연습',
      unlockStreak:    30,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       20,
    },

    // ── 레벨 해금 아이템 ────────────────────────────────────────
    {
      code:            'outfit_classical_001',
      itemType:        'OUTFIT'     as const,
      name:            '클래식 연주복',
      description:     '우아한 클래식 무대 의상',
      unlockCondition: '레벨 5 달성',
      unlockLevel:     5,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       30,
    },
    {
      code:            'accessory_headphones',
      itemType:        'ACCESSORY'  as const,
      name:            '헤드폰',
      description:     '프로 뮤지션의 상징, 스튜디오 헤드폰',
      unlockCondition: '레벨 10 달성',
      unlockLevel:     10,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       31,
    },
    {
      code:            'bg_studio',
      itemType:        'BACKGROUND' as const,
      name:            '녹음 스튜디오',
      description:     '전문 녹음 스튜디오 배경',
      unlockCondition: '레벨 15 달성',
      unlockLevel:     15,
      isDefault:       false,
      isPremium:       false,
      sortOrder:       40,
    },

    // ── 프리미엄 전용 아이템 ────────────────────────────────────
    {
      code:            'outfit_festival_001',
      itemType:        'OUTFIT'     as const,
      name:            '페스티벌 의상',
      description:     '화려한 뮤직 페스티벌 의상 (PREMIUM 전용)',
      isDefault:       false,
      isPremium:       true,
      sortOrder:       100,
    },
    {
      code:            'bg_festival_stage',
      itemType:        'BACKGROUND' as const,
      name:            '페스티벌 무대',
      description:     '대형 야외 페스티벌 무대 배경 (PREMIUM 전용)',
      isDefault:       false,
      isPremium:       true,
      sortOrder:       101,
    },
  ];

  for (const item of characterItems) {
    await prisma.characterItem.upsert({
      where:  { code: item.code },
      update: {},
      create: item,
    });
  }
  console.log(`✅ character_items: ${characterItems.length}개 완료`);

  console.log('🎉 Seeding 완료!');
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
