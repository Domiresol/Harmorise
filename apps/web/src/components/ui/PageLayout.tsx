import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
  /** 상단 타이틀 */
  title?: string;
  /** 뒤로가기 버튼 표시 */
  showBack?: boolean;
  /** 우측 액션 영역 */
  rightAction?: ReactNode;
  /** 하단 탭 바가 있는 페이지 (여백 자동 추가) */
  hasTabBar?: boolean;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  showBack = false,
  rightAction,
  hasTabBar = true,
  children,
  className = '',
}: PageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* 헤더 */}
      {(title || showBack || rightAction) && (
        <header className="flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-100 flex-shrink-0 safe-top">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-slate-600 active:opacity-60"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          {title && (
            <h1 className="flex-1 text-lg font-bold text-slate-900 truncate">
              {title}
            </h1>
          )}
          {rightAction && (
            <div className="flex items-center">{rightAction}</div>
          )}
        </header>
      )}

      {/* 스크롤 콘텐츠 영역 */}
      <main
        className={[
          'flex-1 overflow-y-auto hide-scrollbar',
          hasTabBar ? 'pb-[76px]' : 'pb-4', /* 탭 바(60px) + 여백 16px */
          'px-4 pt-4',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>
    </div>
  );
}
