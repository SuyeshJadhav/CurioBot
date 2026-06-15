import { usePipeline } from '../../contexts/PipelineContext';

const BROWSE_TOPICS = [
  { label: 'Human behavior', class: 'tag-teal' },
  { label: 'Science', class: 'tag-purple' },
  { label: 'History', class: 'tag-amber' },
  { label: 'How things work', class: 'tag-teal' },
  { label: 'Food & culture', class: 'tag-purple' },
  { label: 'Money & power', class: 'tag-amber' },
];

export function DiscoverCanvas() {
  const {
    igniteQuest,
  } = usePipeline();

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Title */}
      <h2 className="section-title">Discover</h2>
      <p className="section-sub">Generate a new article or browse by topic area</p>

      {/* Start exploration form */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '1.5px solid var(--outline-variant)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 650, color: 'var(--ink-charcoal)', margin: '0 0 8px', fontFamily: 'var(--font-headline)' }}>
          I'm Feeling Lucky
        </h3>
        <p className="card-body" style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--ink-wash)' }}>
          Pick a random topic based on your interests and generate an article.
        </p>
        
        <button
          onClick={() => igniteQuest()}
          className="filter-btn on"
          style={{
            fontSize: '14px',
            padding: '10px 24px',
            borderRadius: 'var(--border-radius-md)',
            cursor: 'pointer',
            border: 'none',
            fontWeight: 600,
            margin: '0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(127, 119, 221, 0.2)'
          }}
        >
          <span>Surprise me</span>
        </button>
      </div>

      <hr className="divider" />

      {/* Browse Topics */}
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Browse by topic
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {BROWSE_TOPICS.map((topic) => (
          <span 
            key={topic.label}
            className={`tag ${topic.class}`}
            onClick={() => igniteQuest(topic.label)}
            style={{ 
              cursor: 'pointer', 
              padding: '6px 14px', 
              fontSize: '12px',
              borderRadius: '16px',
              border: '0.5px solid var(--color-border-tertiary)',
              transition: 'transform 0.15s, opacity 0.15s',
              marginTop: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1.5px)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {topic.label}
          </span>
        ))}
      </div>

    </div>
  );
}
