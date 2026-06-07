import { useState, useEffect } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function LibraryCanvas() {
  const {
    history,
    deleteArticle,
    savedSketches,
    deleteSavedSketch,
    updateSketchNotes,
    loadSavedSketches,
    libraryCollections,
    activeCollectionId,
    collectionArticles,
    loadLibrary,
    createCollection,
    loadCollectionArticles,
    setActiveCollectionId,
    loadArticle,
  } = useCurio();

  const [filter, setFilter] = useState<'all' | 'saved' | 'read' | 'topic'>('all');

  // Folder state
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');

  // Inline notes state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [now] = useState(() => new Date());

  useEffect(() => {
    loadLibrary();
    loadSavedSketches();
  }, [loadLibrary, loadSavedSketches]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    await createCollection(folderName, folderDesc);
    setFolderName('');
    setFolderDesc('');
    setShowAddFolder(false);
  };

  const handleFolderSelect = (collectionId: string) => {
    setActiveCollectionId(collectionId);
    loadCollectionArticles(collectionId);
  };

  const handleNotesSave = (articleId: string) => {
    updateSketchNotes(articleId, tempNotes);
    setEditingId(null);
  };

  // Helper to format dates
  const formatDateLabel = (dateInput?: Date | string) => {
    if (!dateInput) return 'Some time ago';
    const d = new Date(dateInput);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // ── Render By Topic Sub-View Folder ──────────────────────────
  if (filter === 'topic' && activeCollectionId) {
    const activeFolder = libraryCollections.find((c) => c.id === activeCollectionId);
    return (
      <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
        <div className="noise-overlay" />

        <button
          onClick={() => setActiveCollectionId(null)}
          className="nav-item active"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', padding: '6px 12px', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', marginBottom: '1.5rem', textDecoration: 'none' }}
        >
          <i className="ti ti-arrow-left"></i>
          <span>Back to Shelves</span>
        </button>

        <div style={{ marginBottom: '2rem' }}>
          <h2 className="section-title">📁 {activeFolder?.name || 'Library Folder'}</h2>
          <p className="section-sub">{activeFolder?.description || 'Browse your collections.'}</p>
        </div>

        {collectionArticles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {collectionArticles.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{ cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.15s' }}
                onClick={() => loadArticle(item.articles.id)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1.5px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <div>
                  <h4 className="card-title" style={{ margin: 0, fontSize: '13px' }}>
                    {item.articles.title}
                  </h4>
                  <span className="tag tag-teal" style={{ marginTop: '4px', fontSize: '10px' }}>
                    {item.articles.domain}
                  </span>
                </div>
                <i className="ti ti-chevron-right" style={{ color: 'var(--color-text-tertiary)' }}></i>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
            <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
              This library shelf is currently empty.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Header */}
      <h2 className="section-title">Library</h2>
      <p className="section-sub">All your articles in one place — saved, read, and by topic</p>

      {/* Filter Row */}
      <div className="filter-row">
        <button className={`filter-btn${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`filter-btn${filter === 'saved' ? ' on' : ''}`} onClick={() => setFilter('saved')}>Saved</button>
        <button className={`filter-btn${filter === 'read' ? ' on' : ''}`} onClick={() => setFilter('read')}>Read</button>
        <button className={`filter-btn${filter === 'topic' ? ' on' : ''}`} onClick={() => setFilter('topic')}>By topic</button>
      </div>

      {/* ── All & Read Tab ────────────────────────────────────── */}
      {(filter === 'all' || filter === 'read') && (
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
      )}

      {/* ── Saved Sketches Tab ────────────────────────────────── */}
      {filter === 'saved' && (
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
                    ✍️ Field Notes
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
                  <p className="font-hand" style={{ fontSize: '14px', color: sketch.notes ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', margin: 0 }}>
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
      )}

      {/* ── By Topic Shelves Tab ──────────────────────────────── */}
      {filter === 'topic' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase' }}>
              Shelf Folders
            </p>
            <button
              onClick={() => setShowAddFolder(!showAddFolder)}
              className="filter-btn on"
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none' }}
            >
              <i className="ti ti-folder-plus" style={{ marginRight: '4px' }}></i>
              New Shelf
            </button>
          </div>

          {/* Add Folder form */}
          {showAddFolder && (
            <form onSubmit={handleCreateFolder} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ margin: '0 0 4px', fontSize: '13px' }}>Create New Shelf</h3>
              
              <input
                type="text"
                placeholder="Shelf Name (e.g. Science, Space)"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                required
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-secondary)' }}
              />

              <input
                type="text"
                placeholder="Description"
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-secondary)' }}
              />

              <div style={{ display: 'flex', gap: '6px', alignSelf: 'flex-end', marginTop: '4px' }}>
                <button type="submit" className="filter-btn on" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: 'none' }}>
                  Create
                </button>
                <button type="button" className="filter-btn" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }} onClick={() => setShowAddFolder(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Folder grid */}
          {libraryCollections.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {libraryCollections.map((col) => (
                <div
                  key={col.id}
                  className="card"
                  onClick={() => handleFolderSelect(col.id)}
                  style={{ cursor: 'pointer', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', transition: 'transform 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1.5px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  <i className="ti ti-folder" style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '4px' }}></i>
                  <h4 className="card-title" style={{ fontSize: '12.5px', fontWeight: 650, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {col.name}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {col.description || 'No description.'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
              <p className="card-body" style={{ color: 'var(--color-text-tertiary)' }}>
                No shelves created yet.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
