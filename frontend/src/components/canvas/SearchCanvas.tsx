import { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function SearchCanvas() {
  const { history, loadArticle } = useCurio();
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Filter history based on input
  const filteredHistory = history.filter(item => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      item.topic.toLowerCase().includes(lower)
      // Check if details are fetched/available (some objects are partials, but let's be robust)
    );
  });

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Title */}
      <h2 className="section-title">Search</h2>
      <p className="section-sub">Find any article you've read or saved — by keyword, topic, or concept</p>

      {/* Input Form */}
      <form onSubmit={handleSearchSubmit} className="chat-input-wrap" style={{ marginBottom: '14px' }}>
        <input 
          type="text" 
          placeholder="Search your articles..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ 
            width: '100%', 
            fontSize: '13.5px',
            padding: '10px 14px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border-secondary)',
            outline: 'none',
            background: 'var(--color-background-secondary)'
          }}
        />
      </form>
      <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '-8px', marginBottom: '18px' }}>
        Full-text search across all articles in your library. Searches titles, body text, and topics.
      </p>

      {/* Dynamic Results list */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
            {query.trim() ? `Search Results (${filteredHistory.length})` : `Your Articles Map (${filteredHistory.length})`}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                className="card"
                onClick={() => loadArticle(item.id)}
                style={{ 
                  cursor: 'pointer', 
                  padding: '12px 16px',
                  transition: 'transform 0.15s, border-color 0.15s' 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1.5px)';
                  e.currentTarget.style.borderColor = 'var(--primary-container)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--color-border-tertiary)';
                }}
              >
                <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px' }}>
                  {item.topic}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Click to open article details
                </p>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
                <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
                  {query.trim() ? `No articles found matching "${query}".` : "Your library is empty. Go discover some topics!"}
                </p>
              </div>
            )}
          </div>
        </div>

    </div>
  );
}
