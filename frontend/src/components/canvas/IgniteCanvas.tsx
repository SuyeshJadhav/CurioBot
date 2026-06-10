// IgniteCanvas — The main content pane (centre column).
// Reads: article, currentTopic, isGenerating, igniteQuest from CurioContext.
//
// Renders three states:
//   1. IDLE    — hero screen with the animated Ignite button
//   2. LOADING — spinner overlay while LangGraph pipeline runs
//   3. ARTICLE — Markdown content from the writer node (via react-markdown)

import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ── Pipeline step labels ──────────────────────────────────────
// Shows the user what the agent is doing while they wait.
const PIPELINE_STEPS = [
  { icon: 'lightbulb', label: 'Picking the perfect topic…' },
  { icon: 'travel_explore', label: 'Searching the web…' },
  { icon: 'auto_stories', label: 'Reading Wikipedia…' },
  { icon: 'edit_note', label: 'Writing your article…' },
];

export function IgniteCanvas() {
  const {
    article, currentTopic, currentArticleId, isGeneratingArticle,
    generationStatus, igniteQuest,
  } = usePipeline();
  const { savedSketches, toggleSaveArticle, libraryCollections, addArticleToCollection } = useLibrary();

  // Helper to determine step status
  const getStepState = (index: number, currentStatus: string | null): 'completed' | 'active' | 'pending' => {
    if (!currentStatus) return index === 0 ? 'active' : 'pending';
    const statusOrder = ['picking_topic', 'researching', 'reading_wiki', 'writing_article'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    if (currentIndex < 0) return index === 0 ? 'active' : 'pending';
    if (currentIndex > index) return 'completed';
    if (currentIndex === index) return 'active';
    return 'pending';
  };

  // ── Loading state ─────────────────────────────────────────
  if (isGeneratingArticle) {
    return (
      <div className="hero-stage">
        <div className="noise-overlay" />
        <style>{`
          @keyframes pulse-icon {
            0% { transform: scale(0.95); opacity: 0.8; }
            100% { transform: scale(1.1); opacity: 1; }
          }
        `}</style>

        {/* Animated pipeline visualizer */}
        <div style={{ textAlign: 'center', maxWidth: '340px', width: '100%' }}>
          <div className="ignite-btn" style={{ cursor: 'default', margin: '0 auto 2rem' }}>
            <div className="ignite-inner">
              <span
                className="material-symbols-outlined ignite-icon"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  animation: 'spin 1.4s linear infinite',
                  fontSize: '2.5rem',
                }}
              >
                progress_activity
              </span>
            </div>
          </div>

          <p style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 600,
            fontSize: '1.25rem',
            color: 'var(--ink-charcoal)',
            marginBottom: '0.5rem',
          }}>
            {currentTopic ? `Researching: ${currentTopic}` : 'Sparking curiosity…'}
          </p>
          {currentTopic && (
            <p className="font-hand" style={{ fontSize: '1.05rem', color: 'var(--tertiary)', marginBottom: '1.5rem' }}>
              Weaving a new page into your journal...
            </p>
          )}

          {/* Step list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PIPELINE_STEPS.map((step, i) => {
              const stepState = getStepState(i, generationStatus);
              
              let iconName = step.icon;
              let iconColor = 'rgba(0,0,0,0.25)';
              let textColor = 'rgba(0,0,0,0.45)';
              let bg = 'var(--surface-cream)';
              let border = '1px solid var(--outline-variant)';
              let isPulsing = false;

              if (stepState === 'completed') {
                iconName = 'check_circle';
                iconColor = 'var(--primary)'; // Accent color
                textColor = 'rgba(0,0,0,0.5)';
                bg = 'rgba(174,198,207,0.12)';
                border = '1px solid var(--primary-container)';
              } else if (stepState === 'active') {
                iconColor = 'var(--tertiary)'; // active color
                textColor = 'var(--ink-charcoal)';
                bg = 'var(--surface-paper)';
                border = '2px solid var(--tertiary)';
                isPulsing = true;
              }

              return (
                <div
                  key={step.label}
                  className="paper-shadow"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '8px',
                    background: bg,
                    border: border,
                    transition: 'all 0.3s ease',
                    transform: isPulsing ? 'scale(1.025)' : 'scale(1)',
                    boxShadow: isPulsing ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '1.25rem',
                      color: iconColor,
                      fontVariationSettings: stepState === 'completed' ? "'FILL' 1" : "'FILL' 0",
                      animation: isPulsing ? 'pulse-icon 1s infinite alternate ease-in-out' : 'none',
                    }}
                  >
                    {iconName}
                  </span>
                  <span style={{
                    fontSize: '0.92rem',
                    fontFamily: isPulsing ? 'var(--font-headline)' : 'var(--font-hand)',
                    fontWeight: isPulsing ? 600 : 400,
                    color: textColor,
                    transition: 'all 0.3s ease',
                  }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Article state (Fallback / HMR check) ──────────────────
  if (article) {
    return (
      <article style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto' }}>
        <div className="noise-overlay" />

        {/* Topic tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.85rem',
          borderRadius: '999px',
          background: 'rgba(174,198,207,0.22)',
          border: '1px solid var(--primary-container)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-hand)',
          color: 'var(--primary)',
          marginBottom: '1.25rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bookmark</span>
          {currentTopic ?? 'Wonder'}
        </div>

        {/* Article title */}
        {currentTopic && (
          <h1 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--ink-charcoal)',
            lineHeight: 1.25,
            marginBottom: '1.5rem',
            marginTop: 0,
          }}>
            {currentTopic}
          </h1>
        )}

        {/* Markdown article body */}
        <div className="prose-curio">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article}
          </ReactMarkdown>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="new-quest-btn"
            style={{ width: 'auto', padding: '0.7rem 1.4rem' }}
            onClick={() => igniteQuest()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              electric_bolt
            </span>
            New Quest
          </button>

          {/* Save/Bookmark Sketch */}
          {currentArticleId && (
            <button
              className="new-quest-btn"
              style={{
                width: 'auto',
                padding: '0.7rem 1.4rem',
                borderColor: savedSketches.some(s => s.article_id === currentArticleId) ? 'var(--secondary)' : 'var(--outline-variant)',
                color: savedSketches.some(s => s.article_id === currentArticleId) ? 'var(--secondary)' : 'var(--ink-charcoal)',
                background: savedSketches.some(s => s.article_id === currentArticleId) ? 'rgba(254,203,203,0.18)' : 'transparent',
              }}
              onClick={() => toggleSaveArticle()}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '1rem',
                  fontVariationSettings: savedSketches.some(s => s.article_id === currentArticleId) ? "'FILL' 1" : "'FILL' 0"
                }}
              >
                {savedSketches.some(s => s.article_id === currentArticleId) ? 'bookmark_added' : 'bookmark'}
              </span>
              {savedSketches.some(s => s.article_id === currentArticleId) ? 'Saved Sketch' : 'Save Sketch'}
            </button>
          )}

          {/* Add to Library collection */}
          {currentArticleId && libraryCollections.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                className="new-quest-btn"
                style={{
                  width: 'auto',
                  padding: '0.7rem 1.4rem',
                  border: '2px dashed var(--outline-variant)',
                  color: 'var(--ink-charcoal)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
                defaultValue=""
                onChange={async (e) => {
                  const colId = e.target.value;
                  if (colId) {
                    await addArticleToCollection(colId, currentArticleId);
                    e.target.value = ""; // Reset dropdown
                  }
                }}
              >
                <option value="" disabled>📁 Add to Library...</option>
                {libraryCollections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="new-quest-btn"
            style={{
              width: 'auto',
              padding: '0.7rem 1.4rem',
              border: '2px dashed var(--outline-variant)',
              color: 'var(--ink-wash)',
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              arrow_upward
            </span>
            Back to top
          </button>
        </div>
      </article>
    );
  }

  // ── Idle / hero state ─────────────────────────────────────
  return (
    <div className="hero-stage">
      <div className="noise-overlay" />

      <div className="hero-title-wrap">
        <h2 className="hero-title">Welcome to your Journal</h2>
        <p className="hero-sub">
          What wonders shall we uncover today? The pages are blank, waiting for your curiosity.
        </p>
      </div>

      <button
        className="ignite-btn"
        aria-label="Ignite Curiosity"
        onClick={() => igniteQuest()}
      >
        <div className="ignite-inner">
          <span
            className="material-symbols-outlined ignite-icon"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '3rem' }}
          >
            colors_spark
          </span>
          <span className="ignite-label">✨ Ignite Curiosity</span>
        </div>
      </button>

      <div className="ignite-hint">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>draw</span>
        Ready when you are…
      </div>
    </div>
  );
}
