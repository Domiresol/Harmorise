type BadgeVariant =
  | 'streak'    // 스트리크 (틸 계열)
  | 'practice'  // 연습 유형 (스카이 블루)
  | 'unlock'    // 해금 완료 (초록)
  | 'premium'   // 프리미엄 전용 (앰버)
  | 'locked'    // 잠금 (회색)
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  streak:   'bg-accent-light text-teal-700',
  practice: 'bg-primary-pale text-primary-dark',
  unlock:   'bg-emerald-100 text-emerald-700',
  premium:  'bg-amber-100 text-amber-700',
  locked:   'bg-slate-100 text-slate-400',
  default:  'bg-slate-100 text-slate-600',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1',
        'px-2 py-0.5 rounded-pill',
        'text-xs font-semibold',
        variantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}

/* ── 스트리크 전용 뱃지 ───────────────────────────────────── */
export function StreakBadge({ count }: { count: number }) {
  return (
    <Badge variant="streak" className="text-sm px-3 py-1">
      🔥 {count}일
    </Badge>
  );
}

/* ── 연습 유형 뱃지 ─────────────────────────────────────── */
const PRACTICE_LABEL: Record<string, string> = {
  BASIC:         '기초 연습',
  SONG:          '곡 연습',
  IMPROVISATION: '즉흥 연주',
  THEORY:        '이론 학습',
};

export function PracticeTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="practice">{PRACTICE_LABEL[type] ?? type}</Badge>
  );
}
