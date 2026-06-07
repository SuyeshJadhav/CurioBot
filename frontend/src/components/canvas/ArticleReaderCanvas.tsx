import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCurio } from '../../contexts/CurioContext';

export function ArticleReaderCanvas() {
  const {
    article,
    currentTopic,
    currentArticleId,
    closeArticle,
    igniteQuest,
    savedSketches,
    toggleSaveArticle,
    libraryCollections,
    addArticleToCollection,
  } = useCurio();

  const isSaved = savedSketches.some(s => s.article_id === currentArticleId);

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />

      {/* Back button */}
      <button 
        onClick={closeArticle}
        className="nav-item active"
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: 'var(--border-radius-md)',
          cursor: 'pointer',
          fontSize: '12px',
          border: 'none',
          marginBottom: '1.5rem',
          textDecoration: 'none'
        }}
      >
        <i className="ti ti-arrow-back-up" style={{ fontSize: '14px' }}></i>
        <span>Back to main view</span>
      </button>

      {/* Topic tag */}
      <div style={{ marginBottom: '1rem' }}>
        <span 
          className="tag tag-teal" 
          style={{ 
            fontSize: '10px', 
            textTransform: 'uppercase', 
            fontWeight: 'bold', 
            letterSpacing: '0.06em' 
          }}
        >
          {currentTopic ? 'Exploration' : 'Wonder'}
        </span>
      </div>

      {/* Article title */}
      {currentTopic && (
        <h1 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.25,
          marginBottom: '1.5rem',
          marginTop: 0,
        }}>
          {currentTopic}
        </h1>
      )}

      {/* Markdown article body */}
      <div className="prose-curio">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {article || ''}
        </ReactMarkdown>
      </div>

      {/* Footer actions */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '10px', 
          marginTop: '2.5rem', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          borderTop: '0.5px solid var(--color-border-tertiary)',
          paddingTop: '20px'
        }}
      >
        <button
          className="filter-btn on"
          style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-md)', border: 'none', fontWeight: 600 }}
          onClick={() => igniteQuest()}
        >
          <i className="ti ti-sparkles" style={{ marginRight: '6px' }}></i>
          New Quest
        </button>

        {/* Save/Bookmark Sketch */}
        {currentArticleId && (
          <button
            className="filter-btn"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--border-radius-md)',
              borderColor: isSaved ? 'var(--secondary)' : 'var(--color-border-secondary)',
              color: isSaved ? 'var(--secondary)' : 'var(--color-text-secondary)',
              background: isSaved ? 'rgba(254,203,203,0.18)' : 'transparent',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => toggleSaveArticle()}
          >
            <i className={isSaved ? "ti ti-bookmark-filled" : "ti ti-bookmark"}></i>
            {isSaved ? 'Saved Sketch' : 'Save Sketch'}
          </button>
        )}

        {/* Add to Library collection dropdown */}
        {currentArticleId && libraryCollections.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              style={{
                fontSize: '12px',
                padding: '8px 16px',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-secondary)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none'
              }}
              defaultValue=""
              onChange={async (e) => {
                const colId = e.target.value;
                if (colId) {
                  await addArticleToCollection(colId, currentArticleId);
                  alert("Added to folder!");
                  e.target.value = ""; // Reset dropdown
                }
              }}
            >
              <option value="" disabled>📁 Add to folder...</option>
              {libraryCollections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="filter-btn"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            color: 'var(--color-text-tertiary)',
            marginLeft: 'auto'
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <i className="ti ti-arrow-up"></i>
          Back to top
        </button>
      </div>

    </div>
  );
}
