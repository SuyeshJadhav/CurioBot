import { useCurio } from '../../contexts/CurioContext';

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
  } = useCurio();

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Title */}
      <h2 className="section-title">Discover</h2>
      <p className="section-sub">Generate a new article or browse by topic area</p>

      {/* Start exploration form */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '1.5px solid var(--outline-variant)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--ink-charcoal)', margin: '0 0 8px', fontFamily: 'var(--font-headline)' }}>
          ✨ Start a New Exploration
        </h3>
        <p className="card-body" style={{ marginBottom: '16px', fontSize: '12.5px', color: 'var(--ink-wash)' }}>
          Type a topic or concept you're curious about, and our agent swarm will research and write a personalized article for you.
        </p>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const target = e.currentTarget;
          const topicVal = (target.elements.namedItem('topic') as HTMLInputElement).value;
          const hintVal = (target.elements.namedItem('hint') as HTMLInputElement).value;
          const combinedHint = [topicVal.trim(), hintVal.trim()].filter(Boolean).join(' - ');
          igniteQuest(topicVal.trim() || undefined, combinedHint || undefined);
        }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              name="topic"
              type="text" 
              placeholder="e.g. Quantum Computing (or leave blank for a random topic matching interests)..." 
              style={{ 
                flex: 1, 
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border-secondary)',
                outline: 'none',
                background: 'var(--color-background-secondary)'
              }}
            />
            <button 
              type="submit"
              className="filter-btn on"
              style={{ 
                fontSize: '13px', 
                padding: '8px 20px', 
                borderRadius: 'var(--border-radius-md)', 
                cursor: 'pointer',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              ✦ Ignite
            </button>
          </div>
          <input 
            name="hint"
            type="text" 
            placeholder="Add an optional guide/hint (e.g. focus on history, explain to a beginner...)" 
            style={{ 
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-border-tertiary)',
              outline: 'none',
              background: 'var(--color-background-primary)',
              opacity: 0.8
            }}
          />
        </form>
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
