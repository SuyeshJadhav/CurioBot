// MobileHeader — Sticky top bar for mobile viewports.
// Hidden on desktop via the `.mobile-bar` CSS rule.
// Reads nothing from context — it is purely presentational.

export function MobileHeader() {
  return (
    <header className="mobile-bar">
      <span className="logo">CurioBot</span>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="icon-btn" aria-label="Account">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
        <button className="icon-btn" aria-label="Settings">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
