// LeftSidebar — Navigation and session history panel.
// Reads: history, currentTopic, clearSession from CurioContext.
// Width: 256px fixed, matches .main-content margin-left in CSS.

import { useCurio } from '../../contexts/CurioContext';
import { HistoryItem } from './HistoryItem';

const NAV_LINKS = [
  { icon: 'auto_stories', label: 'Journal Home', href: '#' },
  { icon: 'lightbulb',    label: 'Daily Wonder',  href: '#' },
  { icon: 'bookmark_heart', label: 'Saved Sketches', href: '#' },
  { icon: 'history',      label: 'History',        href: '#' },
  { icon: 'auto_awesome_motion', label: 'Library', href: '#' },
];

export function LeftSidebar() {
  const { history, currentTopic, igniteQuest } = useCurio();

  return (
    <aside className="left-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <h1>CurioBot</h1>
        <h2>My History</h2>
        <p>Past Explorations</p>
      </div>

      {/* Nav */}
      <nav>
        {NAV_LINKS.map(({ icon, label, href }) => (
          <a
            key={label}
            className={`nav-link${currentTopic === null && label === 'Journal Home' ? ' active' : ''}`}
            href={href}
            aria-label={label}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
          </a>
        ))}

        {/* Session history */}
        {history.length > 0 && (
          <div className="history-items">
            {history.map((entry) => (
              <HistoryItem
                key={entry.id}
                topic={entry.topic}
                onClick={() => igniteQuest(entry.topic)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer CTA */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '2px dashed #cbd5e1' }}>
        <button
          className="new-quest-btn"
          onClick={() => igniteQuest()}
          aria-label="Start a new quest"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
          Ignite New Quest
        </button>
      </div>
    </aside>
  );
}
