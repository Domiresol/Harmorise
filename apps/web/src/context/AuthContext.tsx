import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';

// ── 타입 정의 ──────────────────────────────────────────────────
export interface UserProfile {
  nickname:          string;
  profileImageUrl:   string | null;
  mainInstrumentId:  string | null;
  dailyGoalMinutes:  number;
  weeklyGoalMinutes: number;
  mainInstrument:    { id: string; name: string } | null;
}

export interface UserCharacter {
  level:         number;
  exp:           number;
  characterType: 'HUMAN' | 'ANIMAL' | 'ROBOT';
}

export interface UserStreak {
  currentStreak:   number;
  longestStreak:   number;
  lastPracticedAt: string | null;
}

export interface AuthUser {
  id:           string;
  email:        string;
  phone:        string | null;
  role:         string;
  createdAt:    string;
  profile:      UserProfile | null;
  subscription: { plan: 'FREE' | 'PREMIUM'; expiresAt: string | null } | null;
  character:    UserCharacter | null;
  streak:       UserStreak | null;
}

interface AuthContextValue {
  user:        AuthUser | null;
  token:       string | null;
  isLoading:   boolean;
  isLoggedIn:  boolean;
  login:       (accessToken: string) => Promise<void>;
  logout:      () => void;
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'harmorise_token';

// ── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (t: string) => {
    try {
      const data = await apiFetch<AuthUser>('/users/me', { token: t });
      setUser(data);
    } catch {
      // 토큰 만료 or 오류 → 로그아웃
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  // 앱 초기 로드 시 토큰 있으면 유저 정보 가져오기
  useEffect(() => {
    if (token) {
      fetchUser(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (accessToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    await fetchUser(accessToken);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) await fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isLoggedIn: !!user,
      login, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
