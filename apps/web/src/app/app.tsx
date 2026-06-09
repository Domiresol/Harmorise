import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider }  from '../context/AuthContext';
import { PrivateRoute }  from '../components/ui/PrivateRoute';
import { AdminRoute }    from '../components/AdminRoute';
import { BottomTabBar }  from '../components/ui/BottomTabBar';
import { FAB }           from '../components/ui/FAB';

// Admin Pages
import { AdminLayout }        from '../pages/admin/AdminLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUsersPage }     from '../pages/admin/AdminUsersPage';

// Pages — 인증 (공개)
import { LandingPage }       from '../pages/LandingPage';
import { LoginPage }         from '../pages/LoginPage';
import { SignupPage }        from '../pages/SignupPage';
import { FindIdPage }        from '../pages/FindIdPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

// Pages — 메인 탭 (보호)
import { OnboardingPage }   from '../pages/OnboardingPage';
import { HomePage }         from '../pages/HomePage';
import { PracticeListPage } from '../pages/PracticeListPage';
import { PracticeNewPage }  from '../pages/PracticeNewPage';
import { CalendarPage }     from '../pages/CalendarPage';
import { SettingsPage }     from '../pages/SettingsPage';
import { ReportPage }       from '../pages/ReportPage';

// Pages — 서브 (보호)
import { PracticeDetailPage }  from '../pages/PracticeDetailPage';
import { PracticeEditPage }    from '../pages/PracticeEditPage';
import { BPMListPage }         from '../pages/BPMListPage';
import { BPMDetailPage }       from '../pages/BPMDetailPage';
import { SongListPage }        from '../pages/SongListPage';
import { WeeklyReportPage }    from '../pages/WeeklyReportPage';
import { MonthlyReportPage }   from '../pages/MonthlyReportPage';
import { ProfileSettingsPage } from '../pages/ProfileSettingsPage';
import { AccountPage }         from '../pages/AccountPage';
import { MetronomePage }       from '../pages/MetronomePage';
import { TunerPage }           from '../pages/TunerPage';
// 커뮤니티
import { CommunityPage }      from '../pages/CommunityPage';
import { FriendsPage }        from '../pages/FriendsPage';
import { FriendSearchPage }   from '../pages/FriendSearchPage';
import { FriendProfilePage }  from '../pages/FriendProfilePage';
import { RoomsPage }          from '../pages/RoomsPage';
import { RoomDetailPage }     from '../pages/RoomDetailPage';
import { RoomNewPage }        from '../pages/RoomNewPage';
import { RoomSettingsPage }   from '../pages/RoomSettingsPage';

/** 하단 탭 바를 노출할 경로 */
const TAB_ROUTES = ['/home', '/practice', '/calendar', '/report', '/settings', '/bpm', '/community'];
/** FAB(연습 기록 추가)를 노출할 경로 — 커뮤니티·설정 제외 */
const FAB_ROUTES = ['/home', '/practice', '/calendar', '/report', '/bpm'];

function P({ children }: { children: React.ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}

function AppShell() {
  const location = useLocation();
  const showTab = TAB_ROUTES.some((r) => location.pathname === r);
  const showFab = FAB_ROUTES.some((r) => location.pathname === r);

  return (
    <div className="flex flex-col h-full">
      <Routes>
        {/* ── 공개 화면 ───────────────────────────────── */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/onboarding"     element={<P><OnboardingPage /></P>} />
        <Route path="/signup"         element={<SignupPage />} />
        <Route path="/find-id"        element={<FindIdPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── 보호 화면 — 메인 탭 ─────────────────────── */}
        <Route path="/home"     element={<P><HomePage /></P>} />
        <Route path="/practice" element={<P><PracticeListPage /></P>} />
        <Route path="/calendar" element={<P><CalendarPage /></P>} />
        <Route path="/report"   element={<P><ReportPage /></P>} />
        <Route path="/settings" element={<P><SettingsPage /></P>} />
        <Route path="/bpm"      element={<P><BPMListPage /></P>} />

        {/* ── 보호 화면 — 연습 기록 ───────────────────── */}
        <Route path="/practice/new"  element={<P><PracticeNewPage /></P>} />
        <Route path="/practice/:id"       element={<P><PracticeDetailPage /></P>} />
        <Route path="/practice/:id/edit" element={<P><PracticeEditPage /></P>} />

        {/* ── 보호 화면 — BPM ─────────────────────────── */}
        <Route path="/bpm/:songId"   element={<P><BPMDetailPage /></P>} />
        <Route path="/songs"         element={<P><SongListPage /></P>} />

        {/* ── 보호 화면 — 리포트 ──────────────────────── */}
        <Route path="/report/weekly/:id"  element={<P><WeeklyReportPage /></P>} />
        <Route path="/report/monthly/:id" element={<P><MonthlyReportPage /></P>} />

        {/* ── 보호 화면 — 설정 서브 ───────────────────── */}
        <Route path="/settings/profile" element={<P><ProfileSettingsPage /></P>} />
        <Route path="/settings/account" element={<P><AccountPage /></P>} />

        {/* ── 보호 화면 — 커뮤니티 ───────────────────── */}
        <Route path="/community"                          element={<P><CommunityPage /></P>} />
        <Route path="/community/friends"                  element={<P><FriendsPage /></P>} />
        <Route path="/community/friends/search"           element={<P><FriendSearchPage /></P>} />
        <Route path="/community/friends/:userId"          element={<P><FriendProfilePage /></P>} />
        <Route path="/community/rooms"                    element={<P><RoomsPage /></P>} />
        <Route path="/community/rooms/new"                element={<P><RoomNewPage /></P>} />
        <Route path="/community/rooms/:roomId"            element={<P><RoomDetailPage /></P>} />
        <Route path="/community/rooms/:roomId/settings"   element={<P><RoomSettingsPage /></P>} />

        {/* ── 보호 화면 — 연습 도구 ───────────────────── */}
        <Route path="/metronome" element={<P><MetronomePage /></P>} />
        <Route path="/tuner"     element={<P><TunerPage /></P>} />

        {/* ── Admin 화면 (ADMIN role 전용) ─────────────── */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index           element={<AdminDashboardPage />} />
          <Route path="users"    element={<AdminUsersPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      {showTab && <BottomTabBar />}
      {showFab && <FAB />}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
