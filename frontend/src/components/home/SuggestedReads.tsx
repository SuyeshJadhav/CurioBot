import { useState, useEffect } from 'react';
import { fetchRecommendations } from '../../actions/libraryActions';
import { Skeleton } from '../common/Skeletons';

interface SuggestedReadsProps {
  user: any;
  interests: string[];
  igniteQuest: (topic: any, hint?: string) => void;
}

export function SuggestedReads({ user, interests, igniteQuest }: SuggestedReadsProps) {
  const [recommendations, setRecommendations] = useState<Array<{ tag: string; topic: string }>>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const sortedInterests = [...interests].sort().join(',');
    const cacheKey = `curio_recs_${user.id}_${sortedInterests}`;
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
        console.warn('Failed to parse cached recommendations:', e);
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
            console.error('Failed to save recommendations to cache:', e);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load recommendations:', err);
        if (active) setIsLoadingRecs(false);
      });
      
    return () => { active = false; };
  }, [interests, user]);

  const capitalizeWord = (str: string) =>
    str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const tagStyles = [
    { bg: '#E8F5EF', color: '#1D6B4F', border: '#A8D5BE' },
    { bg: '#EEEDFE', color: '#3C3489', border: '#C3BFEE' },
    { bg: '#FEF3E2', color: '#7A4B00', border: '#F5D49A' },
  ];

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--ink-charcoal)',
          margin: '0 0 3px',
        }}>
          Suggested reads
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--ink-wash)', margin: 0 }}>
          Based on your interests.
        </p>
      </div>

      {isLoadingRecs ? (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: '1 1 calc(33.333% - 10px)', minWidth: '180px' }}>
              <Skeleton style={{ height: '100px', width: '100%', borderRadius: '12px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {recommendations.map((suggestion, idx) => {
            const ts = tagStyles[idx % tagStyles.length];
            return (
              <div
                key={idx}
                onClick={() => igniteQuest({ title: suggestion.topic, domain: suggestion.tag })}
                style={{
                  flex: '1 1 calc(33.333% - 10px)',
                  minWidth: '180px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface-cream)',
                  border: '1px solid var(--outline-variant)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 1px 4px rgba(70,55,40,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(70,55,40,0.09)';
                  e.currentTarget.style.borderColor = 'var(--primary-container)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(70,55,40,0.04)';
                  e.currentTarget.style.borderColor = 'var(--outline-variant)';
                }}
              >
                <div>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: ts.bg,
                    color: ts.color,
                    border: `1px solid ${ts.border}`,
                    marginBottom: '8px',
                  }}>
                    {capitalizeWord(suggestion.tag)}
                  </span>
                  <h4 style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--ink-charcoal)',
                    margin: 0,
                    lineHeight: 1.45,
                  }}>
                    {suggestion.topic}
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  <span>Read</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
