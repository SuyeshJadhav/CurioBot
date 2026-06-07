import { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function SearchCanvas() {
  const { history, loadArticle } = useCurio();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'multitask',
    'memory consolidation',
    'trauma'
  ]);

  const handleSearchSelect = (term: string) => {
    setQuery(term);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches(prev => [query.trim(), ...prev.slice(0, 4)]);
    }
  };

  // Filter history based on input
  const filteredHistory = history.filter(item => {
    if (!query.trim()) return false;
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
      {query.trim() !== '' && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Search Results ({filteredHistory.length})
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              <div style={{ textAlign: 'center', padding: '24px 0', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
                <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
                  No articles found matching "{query}".
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="divider" />

      {/* Recent Searches */}
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Recent searches
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {recentSearches.map((term, i) => (
          <div 
            key={`${term}-${i}`} 
            className="recent-item" 
            onClick={() => handleSearchSelect(term)}
            style={{ padding: '6px 8px' }}
          >
            <i className="ti ti-clock" style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginRight: '6px' }} aria-hidden="true"></i>
            <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>{term}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
