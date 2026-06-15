import { useState } from 'react';

interface QuickQuestFormProps {
  igniteQuest: (topic: string, hint?: string) => void;
}

export function QuickQuestForm({ igniteQuest }: QuickQuestFormProps) {
  const [topicFocused, setTopicFocused] = useState(false);
  const [hintFocused, setHintFocused] = useState(false);

  return (
    <div style={{
      background: 'var(--surface-cream)',
      border: '1.5px solid var(--outline-variant)',
      borderRadius: '14px',
      padding: '22px 24px 20px',
      marginBottom: '24px',
      position: 'relative',
      boxShadow: '0 2px 12px rgba(70,55,40,0.05)',
    }}>
      {/* Watercolour tint in corner */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '110px', height: '80px',
        background: 'radial-gradient(ellipse at top right, rgba(174,198,207,0.18) 0%, transparent 70%)',
        borderRadius: '0 14px 0 0',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <i className="ti ti-pencil" style={{ fontSize: '16px', color: 'var(--primary)' }} />
        <h3 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--ink-charcoal)',
          margin: 0,
        }}>
          Start reading
        </h3>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.currentTarget;
          const topicVal = (target.elements.namedItem('quickTopic') as HTMLInputElement).value;
          const hintVal = (target.elements.namedItem('quickHint') as HTMLInputElement).value;
          if (topicVal.trim()) igniteQuest(topicVal.trim(), hintVal.trim() || undefined);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {/* Topic input row */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: topicFocused ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
            border: topicFocused
              ? '1.5px solid var(--primary-container)'
              : '1.5px solid var(--outline-variant)',
            borderRadius: '10px',
            padding: '0 12px',
            transition: 'border-color 0.2s, background 0.2s',
            boxShadow: topicFocused ? '0 0 0 3px rgba(174,198,207,0.15)' : 'none',
          }}>
            <i className="ti ti-search" style={{ fontSize: '14.5px', color: 'var(--ink-wash)', flexShrink: 0 }} />
            <input
              name="quickTopic"
              type="text"
              placeholder="Topic (e.g. History of the Berlin Wall)"
              onFocus={() => setTopicFocused(true)}
              onBlur={() => setTopicFocused(false)}
              style={{
                flex: 1,
                fontSize: '13.5px',
                padding: '11px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-body)',
                color: 'var(--ink-charcoal)',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              flexShrink: 0,
              fontSize: '13px',
              fontWeight: 650,
              padding: '0 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary) 0%, #6a8a94 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.01em',
              transition: 'opacity 0.2s, transform 0.15s',
              boxShadow: '0 2px 8px rgba(75,98,106,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
          >
            Research
          </button>
        </div>

        {/* Hint row — clearly differentiated */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: hintFocused
            ? 'rgba(174,198,207,0.10)'
            : 'rgba(174,198,207,0.05)',
          border: `1.5px dashed ${hintFocused ? 'var(--primary-container)' : 'rgba(174,198,207,0.5)'}`,
          borderRadius: '10px',
          padding: '9px 14px',
          transition: 'border-color 0.2s, background 0.2s',
        }}>
          <i className="ti ti-bulb" style={{
            fontSize: '15px',
            color: 'var(--primary)',
            flexShrink: 0,
            opacity: hintFocused ? 1 : 0.7,
            transition: 'opacity 0.2s',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '10px',
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              Angle
            </span>
            <input
              name="quickHint"
              type="text"
              placeholder="e.g. focus on economics, for a 10-year-old..."
              onFocus={() => setHintFocused(true)}
              onBlur={() => setHintFocused(false)}
              style={{
                width: '100%',
                fontSize: '12.5px',
                padding: '2px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--ink-charcoal)',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
