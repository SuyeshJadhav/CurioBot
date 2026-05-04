// IgniteCanvas — The main content pane (centre column).
// Reads: article, currentTopic, isGenerating, igniteQuest from CurioContext.
//
// Renders three states:
//   1. IDLE    — hero screen with the animated Ignite button
//   2. LOADING — spinner overlay while LangGraph pipeline runs
//   3. ARTICLE — Markdown content from the writer node (via react-markdown)

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCurio } from '../../contexts/CurioContext';

// ── Pipeline step labels ──────────────────────────────────────
// Shows the user what the agent is doing while they wait.
const PIPELINE_STEPS = [
  { icon: 'lightbulb', label: 'Picking the perfect topic…' },
  { icon: 'travel_explore', label: 'Searching the web…' },
  { icon: 'auto_stories', label: 'Reading Wikipedia…' },
  { icon: 'edit_note', label: 'Writing your article…' },
];

export function IgniteCanvas() {
  const { article, currentTopic, isGenerating, igniteQuest } = useCurio();

  // ── Loading state ─────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="hero-stage">
        <div className="noise-overlay" />

        {/* Animated pipeline visualizer */}
        <div style={{ textAlign: 'center', maxWidth: '340px', width: '100%' }}>
          <div className="ignite-btn" style={{ cursor: 'default', margin: '0 auto 2rem' }}>
            <div className="ignite-ring-outer" />
            <div className="ignite-ring-inner" />
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
            fontSize: '1.1rem',
            color: 'var(--ink-charcoal)',
            marginBottom: '1.5rem',
          }}>
            Sparking curiosity…
          </p>

          {/* Step list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={step.label}
                className="paper-shadow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  background: 'var(--surface-cream)',
                  border: '1px solid var(--outline-variant)',
                  animation: `fadeInUp 0.4s ease ${i * 0.18}s both`,
                  opacity: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '1.1rem',
                    color: 'var(--tertiary)',
                    fontVariationSettings: "'FILL' 0",
                  }}
                >
                  {step.icon}
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-hand)',
                  color: 'var(--ink-charcoal)',
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Article state ─────────────────────────────────────────
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

        {/* Markdown article body */}
        <div className="prose-curio">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article}
          </ReactMarkdown>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
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
        <div className="ignite-ring-outer" />
        <div className="ignite-ring-inner" />
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
