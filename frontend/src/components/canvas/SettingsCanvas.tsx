import React, { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';
import type { UserSettings } from '../../types/curio';

export function SettingsCanvas() {
  const {
    userSettings,
    saveSettings,
  } = useCurio();

  const [model, setModel] = useState(userSettings?.model || 'gemini-3.1-flash-lite');
  const [readingTime, setReadingTime] = useState(userSettings?.reading_time || '5min');
  const [knowledgeLevel, setKnowledgeLevel] = useState(userSettings?.knowledge_level || 'intermediate');
  const [novelty, setNovelty] = useState(userSettings?.topic_novelty || 'mixed');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving...');

    const payload: UserSettings = {
      model: model,
      reading_time: readingTime,
      knowledge_level: knowledgeLevel,
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

        {/* Knowledge Level Card */}
        <div className="card" style={{ padding: '16px' }}>
          <p className="card-title" style={{ fontSize: '13px', margin: '0 0 4px' }}>Knowledge level</p>
          <p className="card-body" style={{ marginBottom: '8px', fontSize: '12px' }}>
            Assume reader familiarity and adjust vocabulary
          </p>
          <select
            value={knowledgeLevel}
            onChange={(e) => setKnowledgeLevel(e.target.value as any)}
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
            <option value="beginner">New to this (Beginner)</option>
            <option value="intermediate">Curious learner (Intermediate)</option>
            <option value="expert">Know my stuff (Expert)</option>
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

        {/* Model Card */}
        <div className="card" style={{ padding: '16px' }}>
          <p className="card-title" style={{ fontSize: '13px', margin: '0 0 4px' }}>Model</p>
          <p className="card-body" style={{ marginBottom: '8px', fontSize: '12px' }}>
            Gemini model used for generation
          </p>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
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
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          </select>
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
