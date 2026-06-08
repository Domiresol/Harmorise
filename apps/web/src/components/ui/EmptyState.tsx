import { Button } from './Button';

interface EmptyStateProps {
  /** 이모지 또는 아이콘 */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
      {icon && (
        <div className="w-20 h-20 rounded-full bg-primary-pale flex items-center justify-center text-4xl mb-1">
          {icon}
        </div>
      )}
      <p className="text-md font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* ── 프리셋 ─────────────────────────────────────────────────── */

export function NoPracticeState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="🎸"
      title="아직 연습 기록이 없어요"
      description="첫 번째 연습을 기록해볼까요? 작은 기록이 큰 성장이 돼요."
      actionLabel="기록하기"
      onAction={onAction}
    />
  );
}

export function NoReportState() {
  return (
    <EmptyState
      icon="📊"
      title="리포트를 준비 중이에요"
      description="연습 데이터가 쌓이면 자동으로 생성돼요. 조금만 기다려주세요!"
    />
  );
}

export function NoBpmState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="🎵"
      title="BPM 기록이 없어요"
      description="연습 기록 시 BPM을 입력하면 성장 그래프가 여기에 나타나요."
      actionLabel="연습 기록하기"
      onAction={onAction}
    />
  );
}
