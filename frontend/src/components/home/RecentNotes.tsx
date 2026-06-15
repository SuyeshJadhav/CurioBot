import React, { useState } from 'react';
import { Skeleton } from '../common/Skeletons';

interface RecentNotesProps {
  isLoadingUserData: boolean;
  savedSketches: any[];
  loadArticle: (id: string) => void;
  updateSketchNotes: (id: string, notes: string) => void;
  changeTab: (tab: string) => void;
}

export function RecentNotes({
  isLoadingUserData,
  savedSketches,
  loadArticle,
  updateSketchNotes,
  changeTab,
}: RecentNotesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  return (
    <div style={{
      background: 'var(--surface-cream)',
      border: '1px solid var(--outline-variant)',
      borderRadius: '14px',
      padding: '20px 22px',
      boxShadow: '0 2px 12px rgba(70,55,40,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <i className="ti ti-notebook" style={{ fontSize: '15px', color: 'var(--primary)' }} />
          <h3 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--ink-charcoal)',
            margin: 0,
          }}>
            Your notes
          </h3>
        </div>
        {savedSketches.length > 3 && (
          <button
            onClick={() => changeTab('library')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '11.5px',
              fontFamily: 'var(--font-body)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            View all ({savedSketches.length})
          </button>
        )}
      </div>

      {isLoadingUserData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton style={{ height: '68px', width: '100%', borderRadius: '10px' }} />
          <Skeleton style={{ height: '68px', width: '100%', borderRadius: '10px' }} />
        </div>
      ) : savedSketches.length > 0 ? (
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
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(249,247,242,0.8)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div onClick={() => loadArticle(sketch.article_id)} style={{ cursor: 'pointer', minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--ink-charcoal)',
                          margin: '0 0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-charcoal)')}
                      >
                        <i className="ti ti-file-text" style={{ fontSize: '13px', color: 'var(--primary)' }} />
                        <span>{sketch.articles.title}</span>
                      </h4>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '1px 7px',
                        borderRadius: '20px',
                        background: '#E8F5EF',
                        color: '#1D6B4F',
                        border: '1px solid #A8D5BE',
                      }}>
                        {sketch.articles.domain}
                      </span>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => { setEditingId(sketch.article_id); setTempNotes(sketch.notes || ''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-body)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          transition: 'background 0.15s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(75,98,106,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <i className="ti ti-edit" style={{ fontSize: '12px' }} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {/* Notes area */}
                  <div style={{
                    background: 'rgba(116,89,68,0.025)',
                    border: '1px dashed rgba(174,198,207,0.5)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          style={{
                            width: '100%',
                            height: '54px',
                            fontSize: '12.5px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--outline-variant)',
                            outline: 'none',
                            background: 'var(--color-background-primary)',
                            resize: 'none',
                            fontFamily: 'var(--font-body)',
                            color: 'var(--ink-charcoal)',
                            boxSizing: 'border-box',
                          }}
                          value={tempNotes}
                          onChange={e => setTempNotes(e.target.value)}
                          placeholder="Write down any notes or summaries of your own..."
                        />
                        <div style={{ display: 'flex', gap: '5px', alignSelf: 'flex-end' }}>
                          <button
                            className="filter-btn on"
                            style={{ padding: '3px 10px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={() => { updateSketchNotes(sketch.article_id, tempNotes); setEditingId(null); }}
                          >
                            Save
                          </button>
                          <button
                            className="filter-btn"
                            style={{ padding: '3px 10px', fontSize: '11px', borderRadius: '6px' }}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: sketch.notes ? '13.5px' : '12px',
                        color: sketch.notes ? 'var(--ink-charcoal)' : 'var(--ink-wash)',
                        margin: 0,
                        fontStyle: sketch.notes ? 'normal' : 'italic',
                        lineHeight: 1.5,
                      }}>
                        {sketch.notes || 'No annotations yet — jot down your thoughts about this article!'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '28px 16px',
          border: '1.5px dashed rgba(174,198,207,0.45)',
          borderRadius: '12px',
          background: 'rgba(174,198,207,0.04)',
        }}>
          <i className="ti ti-notebook" style={{ fontSize: '26px', color: 'var(--ink-wash)', marginBottom: '8px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12.5px', color: 'var(--ink-wash)', margin: '0 0 14px' }}>
            No notes saved yet. Start reading to add notes.
          </p>
          <button
            className="filter-btn on"
            style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '8px' }}
            onClick={() => changeTab('discover')}
          >
            Explore topics
          </button>
        </div>
      )}
    </div>
  );
}
