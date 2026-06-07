import React, { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';

const PRESETS = [
  'space exploration', 'astronomy', 'history', 'ancient egypt', 'nature',
  'quantum physics', 'psychology', 'neuroscience', 'philosophy', 'design',
  'economics', 'game theory', 'robotics', 'biotechnology', 'mysteries'
];

export function OnboardingModal() {
  const {
    saveSettings,
    addInterest,
    loadInterests,
    loadSettings,
  } = useCurio();

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [readingTime, setReadingTime] = useState<'2min' | '5min' | '10min'>('5min');
  const [knowledgeLevel, setKnowledgeLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [novelty, setNovelty] = useState<'familiar' | 'mixed' | 'wildcard'>('mixed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePreset = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInterest.trim().toLowerCase();
    if (clean && !selectedInterests.includes(clean)) {
      setSelectedInterests(prev => [...prev, clean]);
      setCustomInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setSelectedInterests(prev => prev.filter(i => i !== interest));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Save settings
      await saveSettings({
        model: 'gemini-3.1-flash-lite-preview',
        reading_time: readingTime,
        knowledge_level: knowledgeLevel,
        topic_novelty: novelty,
        onboarding_complete: true
      });

      // 2. Save interests sequentially
      // Seed default interests if none selected to prevent empty profile
      const finalInterests = selectedInterests.length > 0 ? selectedInterests : ['science', 'history', 'nature'];
      for (const interest of finalInterests) {
        await addInterest(interest);
      }

      // 3. Reload state
      await loadSettings();
      await loadInterests();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(244, 241, 234, 0.95)',
      backdropFilter: 'blur(8px)',
      padding: '1.5rem',
      fontFamily: 'var(--font-headline)',
    }}>
      <style>{`
        .onboarding-card {
          max-width: 580px;
          width: 100%;
          background: var(--surface-paper);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--outline-variant);
          transition: all 0.3s ease;
        }
        .progress-dot.active {
          background: var(--primary);
          transform: scale(1.25);
        }
        .tile-btn {
          border: 1.5px solid var(--outline-variant);
          background: var(--surface-cream);
          border-radius: 10px;
          padding: 1.1rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .tile-btn:hover {
          border-color: var(--primary-container);
          background: var(--surface-paper);
        }
        .tile-btn.selected {
          border-color: var(--primary);
          background: rgba(174, 198, 207, 0.12);
        }
        .interest-preset {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--outline-variant);
          background: var(--surface-cream);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-hand);
        }
        .interest-preset.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      `}</style>

      <div className="onboarding-card">
        {/* Header */}
        <div style={{
          padding: '1.75rem 2rem 1rem',
          borderBottom: '1px solid var(--outline-variant)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-hand)',
              color: 'var(--primary)',
              fontSize: '0.9rem',
              fontWeight: 650
            }}>CurioBot Setup</span>
            <h2 style={{ margin: '2px 0 0', fontSize: '1.4rem', fontWeight: 700 }}>
              {step === 1 && 'What sparks your interest?'}
              {step === 2 && 'How much time do you have?'}
              {step === 3 && 'Choose your knowledge depth'}
              {step === 4 && 'Curiosity novelty preference'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className={`progress-dot ${step === idx ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-wash)', lineHeight: 1.5 }}>
                Select topics you're curious about. CurioBot will use these as seed ideas to search the web and Wikipedia for new reads.
              </p>

              {/* Presets Grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => togglePreset(preset)}
                    className={`interest-preset ${selectedInterests.includes(preset) ? 'selected' : ''}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Add Custom Form */}
              <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Or type a custom interest (e.g. quantum computing)..."
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '0.88rem',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--outline-variant)',
                    outline: 'none',
                    background: 'var(--surface-cream)'
                  }}
                />
                <button
                  type="submit"
                  className="filter-btn on"
                  style={{
                    fontSize: '0.88rem',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </form>

              {/* Selected Interests List */}
              {selectedInterests.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--ink-charcoal)', margin: '0 0 6px' }}>
                    Your Seed Interests ({selectedInterests.length}):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedInterests.map(interest => (
                      <span key={interest} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(174, 198, 207, 0.15)',
                        border: '1px solid var(--outline-variant)',
                        fontSize: '0.82rem',
                        color: 'var(--ink-charcoal)',
                        fontFamily: 'var(--font-hand)'
                      }}>
                        {interest}
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '0.9rem', cursor: 'pointer', opacity: 0.6 }}
                          onClick={() => removeInterest(interest)}
                        >
                          close
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-wash)', lineHeight: 1.5 }}>
                Configure the target reading length for generated articles. We adapt the content depth and detail accordingly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className={`tile-btn ${readingTime === '2min' ? 'selected' : ''}`}
                  onClick={() => setReadingTime('2min')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>⚡ Quick read (2 min)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>Word target: 250-350 words. Punchy summary, direct insights.</span>
                </button>

                <button
                  className={`tile-btn ${readingTime === '5min' ? 'selected' : ''}`}
                  onClick={() => setReadingTime('5min')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>📖 Balanced (5 min)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>Word target: 550-700 words. Ideal magazine length, explores key concepts.</span>
                </button>

                <button
                  className={`tile-btn ${readingTime === '10min' ? 'selected' : ''}`}
                  onClick={() => setReadingTime('10min')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>🔬 Deep dive (10 min)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>Word target: 1000-1200 words. Comprehensive detail, mechanism explanations.</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-wash)', lineHeight: 1.5 }}>
                Choose your prior familiarity with topics. CurioBot will adapt vocabulary and technical explanations.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className={`tile-btn ${knowledgeLevel === 'beginner' ? 'selected' : ''}`}
                  onClick={() => setKnowledgeLevel('beginner')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>🌱 New to this (Beginner)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>No prior knowledge assumed. Simple analogies, clear jargon definitions.</span>
                </button>

                <button
                  className={`tile-btn ${knowledgeLevel === 'intermediate' ? 'selected' : ''}`}
                  onClick={() => setKnowledgeLevel('intermediate')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>🎓 Curious learner (Intermediate)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>Curious, educated non-specialist. Explains specialized jargon but skips basics.</span>
                </button>

                <button
                  className={`tile-btn ${knowledgeLevel === 'expert' ? 'selected' : ''}`}
                  onClick={() => setKnowledgeLevel('expert')}
                >
                  <strong style={{ fontSize: '0.95rem', color: 'var(--ink-charcoal)' }}>🧠 Know my stuff (Expert)</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-wash)' }}>Domain familiarity assumed. Precise terminology, deep dive into mechanics.</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-wash)', lineHeight: 1.5 }}>
                How adventurous should CurioBot be when suggesting new article topics?
              </p>

              <div style={{
                background: 'var(--surface-cream)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--outline-variant)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ink-wash)', fontWeight: 600 }}>
                  <span>Stick to interests</span>
                  <span>Mixed</span>
                  <span>Surprise me</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={novelty === 'familiar' ? '0' : novelty === 'mixed' ? '1' : '2'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '0') setNovelty('familiar');
                    else if (v === '1') setNovelty('mixed');
                    else setNovelty('wildcard');
                  }}
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />

                <div style={{
                  padding: '12px',
                  background: 'var(--surface-paper)',
                  borderRadius: '8px',
                  border: '0.5px solid var(--outline-variant)',
                  fontSize: '0.85rem',
                  lineHeight: 1.45
                }}>
                  {novelty === 'familiar' && (
                    <>
                      <strong>🎯 Familiar Focus</strong>: Topic suggestions will stay very close to your stated interests. Best for deepening knowledge in specific areas.
                    </>
                  )}
                  {novelty === 'mixed' && (
                    <>
                      <strong>🌀 Mixed Exploration</strong>: Topics will blend your stated interests with adjacent, slightly unexpected topics. Great balance of relevance and surprise.
                    </>
                  )}
                  {novelty === 'wildcard' && (
                    <>
                      <strong>🎲 Wildcard Wonder</strong>: Ignore interests and surprise you with random, engaging rabbit holes. Best for discovering completely new areas.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--outline-variant)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-cream)'
        }}>
          <button
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className="new-quest-btn"
            style={{
              width: 'auto',
              padding: '0.5rem 1.2rem',
              visibility: step === 1 ? 'hidden' : 'visible',
              opacity: isSubmitting ? 0.5 : 1
            }}
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="filter-btn on"
            style={{
              padding: '8px 24px',
              borderRadius: 'var(--border-radius-md)',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? 'Saving...' : step === 4 ? 'Complete Onboarding ✨' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
