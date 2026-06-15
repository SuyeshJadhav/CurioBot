import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { usePreferences } from '../../contexts/UserPreferencesContext';
import { QuickQuestForm } from '../home/QuickQuestForm';
import { HomeMetrics } from '../home/HomeMetrics';
import { SuggestedReads } from '../home/SuggestedReads';
import { RecentNotes } from '../home/RecentNotes';

export function HomeCanvas() {
  const { changeTab, user } = useAuth();
  const { history, loadArticle, igniteQuest, isLoadingHistory } = usePipeline();
  const { savedSketches, loadSavedSketches, updateSketchNotes } = useLibrary();
  const { interests } = usePreferences();
  const isLoadingUserData = isLoadingHistory;

  useEffect(() => {
    loadSavedSketches();
  }, [loadSavedSketches]);

  return (
    <div style={{ padding: '1rem 2rem 1.5rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />

      {/* Page header */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--ink-charcoal)',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          Home
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--ink-wash)',
          margin: 0,
        }}>
          Your reading dashboard.
        </p>
      </div>

      {/* Quick Quest Form */}
      <QuickQuestForm igniteQuest={igniteQuest} />

      {/* Metrics display */}
      <HomeMetrics
        isLoadingUserData={isLoadingUserData}
        historyLength={history.length}
        savedSketchesLength={savedSketches.length}
      />

      {/* Daily Spark Suggested Reads */}
      <SuggestedReads
        user={user}
        interests={interests}
        igniteQuest={igniteQuest}
      />

      {/* Recent Field Notes */}
      <RecentNotes
        isLoadingUserData={isLoadingUserData}
        savedSketches={savedSketches}
        loadArticle={loadArticle}
        updateSketchNotes={updateSketchNotes}
        changeTab={changeTab}
      />
    </div>
  );
}
