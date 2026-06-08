import { useCurio } from '../../contexts/CurioContext';

export function MobileHeader() {
  const { changeTab, isTutorOpen, setTutorOpen, isMenuOpen, setMenuOpen, activeArticleId, isGeneratingArticle } = useCurio();
  const showTutorToggle = !!(activeArticleId || isGeneratingArticle);

  return (
    <header className="mobile-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="icon-btn"
          aria-label="Toggle Menu"
          onClick={() => setMenuOpen(!isMenuOpen)}
          style={{
            color: isMenuOpen ? '#7F77DD' : 'var(--primary-container)',
            background: isMenuOpen ? 'rgba(127, 119, 221, 0.12)' : 'transparent',
          }}
        >
          <span className="material-symbols-outlined">{"menu"}</span>
        </button>
        <span className="logo">{'Curios'}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {showTutorToggle && (
          <button
            className="icon-btn"
            aria-label="Tutor Chat"
            onClick={() => setTutorOpen(!isTutorOpen)}
            style={{
              color: isTutorOpen ? '#7F77DD' : 'var(--primary-container)',
              background: isTutorOpen ? 'rgba(127, 119, 221, 0.12)' : 'transparent',
            }}
          >
            <span className="material-symbols-outlined">{"forum"}</span>
          </button>
        )}
        <button className="icon-btn" aria-label="Account">
          <span className="material-symbols-outlined">{"account_circle"}</span>
        </button>
        <button
          className="icon-btn"
          aria-label="Settings"
          onClick={() => changeTab('settings')}
        >
          <span className="material-symbols-outlined">{"settings"}</span>
        </button>
      </div>
    </header>
  );
}
