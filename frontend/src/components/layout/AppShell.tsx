// AppShell — Root layout component.
// Composes LeftSidebar, TutorSidebar, and coordinates the active content panes.
// If an activeArticleId is set, it renders the ArticleReaderCanvas in full focus mode.

import { useCurio } from '../../contexts/CurioContext';
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

export function AppShell() {
  const { token, user, activeTab, activeArticleId, isGeneratingArticle, userSettings, history } = useCurio();

  // Gate the application with AuthPage if the user is not logged in
  if (!token || !user) {
    return <AuthPage />;
  }

  const showOnboarding = userSettings && !userSettings.onboarding_complete && history.length === 0;

  return (
    <>
      {/* Shown only on mobile via CSS media query */}
      <MobileHeader />

      <div className="app-shell">
        <LeftSidebar />

        <main className="main-content">
          {activeArticleId ? (
            <ArticleReaderCanvas />
          ) : isGeneratingArticle ? (
            <IgniteCanvas />
          ) : (
            <>
              {activeTab === 'home' && <HomeCanvas />}
              {activeTab === 'discover' && <DiscoverCanvas />}
              {activeTab === 'search' && <SearchCanvas />}
              {activeTab === 'library' && <LibraryCanvas />}
              {activeTab === 'interests' && <InterestsCanvas />}
              {activeTab === 'settings' && <SettingsCanvas key={userSettings ? 'loaded' : 'loading'} />}
            </>
          )}
        </main>

        {(activeArticleId || isGeneratingArticle) && <TutorSidebar />}
      </div>

      {showOnboarding && <OnboardingModal />}
    </>
  );
}
