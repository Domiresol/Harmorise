import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 상단 일러스트 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="text-7xl mb-6">🎵</div>
        <h1 className="text-3xl font-bold text-slate-800 text-center leading-tight">
          매일 조금씩,<br />실력이 쌓여요
        </h1>
        <p className="mt-4 text-slate-500 text-center text-sm leading-relaxed">
          연습 기록부터 BPM 성장 추적까지<br />나만의 음악 연습 파트너, Harmorise
        </p>

        {/* 특징 카드 3개 */}
        <div className="mt-10 w-full space-y-3 max-w-sm">
          {[
            { icon: '📊', title: '연습 기록 분석', desc: '매일 연습 시간과 곡별 BPM 성장을 한눈에' },
            { icon: '🔥', title: '스트릭 챌린지',  desc: '연속 연습 기록으로 습관을 만들어요' },
            { icon: '🎭', title: '내 캐릭터 성장',  desc: '연습할수록 캐릭터가 레벨업 돼요' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-12 space-y-3 max-w-sm mx-auto w-full">
        <button
          onClick={() => navigate('/signup')}
          className="w-full py-4 bg-sky-500 text-white rounded-2xl font-semibold text-base"
        >
          시작하기
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-4 border border-slate-200 text-slate-700 rounded-2xl font-semibold text-base"
        >
          이미 계정이 있어요
        </button>
      </div>
    </div>
  );
}
