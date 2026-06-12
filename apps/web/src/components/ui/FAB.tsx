import { useNavigate } from 'react-router-dom';

interface FABProps {
  /** 클릭 시 이동할 경로 (기본값: /practice/new) */
  to?: string;
  onClick?: () => void;
}

export function FAB({ to = '/practice/new', onClick }: FABProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    navigate(to);
  };

  return (
    <button
      onClick={handleClick}
      aria-label="연습 기록하기"
      className={[
        'md:hidden fixed z-50',
        'bottom-[68px]',            /* 탭 바(60px) + 여백 8px */
        'left-1/2 -translate-x-1/2',
        'w-14 h-14 rounded-full',
        'bg-primary text-white',
        'shadow-fab',
        'flex items-center justify-center',
        'active:scale-90 hover:bg-primary-dark',
        'transition-all duration-150',
      ].join(' ')}
    >
      {/* Plus 아이콘 */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  );
}
