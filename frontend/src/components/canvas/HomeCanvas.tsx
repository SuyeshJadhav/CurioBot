import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { usePreferences } from '../../contexts/UserPreferencesContext';
import { fetchRecommendations } from '../../actions/libraryActions';
import { Skeleton, MetricSkeleton } from '../common/Skeletons';


export function HomeCanvas() {
  const { changeTab, user } = useAuth();
  const { history, loadArticle, igniteQuest, isLoadingHistory } = usePipeline();
  const {
    savedSketches, loadSavedSketches, updateSketchNotes,
  } = useLibrary();
  const { interests } = usePreferences();
  const isLoadingUserData = isLoadingHistory;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    loadSavedSketches();
  }, [loadSavedSketches]);

  const [recommendations, setRecommendations] = useState<Array<{ tag: string; topic: string }>>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const sortedInterests = [...interests].sort().join(',');
    const cacheKey = `curio_recs_${user.id}_${sortedInterests}`;

    // Try reading cache
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}_time`);
    const isExpired = cachedTime ? (Date.now() - parseInt(cachedTime, 10) > 3600000) : true;

    if (cachedData && !isExpired) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setRecommendations(parsed);
          setIsLoadingRecs(false);
          return;
        }
      } catch (e) {
        console.warn("Failed to parse cached recommendations:", e);
      }
    }

    setIsLoadingRecs(true);
    fetchRecommendations()
      .then(data => {
        if (active) {
          setRecommendations(data);
          setIsLoadingRecs(false);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
          } catch (e) {
            console.error("Failed to save recommendations to cache:", e);
          }
        }
      })
      .catch(err => {
        console.error("Failed to load recommendations:", err);
        if (active) {
          setIsLoadingRecs(false);
        }
      });
    return () => {
      active = false;
    };
  }, [interests, user]);

  const capitalizeWord = (str: string) => {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };




  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Title */}
      <h2 className="section-title">Home</h2>
      <p className="section-sub">Your reading hub — streak, today's article, and what's next</p>

      {/* Quick Quest Input */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', border: '1.5px solid var(--outline-variant)' }}>
        <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-charcoal)', margin: '0 0 6px', fontFamily: 'var(--font-headline)' }}>
          🚀 Quick Quest
        </h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          const val = (e.currentTarget.elements.namedItem('quickTopic') as HTMLInputElement).value;
          if (val.trim()) {
            igniteQuest(val.trim(), val.trim());
          }
        }} style={{ display: 'flex', gap: '8px' }}>
          <input 
            name="quickTopic"
            type="text" 
            placeholder="What are you curious about right now? (e.g. History of Tea)" 
            style={{ 
              flex: 1, 
              fontSize: '12.5px',
              padding: '6px 12px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-border-secondary)',
              outline: 'none',
              background: 'var(--color-background-secondary)'
            }}
          />
          <button 
            type="submit"
            className="filter-btn on"
            style={{ 
              fontSize: '12px', 
              padding: '6px 16px', 
              borderRadius: 'var(--border-radius-md)', 
              cursor: 'pointer',
              border: 'none',
              fontWeight: 600
            }}
          >
            ✦ Ignite
          </button>
        </form>
      </div>

      {/* Metrics Row */}
      <div className="row">
        {isLoadingUserData ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <div className="metric">
              <p className="metric-label">📖 Articles read</p>
              <p className="metric-val">{history.length}</p>
            </div>
            <div className="metric">
              <p className="metric-label">💾 Saved</p>
              <p className="metric-val">{savedSketches.length}</p>
            </div>
          </>
        )}
      </div>



      {/* Daily Spark Deck */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-headline)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✨ Daily Spark Deck
          </h3>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', margin: 0 }}>
            Click a card below to launch a research quest tailored to your interests.
          </p>
        </div>

        {isLoadingRecs ? (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: '1 1 calc(33.333% - 10px)', minWidth: '200px' }}><Skeleton style={{ height: '94px', width: '100%', borderRadius: '8px' }} /></div>
            <div style={{ flex: '1 1 calc(33.333% - 10px)', minWidth: '200px' }}><Skeleton style={{ height: '94px', width: '100%', borderRadius: '8px' }} /></div>
            <div style={{ flex: '1 1 calc(33.333% - 10px)', minWidth: '200px' }}><Skeleton style={{ height: '94px', width: '100%', borderRadius: '8px' }} /></div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px' }}>
            {recommendations.map((suggestion, idx) => (
              <div 
                key={idx}
                style={{
                  flex: '1 1 calc(33.333% - 10px)',
                  minWidth: '200px',
                  padding: '14px',
                  borderRadius: 'var(--border-radius-md, 8px)',
                  background: 'var(--color-background-primary, #fdfcf8)',
                  border: '1px solid var(--color-border-secondary, #e5e9ec)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
                onClick={() => igniteQuest({ title: suggestion.topic, domain: suggestion.tag })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#7F77DD';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--color-border-secondary, #e5e9ec)';
                }}
              >
                <div>
                  <span className="tag tag-teal" style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 650, letterSpacing: '0.05em', padding: '2px 8px' }}>
                    {capitalizeWord(suggestion.tag)}
                  </span>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '8px 0 0', lineHeight: 1.4 }}>
                    {suggestion.topic}
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#7F77DD', fontWeight: 600 }}>
                  <span>Ignite Quest</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Field Notes Card */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p className="card-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', margin: 0 }}>
            Recent Field Notes
          </p>
          {savedSketches.length > 3 && (
            <button 
              onClick={() => changeTab('library')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              View All ({savedSketches.length})
            </button>
          )}
        </div>

        {isLoadingUserData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <Skeleton style={{ height: '32px', width: '100%' }} />
            <Skeleton style={{ height: '32px', width: '100%' }} />
            <Skeleton style={{ height: '32px', width: '100%' }} />
          </div>
        ) : savedSketches.length > 0 ? (
          <>
            <p className="card-body" style={{ marginBottom: '12px', fontSize: '12px' }}>
              Your latest jotted thoughts and highlights from reading quests:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...savedSketches]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 3)
                .map((sketch) => {
                  const isEditing = editingId === sketch.article_id;
                  
                  return (
                    <div 
                      key={sketch.id}
                      style={{ 
                        padding: '12px',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div 
                          onClick={() => loadArticle(sketch.article_id)}
                          style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}
                        >
                          <h4 
                            className="card-title" 
                            style={{ 
                              fontSize: '13px', 
                              margin: 0, 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              transition: 'color 0.15s' 
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                          >
                            <i className="ti ti-file-text" style={{ fontSize: '14px', color: 'var(--primary)' }}></i>
                            <span>{sketch.articles.title}</span>
                          </h4>
                          <span className="tag tag-teal" style={{ fontSize: '9px', padding: '1px 6px', marginTop: '4px', display: 'inline-block' }}>
                            {sketch.articles.domain}
                          </span>
                        </div>

                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingId(sketch.article_id);
                              setTempNotes(sketch.notes || '');
                            }}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--primary)', 
                              fontSize: '11px', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <i className="ti ti-edit" style={{ fontSize: '12px' }}></i>
                            <span>Edit</span>
                          </button>
                        )}
                      </div>

                      {/* Notes text area / display */}
                      <div style={{ 
                        background: 'rgba(116, 89, 68, 0.02)', 
                        border: '0.5px dashed var(--color-border-secondary)', 
                        borderRadius: 'var(--border-radius-md)', 
                        padding: '8px 10px',
                        marginTop: '2px'
                      }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <textarea
                              style={{ 
                                width: '100%', 
                                height: '50px', 
                                fontSize: '12px',
                                padding: '6px',
                                borderRadius: 'var(--border-radius-sm)',
                                border: '1px solid var(--color-border-secondary)',
                                outline: 'none',
                                background: 'var(--color-background-primary)',
                                resize: 'none',
                                fontFamily: 'inherit'
                              }}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              placeholder="Write down any notes or summaries of your own..."
                            />
                            <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end' }}>
                              <button 
                                className="filter-btn on" 
                                style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px' }}
                                onClick={() => {
                                  updateSketchNotes(sketch.article_id, tempNotes);
                                  setEditingId(null);
                                }}
                              >
                                Save
                              </button>
                              <button 
                                className="filter-btn" 
                                style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px' }}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="font-hand" style={{ fontSize: '13.5px', color: sketch.notes ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', margin: 0, fontStyle: sketch.notes ? 'normal' : 'italic' }}>
                            {sketch.notes || 'No annotations added yet. Jot down some thoughts about this article!'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', border: '1px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', background: 'var(--color-background-secondary)' }}>
            <i className="ti ti-notebook" style={{ fontSize: '24px', color: 'var(--color-text-tertiary)', marginBottom: '6px', display: 'block' }}></i>
            <p className="card-body" style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', marginBottom: '12px' }}>
              Your notebook is currently empty. Start reading articles and save your field notes to see them here!
            </p>
            <button 
              className="filter-btn on"
              style={{ fontSize: '11px', padding: '5px 12px' }}
              onClick={() => changeTab('discover')}
            >
              ✨ Explore Topics
            </button>
          </div>
        )}
      </div>


    </div>
  );
}
