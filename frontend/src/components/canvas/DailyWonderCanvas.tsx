import { useEffect } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function DailyWonderCanvas() {
  const {
    dailyWonder,
    isGeneratingWonder,
    loadDailyWonder,
    generateDailyWonder,
  } = useCurio();

  useEffect(() => {
    loadDailyWonder();
  }, [loadDailyWonder]);

  if (isGeneratingWonder) {
    return (
      <div className="hero-stage">
        <div className="noise-overlay" />
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

          <p
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: 'var(--ink-charcoal)',
              marginBottom: '0.5rem',
            }}
          >
            Orchestrating today's wonder...
          </p>
          <p className="font-hand" style={{ fontSize: '1.1rem', color: 'var(--tertiary)' }}>
            Agents are scanning Wikipedia and Tavily searches...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto' }}>
      <div className="noise-overlay" />

      {/* Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--ink-sepia)',
            marginBottom: '0.5rem',
          }}
        >
          💡 The Daily Wonder
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--ink-wash)',
          }}
        >
          A single, handpicked mystery generated every single day to expand your horizons.
        </p>
      </div>

      {dailyWonder ? (
        <div
          className="paper-shadow sketch-border"
          style={{
            background: 'var(--surface-cream)',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'flex-start',
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-hand)',
              fontSize: '1.1rem',
              color: 'var(--secondary)',
              background: 'rgba(254,203,203,0.22)',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              border: '1.5px solid var(--secondary-container)',
            }}
          >
            Today's Exploration ( {new Date(dailyWonder.publish_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} )
          </div>

          <div>
            <h3
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--ink-charcoal)',
                marginBottom: '0.5rem',
              }}
            >
              {dailyWonder.topic}
            </h3>
            
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary)',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              Domain: {dailyWonder.domain}
            </span>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.1rem',
              lineHeight: 1.7,
              color: 'var(--ink-charcoal)',
              margin: 0,
            }}
          >
            "{dailyWonder.summary}"
          </p>

          {dailyWonder.article_id && (
            <button
              className="new-quest-btn"
              style={{ width: 'auto', padding: '0.75rem 1.5rem', marginTop: '1rem' }}
              onClick={() => dailyWonder.article_id && generateDailyWonder() /* This will reload/open the cached article */}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                book
              </span>
              Open Field Log
            </button>
          )}
        </div>
      ) : (
        <div
          className="paper-shadow sketch-border"
          style={{
            background: 'var(--surface-cream)',
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            animation: 'fadeInUp 0.4s ease',
          }}
        >
          <div
            className="ignite-btn"
            style={{ width: '100px', height: '100px', cursor: 'pointer' }}
            onClick={generateDailyWonder}
          >
            <div className="ignite-inner">
              <span className="material-symbols-outlined ignite-icon" style={{ fontSize: '2.2rem !important' }}>
                colors_spark
              </span>
            </div>
          </div>

          <div style={{ maxWidth: '460px' }}>
            <h3
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--ink-charcoal)',
                marginBottom: '0.5rem',
              }}
            >
              The day is fresh, the path uncharted...
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-hand)',
                fontSize: '1.2rem',
                color: 'var(--ink-wash)',
                margin: 0,
              }}
            >
              Today's wonder has not been ignited yet. Let the supervisor agent pick and write a daily exploration for you now!
            </p>
          </div>

          <button
            className="new-quest-btn"
            style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
            onClick={generateDailyWonder}
          >
            ✨ Ignite Today's Wonder
          </button>
        </div>
      )}
    </div>
  );
}
