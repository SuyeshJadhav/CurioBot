import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { ArticleSkeleton } from '../common/Skeletons';

export function ArticleReaderCanvas() {
  const {
    article, currentTopic, currentArticleId, closeArticle, igniteQuest, rabbitHoles, currentDomain,
  } = usePipeline();
  const { savedSketches, toggleSaveArticle, libraryCollections, addArticleToCollection } = useLibrary();

  const isSaved = savedSketches.some(s => s.article_id === currentArticleId);

  const MarkdownComponents = {
    blockquote: ({ children, ...props }: any) => {
      return (
        <div className="curio-insight-callout" {...props}>
          <div className="curio-insight-icon-wrapper">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ffffff', display: 'block' }}>
              lightbulb
            </span>
          </div>
          <div className="curio-insight-text">
            {children}
          </div>
        </div>
      );
    },
    h3: ({ children, ...props }: any) => {
      return (
        <h3 className="curio-pull-quote" {...props}>
          <span className="curio-pull-quote-bar"></span>
          {children}
        </h3>
      );
    }
  };

  if (!article) {
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

        <ArticleSkeleton />
      </div>
    );
  }

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
          READ STORY
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
          marginBottom: (currentDomain || savedSketches.find(s => s.article_id === currentArticleId)?.articles.domain) ? '0.4rem' : '1.5rem',
          marginTop: 0,
        }}>
          {currentTopic}
        </h1>
      )}

      {/* Domain Metadata tag below the title */}
      {(currentDomain || savedSketches.find(s => s.article_id === currentArticleId)?.articles.domain) && (
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          textTransform: 'uppercase',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
          color: 'var(--ink-wash, #57534E)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>folder</span>
          <span>{currentDomain || savedSketches.find(s => s.article_id === currentArticleId)?.articles.domain}</span>
        </div>
      )}

      {/* Markdown article body */}
      <div className="prose-curio">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {article || ''}
        </ReactMarkdown>
      </div>

      {/* Recommended Articles Section (Medium Style) */}
      {rabbitHoles && rabbitHoles.length > 0 && (
        <div style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px dashed var(--color-border-tertiary, #e5e9ec)',
        }}>
          <h4 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-secondary, #57534e)',
            marginBottom: '1rem',
            marginTop: 0,
          }}>
            Explore next
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}>
            {rabbitHoles.slice(0, 2).map((hole, index) => (
              <div 
                key={index} 
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'opacity 0.2s',
                }}
                onClick={() => igniteQuest({ title: hole.title, domain: hole.domain, summary: hole.why })}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <span style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  color: 'var(--primary, #7F77DD)',
                  fontWeight: 650,
                  letterSpacing: '0.04em',
                }}>
                  {hole.domain}
                </span>
                <h3 style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  margin: '2px 0',
                  color: 'var(--color-text-primary, #1c1917)',
                  fontFamily: 'var(--font-headline)',
                  lineHeight: '1.3',
                }}>
                  {hole.title}
                </h3>
                <p style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-text-secondary, #57534e)',
                  margin: 0,
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {hole.why}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--primary, #7F77DD)',
                  fontWeight: 600,
                  marginTop: '4px',
                }}>
                  <span>Read story</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <i className="ti ti-article" style={{ marginRight: '6px' }}></i>
          New article
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
              <option value="" disabled>Add to folder...</option>
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
