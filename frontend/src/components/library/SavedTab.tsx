import { useState } from 'react';

interface SavedTabProps {
  filter: 'all' | 'saved' | 'read' | 'topic';
  savedSketches: any[];
  loadArticle: (id: string) => void;
  deleteSavedSketch: (id: string) => void;
  updateSketchNotes: (id: string, notes: string) => void;
}

export function SavedTab({
  filter,
  savedSketches,
  loadArticle,
  deleteSavedSketch,
  updateSketchNotes,
}: SavedTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  if (filter !== 'saved') return null;

  const handleNotesSave = (articleId: string) => {
    updateSketchNotes(articleId, tempNotes);
    setEditingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {savedSketches.map((sketch) => (
        <div key={sketch.id} className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ cursor: 'pointer', minWidth: 0, flex: 1 }} onClick={() => loadArticle(sketch.article_id)}>
              <h3 className="card-title" style={{ fontSize: '13.5px', marginBottom: '4px' }}>
                {sketch.articles.title}
              </h3>
              <span className="tag tag-teal" style={{ fontSize: '10px', marginTop: 0 }}>
                {sketch.articles.domain}
              </span>
            </div>
            
            <button 
              onClick={() => deleteSavedSketch(sketch.article_id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--secondary)', padding: '4px' }}
              title="Remove from saved"
            >
              <i className="ti ti-bookmark-filled" style={{ fontSize: '15px' }}></i>
            </button>
          </div>

          {sketch.articles.summary && (
            <p className="card-body" style={{ fontStyle: 'italic', margin: '8px 0', fontSize: '12px' }}>
              "{sketch.articles.summary}"
            </p>
          )}

          {/* Notes box */}
          <div style={{ background: 'rgba(116, 89, 68, 0.02)', border: '0.5px dashed var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px 12px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--tertiary)', textTransform: 'uppercase' }}>
                Field Notes
              </span>
              {editingId !== sketch.article_id && (
                <button
                  onClick={() => {
                    setEditingId(sketch.article_id);
                    setTempNotes(sketch.notes || '');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '10px', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Edit Notes
                </button>
              )}
            </div>

            {editingId === sketch.article_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  style={{ 
                    width: '100%', 
                    height: '60px', 
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-border-secondary)',
                    outline: 'none',
                    background: 'var(--color-background-primary)',
                    resize: 'none'
                  }}
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Write down any notes or summaries of your own..."
                />
                <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end' }}>
                  <button 
                    className="filter-btn on" 
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
                    onClick={() => handleNotesSave(sketch.article_id)}
                  >
                    Save
                  </button>
                  <button 
                    className="filter-btn" 
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: sketch.notes ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', margin: 0 }}>
                {sketch.notes || 'No annotations added yet. Write some notes to capture your ideas!'}
              </p>
            )}
          </div>

        </div>
      ))}

      {savedSketches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
          <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
            No saved sketches found.
          </p>
        </div>
      )}
    </div>
  );
}
