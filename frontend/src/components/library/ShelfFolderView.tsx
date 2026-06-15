import React from 'react';

interface ShelfFolderViewProps {
  activeCollectionId: string | null;
  libraryCollections: any[];
  collectionArticles: any[];
  loadArticle: (id: string) => void;
  setActiveCollectionId: (id: string | null) => void;
}

export function ShelfFolderView({
  activeCollectionId,
  libraryCollections,
  collectionArticles,
  loadArticle,
  setActiveCollectionId,
}: ShelfFolderViewProps) {
  if (!activeCollectionId) return null;

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
        <h2 className="section-title">{activeFolder?.name || 'Library Folder'}</h2>
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
