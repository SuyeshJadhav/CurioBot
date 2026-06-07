import { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';

const INTEREST_TOPICS: Record<string, string[]> = {
  "how things work": ["How Microwave Ovens Heat Food", "Why Mirrors Don't Reverse Up and Down"],
  "surprising science": ["The Paradox of Schrodinger's Cat", "Why Ice is Slippery"],
  "forgotten history": ["The Lost Library of Alexandria", "The Voynich Manuscript Mystery"],
  "human behavior": ["The Bystander Effect Explained", "How the Hawthorne Effect Shapes Work"],
  "food and culture": ["The Chemistry of Sourdough Bread", "Why Tomatoes Conquered the World"],
  "money and power": ["The Tulip Mania Bubble", "The Jevons Paradox in Modern Markets"],
  "science": ["How Photosynthesis Powers Life", "The Physics of Sailing"],
  "history": ["The Rosetta Stone Discovery", "How the Calendar Was Formed"],
};

export function HomeCanvas() {
  const {
    history,
    savedSketches,
    dailyWonder,
    isGeneratingWonder,
    generateDailyWonder,
    loadArticle,
    igniteQuest,
    interests,
    readTimestamps,
  } = useCurio();

  // Stable stateful reference to current time to satisfy render purity rules
  const [now] = useState(() => new Date());

  // Helper to format local date string (YYYY-MM-DD)
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(now);
  const yesterdayStr = getLocalDateString(new Date(now.getTime() - 86400000));

  const localReadDatesSet = new Set(
    readTimestamps.map((ts) => getLocalDateString(new Date(ts)))
  );

  // Compute Streak
  const calculateStreak = () => {
    let streak = 0;
    let currentDateStr = todayStr;

    if (!localReadDatesSet.has(todayStr) && !localReadDatesSet.has(yesterdayStr)) {
      return 0;
    }

    if (!localReadDatesSet.has(todayStr)) {
      currentDateStr = yesterdayStr;
    }

    const testDate = new Date(currentDateStr);
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateString(testDate);
      if (localReadDatesSet.has(dateStr)) {
        streak++;
        testDate.setDate(testDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streakCount = calculateStreak();

  // Last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return {
      dateStr: getLocalDateString(d),
      dayLabel: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      dateLabel: d.getDate(),
    };
  });

  // Pick recommendations from interests
  const getQueuedTopics = () => {
    const matchedTopics: string[] = [];
    const activeInterests = interests.length > 0 ? interests : ["science", "history", "human behavior"];
    
    activeInterests.forEach((interest) => {
      const normalized = interest.toLowerCase().trim();
      const list = INTEREST_TOPICS[normalized];
      if (list && list.length > 0) {
        list.forEach((topic) => {
          if (!matchedTopics.includes(topic)) {
            matchedTopics.push(topic);
          }
        });
      }
    });

    // Fallbacks
    if (matchedTopics.length === 0) {
      matchedTopics.push("The Hawthorne Effect", "The Dunning-Kruger Curve Revisited", "Why Maps Always Lie");
    }

    return matchedTopics.slice(0, 3);
  };

  const queuedTopics = getQueuedTopics();

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
            igniteQuest(val.trim());
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
        <div className="metric">
          <p className="metric-label">🔥 Reading streak</p>
          <p className="metric-val">{streakCount} {streakCount === 1 ? 'day' : 'days'}</p>
        </div>
        <div className="metric">
          <p className="metric-label">📖 Articles read</p>
          <p className="metric-val">{history.length}</p>
        </div>
        <div className="metric">
          <p className="metric-label">💾 Saved</p>
          <p className="metric-val">{savedSketches.length}</p>
        </div>
      </div>

      {/* Streak grid */}
      <div className="streak-bar" style={{ marginBottom: '24px', justifyContent: 'space-between' }}>
        {last14Days.map((day) => {
          const isDone = localReadDatesSet.has(day.dateStr);
          return (
            <div 
              key={day.dateStr} 
              className={`streak-day${isDone ? ' done' : ''}`}
              title={`${day.dateStr}: ${isDone ? 'Read' : 'No activity'}`}
              style={{ 
                flex: 1, 
                height: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '9px',
                color: isDone ? '#fff' : 'var(--color-text-tertiary)',
                fontWeight: 'bold',
                cursor: 'default'
              }}
            >
              {day.dateLabel}
            </div>
          );
        })}
      </div>

      {/* Today's Article Card */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '18px' }}>
        <p className="card-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
          Today's Article
        </p>

        {isGeneratingWonder ? (
          <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined ignite-icon" style={{ fontSize: '1.2rem', animation: 'spin 1.4s linear infinite' }}>
              progress_activity
            </span>
            <span className="font-hand" style={{ fontSize: '1.1rem', color: 'var(--tertiary)' }}>
              Orchestrating today's wonder...
            </span>
          </div>
        ) : dailyWonder ? (
          <div 
            style={{ cursor: 'pointer', marginTop: '6px' }}
            onClick={() => dailyWonder.article_id && loadArticle(dailyWonder.article_id)}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 650, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
              {dailyWonder.topic}
            </h3>
            <p className="card-body" style={{ fontSize: '12.5px', marginBottom: '8px' }}>
              {dailyWonder.summary}
            </p>
            <span className="tag tag-teal" style={{ textTransform: 'capitalize' }}>
              {dailyWonder.domain}
            </span>
          </div>
        ) : (
          <div style={{ padding: '8px 0', marginTop: '4px' }}>
            <p className="card-body" style={{ marginBottom: '12px' }}>
              Today's handpicked wonder hasn't been generated yet. Spark it now to unlock today's mystery!
            </p>
            <button 
              className="new-quest-btn" 
              style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              onClick={generateDailyWonder}
            >
              ✨ Ignite Today's Wonder
            </button>
          </div>
        )}
      </div>

      {/* Up Next Card */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <p className="card-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Up next — recommended topics
        </p>
        <p className="card-body" style={{ marginBottom: '12px', fontSize: '12px' }}>
          Click any of these recommended concepts to spawn a new research quest:
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {queuedTopics.map((topic) => (
            <div 
              key={topic}
              onClick={() => igniteQuest(topic)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s',
                fontSize: '12.5px',
                fontWeight: 500,
                color: 'var(--color-text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(3px)';
                e.currentTarget.style.borderColor = 'var(--primary-container)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--color-border-tertiary)';
              }}
            >
              <i className="ti ti-arrow-right-circle" style={{ color: 'var(--primary)', fontSize: '14px' }}></i>
              <span>{topic}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
