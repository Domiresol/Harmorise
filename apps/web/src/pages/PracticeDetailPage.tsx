import { useEffect, useState }    from 'react';
import { useNavigate, useParams }  from 'react-router-dom';
import { PageLayout }              from '../components/ui/PageLayout';
import { Card, CardDivider }       from '../components/ui/Card';
import { Button }                  from '../components/ui/Button';
import { PracticeTypeBadge }       from '../components/ui/Badge';
import {
  usePracticeSessions,
  type PracticeSession,
} from '../hooks/usePracticeSessions';

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export function PracticeDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { getSession, deleteSession } = usePracticeSessions();

  const [rec, setRec]                       = useState<PracticeSession | null>(null);
  const [loadingRec, setLoadingRec]         = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  // 세션 로드
  useEffect(() => {
    if (!id) return;
    setLoadingRec(true);
    getSession(id)
      .then(setRec)
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoadingRec(false));
  }, [id, getSession]);

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteSession(id);
      navigate('/practice');
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
      setDeleting(false);
    }
  };

  // ── 로딩 상태 ────────────────────────────────────────────
  if (loadingRec) {
    return (
      <PageLayout title="연습 기록 상세" showBack>
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-20 bg-slate-100 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (loadError || !rec) {
    return (
      <PageLayout title="연습 기록 상세" showBack>
        <p className="text-center text-slate-400 py-12">
          {loadError ?? '기록을 찾을 수 없어요'}
        </p>
      </PageLayout>
    );
  }

  const displayDate = (() => {
    const d = new Date(rec.practicedAt);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  })();

  return (
    <PageLayout title="연습 기록 상세" showBack>
      <div className="flex flex-col gap-4 pb-6">

        {/* ── 기본 정보 카드 ───────────────────────────────── */}
        <Card highlighted>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">{displayDate}</p>
              <p className="text-xl font-bold text-slate-900">
                {rec.songTitle || '자유 연습'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{rec.durationMinutes}</p>
              <p className="text-xs text-slate-400">분</p>
            </div>
          </div>

          {rec.practiceTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {rec.practiceTypes.map((t) => (
                <PracticeTypeBadge key={t} type={t} />
              ))}
            </div>
          )}

          <CardDivider />

          <div className="grid grid-cols-2 gap-3 pt-1">
            {rec.instrumentName && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">악기</p>
                <p className="text-sm font-semibold text-slate-800">{rec.instrumentName}</p>
              </div>
            )}
            {rec.bpm && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">달성 BPM</p>
                <p className="text-sm font-semibold text-slate-800">{rec.bpm} BPM</p>
              </div>
            )}
            {rec.targetBpm && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">목표 BPM</p>
                <p className="text-sm font-semibold text-slate-800">
                  {rec.targetBpm} BPM
                  {rec.bpm && (
                    <span className="ml-1 text-xs font-normal text-primary">
                      ({Math.min(Math.round((rec.bpm / rec.targetBpm) * 100), 100)}%)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ── 메모 ─────────────────────────────────────────── */}
        {rec.memos.length > 0 && (
          <Card>
            <p className="text-sm font-bold text-slate-800 mb-2">메모</p>
            {rec.memos.map((m) => (
              <p
                key={m.id}
                className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap"
              >
                {m.content}
              </p>
            ))}
          </Card>
        )}

        {/* ── BPM 성장 플레이스홀더 ────────────────────────── */}
        {rec.bpm && rec.songTitle && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">BPM 성장 추이</p>
              <button
                onClick={() => navigate('/bpm')}
                className="text-xs text-primary font-medium"
              >
                자세히 보기
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center py-2">
              같은 곡의 기록이 쌓이면 성장 그래프가 표시됩니다
            </p>
          </Card>
        )}

        {/* ── 액션 버튼 ────────────────────────────────────── */}
        <div className="flex gap-3 mt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate(`/practice/${rec.id}/edit`)}
          >
            수정
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowDeleteConfirm(true)}
          >
            삭제
          </Button>
        </div>

        {/* ── 삭제 확인 다이얼로그 ─────────────────────────── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="w-full max-w-[767px] mx-auto bg-white rounded-t-3xl p-6">
              <p className="text-lg font-bold text-slate-900 mb-2">기록을 삭제할까요?</p>
              <p className="text-sm text-slate-500 mb-6">삭제된 기록은 복구할 수 없어요.</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  loading={deleting}
                  onClick={handleDelete}
                >
                  삭제
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageLayout>
  );
}
