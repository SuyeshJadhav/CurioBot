// HistoryItem — A single past session entry in the left sidebar.
// Pure presentational — receives topic and onClick from LeftSidebar.

interface HistoryItemProps {
  topic: string;
  onClick: () => void;
  onDelete: () => void;
}

export function HistoryItem({ topic, onClick, onDelete }: HistoryItemProps) {
  return (
    <div
      className="history-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
        <span className="material-symbols-outlined" style={{ flexShrink: 0 }}>article</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--ink-wash)',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-wash)'}
        aria-label="Delete exploration"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
      </button>
    </div>
  );
}
