// AppShell — Root layout component.
// Composes LeftSidebar, TutorSidebar, and coordinates the active content panes.
// If an activeArticleId is set, it renders the ArticleReaderCanvas in full focus mode.

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { usePreferences } from '../../contexts/UserPreferencesContext';
import { LeftSidebar } from '../sidebar/LeftSidebar';
import { LibraryCanvas } from '../canvas/LibraryCanvas';
import { SettingsCanvas } from '../canvas/SettingsCanvas';
import { TutorSidebar } from '../chat/TutorSidebar';
import { MobileHeader } from './MobileHeader';
import { AuthPage } from '../auth/AuthPage';
import { ArticleReaderCanvas } from '../canvas/ArticleReaderCanvas';
import { HomeCanvas } from '../canvas/HomeCanvas';
import { DiscoverCanvas } from '../canvas/DiscoverCanvas';
import { SearchCanvas } from '../canvas/SearchCanvas';
import { InterestsCanvas } from '../canvas/InterestsCanvas';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { IgniteCanvas } from '../canvas/IgniteCanvas';
import { AdminMetricsCanvas } from '../canvas/AdminMetricsCanvas';
import { AdminProtectedRoute } from '../auth/AdminProtectedRoute';
import { Routes, Route, useLocation } from 'react-router-dom';

export function AppShell() {
  const { token, user, activeTab, changeTab, isLoadingUserData } = useAuth();
  const { isGeneratingArticle, history } = usePipeline();
  const { userSettings } = usePreferences();
  const location = useLocation();

  useEffect(() => {
    const tabMap: Record<string, typeof activeTab> = {
      '/': 'home',
      '/discover': 'discover',
      '/search': 'search',
      '/library': 'library',
      '/interests': 'interests',
      '/settings': 'settings'
    };
    const mappedTab = tabMap[location.pathname];
    if (mappedTab && mappedTab !== activeTab) {
      changeTab(mappedTab);
    }
  }, [location.pathname, activeTab, changeTab]);

  // If restoring session from local storage, display a journal loader
  if (isLoadingUserData) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--surface-cream, #FAF6EE)',
        color: 'var(--ink-charcoal, #1C1917)',
        fontFamily: 'var(--font-headline, serif)'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="animate-spin" style={{
            fontSize: '24px',
            lineHeight: '1',
            animation: 'spin 1.5s linear infinite'
          }}>✦</div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--ink-wash, #57534E)' }}>
            IGNITING JOURNAL...
          </div>
        </div>
      </div>
    );
  }

  // Gate the application with AuthPage if the user is not logged in
  if (!token || !user) {
    return <AuthPage />;
  }

  const showOnboarding = userSettings && !userSettings.onboarding_complete && history.length === 0;
  
  const isArticlePath = location.pathname.startsWith('/article/');
  const isIgnitePath = location.pathname === '/ignite';
  const showTutorSidebar = isArticlePath || isIgnitePath || isGeneratingArticle;

  return (
    <>
      {/* Shown only on mobile via CSS media query */}
      <MobileHeader />

      <div className="app-shell">
        <LeftSidebar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomeCanvas />} />
            <Route path="/discover" element={<DiscoverCanvas />} />
            <Route path="/search" element={<SearchCanvas />} />
            <Route path="/library" element={<LibraryCanvas />} />
            <Route path="/interests" element={<InterestsCanvas />} />
            <Route path="/settings" element={<SettingsCanvas key={userSettings ? 'loaded' : 'loading'} />} />
            <Route path="/ignite" element={<IgniteCanvas />} />
            <Route path="/article/:id" element={<ArticleReaderCanvas />} />
            <Route 
              path="/admin/metrics" 
              element={
                <AdminProtectedRoute>
                  <AdminMetricsCanvas />
                </AdminProtectedRoute>
              } 
            />
          </Routes>
        </main>

        {showTutorSidebar && <TutorSidebar />}
      </div>

      {showOnboarding && <OnboardingModal />}
    </>
  );
}
