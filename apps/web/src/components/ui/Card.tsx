import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 탭 가능한 카드 (hover/active 효과) */
  clickable?: boolean;
  /** 파스텔 블루 배경 강조 */
  highlighted?: boolean;
  padding?: 'none' | 'sm' | 'md';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      clickable = false,
      highlighted = false,
      padding = 'md',
      children,
      className = '',
      ...props
    },
    ref,
  ) => {
    const padClass = { none: '', sm: 'p-3', md: 'p-4' }[padding];

    return (
      <div
        ref={ref}
        className={[
          'rounded-card bg-white shadow-card',
          padClass,
          highlighted ? 'bg-primary-pale border border-primary-light/30' : '',
          clickable
            ? 'cursor-pointer active:scale-[0.98] transition-transform duration-100 hover:shadow-card-hover'
            : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

/* 카드 내부 구조 서브컴포넌트 */
export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-md font-semibold text-slate-900 ${className}`}>
      {children}
    </p>
  );
}

export function CardDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-slate-100 my-3 ${className}`} />;
}
