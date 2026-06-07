import { useCurio } from '../../contexts/CurioContext';

export function MobileHeader() {
  const { changeTab } = useCurio();

  return (
    <header className="mobile-bar">
      <span className="logo">{'CurioBot'}</span>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
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
