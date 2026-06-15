interface HistoryTabProps {
  filter: 'all' | 'saved' | 'read' | 'topic';
  history: any[];
  savedSketches: any[];
  loadArticle: (id: string) => void;
  deleteArticle: (id: string) => void;
  formatDateLabel: (date?: Date | string) => string;
}

export function HistoryTab({
  filter,
  history,
  savedSketches,
  loadArticle,
  deleteArticle,
  formatDateLabel,
}: HistoryTabProps) {
  if (filter !== 'all' && filter !== 'read') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {history.map((entry) => {
        const isSaved = savedSketches.some(s => s.article_id === entry.id);
        return (
          <div 
            key={entry.id} 
            className="card"
            onClick={() => loadArticle(entry.id)}
            style={{ cursor: 'pointer', padding: '14px 16px', transition: 'transform 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1.5px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 className="card-title" style={{ margin: '0 0 4px', fontSize: '13px' }}>
                  {entry.topic}
                  {isSaved && <span style={{ fontSize: '10px', color: '#0F6E56', marginLeft: '8px', fontWeight: 'bold' }}>● Saved</span>}
                </h4>
                <p className="card-body" style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                  {entry.createdAt ? formatDateLabel(entry.createdAt) : ''}
                </p>
              </div>
              
              {/* Delete button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${entry.topic}"?`)) deleteArticle(entry.id);
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '4px' }}
                title="Delete permanently"
              >
                <i className="ti ti-trash" style={{ fontSize: '14px' }}></i>
              </button>
            </div>
          </div>
        );
      })}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
          <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
            No articles read yet.
          </p>
        </div>
      )}
    </div>
  );
}
