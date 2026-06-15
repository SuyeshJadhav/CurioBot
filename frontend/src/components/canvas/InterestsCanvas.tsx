import React, { useState } from 'react';
import { usePreferences } from '../../contexts/UserPreferencesContext';
import { InterestSkeleton } from '../common/Skeletons';

export function InterestsCanvas() {
  const {
    interests,
    addInterest,
    deleteInterest,
  } = usePreferences();

  const [newInterest, setNewInterest] = useState('');

  const getInterestIcon = (interest: string) => {
    const lower = interest.toLowerCase();
    if (lower.includes('behavior') || lower.includes('psychology') || lower.includes('brain')) return 'ti ti-brain';
    if (lower.includes('science') || lower.includes('physics') || lower.includes('flask')) return 'ti ti-flask';
    if (lower.includes('history')) return 'ti ti-history';
    if (lower.includes('money') || lower.includes('finance') || lower.includes('power')) return 'ti ti-currency-dollar';
    if (lower.includes('food') || lower.includes('culture') || lower.includes('world')) return 'ti ti-world';
    return 'ti ti-sparkles';
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterest.trim()) return;
    try {
      await addInterest(newInterest.trim().toLowerCase());
      setNewInterest('');
    } catch (err) {
      console.error(err);
    }
  };

  if (interests === undefined) {
    return (
      <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
        <div className="noise-overlay" />
        <h2 className="section-title">My interests</h2>
        <p className="section-sub">These drive what topics get generated for you — edit freely</p>
        <InterestSkeleton />
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />
      
      {/* Title */}
      <h2 className="section-title">My interests</h2>
      <p className="section-sub">These drive what topics get generated for you — edit freely</p>

      {/* Add Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <input 
          type="text" 
          placeholder="Add a new interest..." 
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          style={{ 
            flex: 1, 
            fontSize: '13px',
            padding: '8px 12px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-border-secondary)',
            outline: 'none',
            background: 'var(--color-background-secondary)'
          }}
        />
        <button 
          type="submit" 
          style={{ 
            fontSize: '13px',
            padding: '8px 16px',
            borderRadius: 'var(--border-radius-md)',
            border: '0.5px solid var(--color-border-secondary)',
            background: 'var(--color-text-primary)',
            color: 'var(--color-background-primary)',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          + Add interest
        </button>
      </form>

      <hr className="divider" />

      {/* Interests list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
        {interests.map((interest) => (
          <div key={interest} className="interest-tag" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', margin: 0 }}>
            <i className={`${getInterestIcon(interest)} interest-icon`} style={{ marginRight: '8px' }}></i>
            <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{interest}</span>
            <i 
              className="ti ti-x remove-btn" 
              style={{ fontSize: '13px', marginLeft: 'auto', opacity: 0.6 }} 
              onClick={() => deleteInterest(interest)}
              aria-hidden="true"
            ></i>
          </div>
        ))}

        {interests.length === 0 && (
          <span style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)', fontSize: '13px', padding: '10px' }}>
            No interests added yet. Add one above to begin.
          </span>
        )}
      </div>
      
      <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '8px', textAlign: 'center' }}>
        Changes take effect on your next article generation
      </p>

    </div>
  );
}
