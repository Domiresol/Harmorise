/**
 * SongSelector
 * 연습 기록 작성/수정 화면에서 사용하는 곡 검색 + 선택 컴포넌트.
 *
 * - 입력 중 300ms debounce로 GET /songs?q= 호출
 * - 기존 곡 선택 시 onSelect(song) 콜백
 * - 목록에 없으면 현재 입력값을 새 곡으로 사용 (onNewSong)
 */
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';

export interface SongOption {
  id:        string;
  title:     string;
  artist:    string | null;
  targetBpm: number | null;
}

interface Props {
  /** 현재 선택/입력된 곡명 */
  value: string;
  /** 텍스트 변경 (직접 입력 포함) */
  onChange: (title: string) => void;
  /** 기존 곡 선택 시 — targetBpm 자동 주입용 */
  onSelect: (song: SongOption) => void;
}

export function SongSelector({ value, onChange, onSelect }: Props) {
  const [options, setOptions]   = useState<SongOption[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef              = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // debounce 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      // 빈 입력 → 최근 곡 목록
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await apiFetch<SongOption[]>('/songs');
          setOptions(data);
        } catch { setOptions([]); }
        finally { setLoading(false); }
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SongOption[]>(`/songs?q=${encodeURIComponent(value.trim())}`);
        setOptions(data);
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleFocus = () => setOpen(true);

  const handleSelect = (song: SongOption) => {
    onChange(song.title);
    onSelect(song);
    setOpen(false);
  };

  const showDropdown = open && (options.length > 0 || loading);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        placeholder="곡명 검색 또는 직접 입력"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
      />

      {showDropdown && (
        <div className="absolute z-50 w-full top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {loading && (
            <p className="text-xs text-slate-400 text-center py-3">검색 중...</p>
          )}
          {!loading && options.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3">검색 결과 없음</p>
          )}
          {!loading && options.map(song => (
            <button
              key={song.id}
              type="button"
              onMouseDown={() => handleSelect(song)}   // mousedown: blur 전에 실행
              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <p className="text-sm font-medium text-slate-900">{song.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {song.artist ?? '아티스트 미등록'}
                {song.targetBpm ? ` · 목표 ${song.targetBpm} BPM` : ''}
              </p>
            </button>
          ))}
          {/* 현재 입력값이 기존 곡과 완전히 일치하지 않을 때 "새 곡으로 등록" 안내 */}
          {!loading && value.trim().length > 0 &&
            !options.some(s => s.title.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="px-4 py-2.5 bg-primary-pale">
              <p className="text-xs text-primary font-medium">
                ✚ "{value.trim()}" 새 곡으로 등록
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
