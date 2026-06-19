import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface IgniteArticleProps {
  article: string;
  currentTopic: string | null;
  currentArticleId: string | null;
  igniteQuest: () => void;
  savedSketches: any[];
  toggleSaveArticle: () => void;
  libraryCollections: any[];
  addArticleToCollection: (colId: string, articleId: string) => Promise<void>;
  domain?: string | null;
}

export function IgniteArticle({
  article,
  currentTopic,
  currentArticleId,
  igniteQuest,
  savedSketches,
  toggleSaveArticle,
  libraryCollections,
  addArticleToCollection,
  domain,
}: IgniteArticleProps) {
  const isSaved = currentArticleId ? savedSketches.some(s => s.article_id === currentArticleId) : false;

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

  return (
    <article style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto' }}>
      <div className="noise-overlay" />

      {/* Topic tag */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.85rem',
        borderRadius: '999px',
        background: 'rgba(174,198,207,0.22)',
        border: '1px solid var(--primary-container)',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-body)',
        color: 'var(--primary)',
        marginBottom: '1.25rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>bookmark</span>
        <span>ARTICLE SKETCH</span>
      </div>

      {/* Article title */}
      {currentTopic && (
        <h1 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--ink-charcoal)',
          lineHeight: 1.25,
          marginBottom: domain ? '0.4rem' : '1.5rem',
          marginTop: 0,
        }}>
          {currentTopic}
        </h1>
      )}

      {/* Domain Metadata tag below the title */}
      {domain && (
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
          <span>{domain}</span>
        </div>
      )}

      {/* Markdown article body */}
      <div className="prose-curio">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
          {article}
        </ReactMarkdown>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="new-quest-btn"
          style={{ width: 'auto', padding: '0.7rem 1.4rem' }}
          onClick={() => igniteQuest()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            article
          </span>
          New article
        </button>

        {/* Save/Bookmark Sketch */}
        {currentArticleId && (
          <button
            className="new-quest-btn"
            style={{
              width: 'auto',
              padding: '0.7rem 1.4rem',
              borderColor: isSaved ? 'var(--secondary)' : 'var(--outline-variant)',
              color: isSaved ? 'var(--secondary)' : 'var(--ink-charcoal)',
              background: isSaved ? 'rgba(254,203,203,0.18)' : 'transparent',
            }}
            onClick={() => toggleSaveArticle()}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '1rem',
                fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0"
              }}
            >
              {isSaved ? 'bookmark_added' : 'bookmark'}
            </span>
            {isSaved ? 'Saved Sketch' : 'Save Sketch'}
          </button>
        )}

        {/* Add to Library collection */}
        {currentArticleId && libraryCollections.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              className="new-quest-btn"
              style={{
                width: 'auto',
                padding: '0.7rem 1.4rem',
                border: '2px dashed var(--outline-variant)',
                color: 'var(--ink-charcoal)',
                background: 'transparent',
                cursor: 'pointer',
              }}
              defaultValue=""
              onChange={async (e) => {
                const colId = e.target.value;
                if (colId) {
                  await addArticleToCollection(colId, currentArticleId);
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
          className="new-quest-btn"
          style={{
            width: 'auto',
            padding: '0.7rem 1.4rem',
            border: '2px dashed var(--outline-variant)',
            color: 'var(--ink-wash)',
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
            arrow_upward
          </span>
          Back to top
        </button>
      </div>
    </article>
  );
}
