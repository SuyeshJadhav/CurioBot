import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/UserPreferencesContext';
import type { UserSettings } from '../../types/curio';
import { SettingsSkeleton } from '../common/Skeletons';

export function SettingsCanvas() {
  const { user } = useAuth();
  const { userSettings, saveSettings } = usePreferences();
  const isLoadingUserData = !userSettings && !user;

  const [readingTime, setReadingTime] = useState(userSettings?.reading_time || '5min');
  const [novelty, setNovelty] = useState(userSettings?.topic_novelty || 'mixed');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving...');

    const payload: UserSettings = {
      model: userSettings?.model || 'gemini-3.1-flash-lite',
      reading_time: readingTime,
      knowledge_level: userSettings?.knowledge_level || 'intermediate',
      topic_novelty: novelty,
      onboarding_complete: true,
    };

    try {
      await saveSettings(payload);
      setSaveStatus('Settings saved successfully! ✨');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('Failed to save settings. Please try again.');
    }
  };

  if (isLoadingUserData) {
    return (
      <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
        <div className="noise-overlay" />
        <h2 className="section-title">Settings</h2>
        <p className="section-sub">Persona, writing style, model, and account preferences</p>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '740px', margin: '0 auto', position: 'relative' }}>
      <div className="noise-overlay" />

      {/* Header */}
      <h2 className="section-title">Settings</h2>
      <p className="section-sub">Persona, writing style, model, and account preferences</p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>


        {/* Reading Time Card */}
        <div className="card" style={{ padding: '16px' }}>
          <p className="card-title" style={{ fontSize: '13px', margin: '0 0 4px' }}>Reading time</p>
          <p className="card-body" style={{ marginBottom: '8px', fontSize: '12px' }}>
            Target length and detail level for generated articles
          </p>
          <select
            value={readingTime}
            onChange={(e) => setReadingTime(e.target.value as any)}
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '6px 8px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              outline: 'none',
              background: 'var(--color-background-primary)'
            }}
          >
            <option value="2min">Quick read (2 min)</option>
            <option value="5min">Balanced (5 min)</option>
            <option value="10min">Deep dive (10 min)</option>
          </select>
        </div>


        {/* Topic Novelty Card */}
        <div className="card" style={{ padding: '16px' }}>
          <p className="card-title" style={{ fontSize: '13px', margin: '0 0 4px' }}>Topic novelty</p>
          <p className="card-body" style={{ marginBottom: '8px', fontSize: '12px' }}>
            Exploration adventurousness for suggested topics
          </p>
          <select
            value={novelty}
            onChange={(e) => setNovelty(e.target.value as any)}
            style={{
              width: '100%',
              fontSize: '12px',
              padding: '6px 8px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              outline: 'none',
              background: 'var(--color-background-primary)'
            }}
          >
            <option value="familiar">Stick to what I know (Familiar)</option>
            <option value="mixed">Mixed exploration (Balanced)</option>
            <option value="wildcard">Surprise me (Wildcard)</option>
          </select>
        </div>

        {/* Token Balance Card */}
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="card-title" style={{ fontSize: '13px', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🪙 Token Balance
            </p>
            <p className="card-body" style={{ fontSize: '12px', margin: 0, color: 'var(--color-text-secondary)' }}>
              Remaining AI computation capacity for your curiosity quests
            </p>
          </div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: 'var(--primary)',
            background: 'var(--primary-fixed)',
            padding: '6px 12px',
            borderRadius: 'var(--border-radius-md)',
            fontFamily: 'monospace',
            border: '1px solid var(--color-border-secondary)'
          }}>
            {user?.token_balance !== undefined ? user.token_balance.toLocaleString() : '100,000'}
          </div>
        </div>

        {/* Save button and status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--tertiary)', fontWeight: 650 }}>
            {saveStatus}
          </span>
          <button
            type="submit"
            className="filter-btn on"
            style={{ padding: '8px 20px', borderRadius: 'var(--border-radius-md)', border: 'none', fontWeight: 600 }}
          >
            Save Settings
          </button>
        </div>

      </form>
    </div>
  );
}
