// LeftSidebar — Navigation and session history panel.
// Redesigned to match the Tabler Icons layout while retaining premium collapsibility.

import { useCallback, useEffect, useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';
import { SidebarRecentSkeleton } from '../common/Skeletons';

const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 56;
const COLLAPSED_KEY = 'curio_left_sidebar_collapsed';

export function LeftSidebar() {
  const {
    history,
    activeTab,
    changeTab,
    loadArticle,
    deleteArticle,
    user,
    logout,
    isGeneratingArticle,
    currentTopic,
    isMenuOpen,
    setMenuOpen,
    isLoadingUserData,
    activeArticleId,
  } = useCurio();

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem(COLLAPSED_KEY) === 'true'
  );

  function syncMainMargin(isCollapsed: boolean) {
    const main = document.querySelector<HTMLElement>('.main-content');
    if (main) {
      main.style.marginLeft = `${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`;
    }
  }

  useEffect(() => {
    syncMainMargin(collapsed);
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed(p => !p), []);

  const navigateTo = useCallback((tab: 'home' | 'discover' | 'search' | 'library' | 'interests' | 'settings') => {
    changeTab(tab);
    setMenuOpen(false);
  }, [changeTab, setMenuOpen]);

  const selectArticle = useCallback((id: string) => {
    loadArticle(id);
    setMenuOpen(false);
  }, [loadArticle, setMenuOpen]);

  const handleSignOut = useCallback(() => {
    logout();
    setMenuOpen(false);
  }, [logout, setMenuOpen]);

  return (
    <>
      {isMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMenuOpen(false)} 
        />
      )}
      <aside 
        className={`left-sidebar${collapsed ? ' left-sidebar--collapsed' : ''}${isMenuOpen ? ' left-sidebar--open' : ''}`} 
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
      
      {/* ── Top Brand and Toggle ────────────────────────────── */}
      <div className="sidebar-top">
        <div className="brand">
          <button
            onClick={toggle}
            className="brand-logo-btn"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              padding: 0,
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <img src="/favicon.svg" alt="Curios Logo" style={{ width: '18px', height: '18px', display: 'block' }} />
          </button>
          <span className="sidebar-brand-name" style={{ fontWeight: 650, fontSize: '14px', color: 'var(--color-text-primary)' }}>Curios</span>
        </div>

        {/* Home Link */}
        <a 
          className={`nav-item${activeTab === 'home' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('home'); }}
          title="Home"
        >
          <i className="ti ti-home"></i>
          <span className="nav-label">Home</span>
        </a>

        {/* Discover Link */}
        <a 
          className={`nav-item${activeTab === 'discover' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('discover'); }}
          title="Discover"
        >
          <i className="ti ti-sparkles"></i>
          <span className="nav-label">Discover</span>
        </a>

        {/* Search Link */}
        <a 
          className={`nav-item${activeTab === 'search' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('search'); }}
          title="Search"
        >
          <i className="ti ti-search"></i>
          <span className="nav-label">Search</span>
        </a>
      </div>

      {/* ── Mid (Your Content) ─────────────────────────────── */}
      <div className="sidebar-mid">
        <div className="section-label">Your content</div>
        
        {/* Library Link */}
        <a 
          className={`nav-item${activeTab === 'library' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('library'); }}
          title="Library"
        >
          <i className="ti ti-books"></i>
          <span className="nav-label">Library</span>
          {history.length > 0 && <div className="badge">{history.length}</div>}
        </a>

        {/* Interests Link */}
        <a 
          className={`nav-item${activeTab === 'interests' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('interests'); }}
          title="My interests"
        >
          <i className="ti ti-adjustments-horizontal"></i>
          <span className="nav-label">My interests</span>
        </a>

        {/* Recent Quests Section */}
        <div className="sidebar-history-section">
          {isLoadingUserData ? (
            <>
              <div className="section-label" style={{ marginTop: '8px' }}>Recent</div>
              <SidebarRecentSkeleton count={3} />
            </>
          ) : (history.length > 0 || isGeneratingArticle) && (
            <>
              <div className="section-label" style={{ marginTop: '8px' }}>Recent</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {isGeneratingArticle && (
                  <div 
                    className="recent-item" 
                    style={{ 
                      opacity: 0.85, 
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      color: 'var(--tertiary)',
                      background: 'rgba(174,198,207,0.08)'
                    }}
                  >
                    <i className="ti ti-loader" style={{ fontSize: '13px', flexShrink: 0, animation: 'spin 1.4s linear infinite' }} aria-hidden="true"></i>
                    <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentTopic ? `${currentTopic}...` : 'Uncovering wonder...'}
                    </span>
                  </div>
                )}
                {history.map((entry) => {
                  const isActive = entry.id === activeArticleId;
                  return (
                    <div 
                      key={entry.id} 
                      className={`recent-item${isActive ? ' active' : ''}`} 
                      onClick={() => selectArticle(entry.id)}
                    >
                      <i className="ti ti-file-text" style={{ fontSize: '13px', flexShrink: 0 }} aria-hidden="true"></i>
                      <span>{entry.topic}</span>
                      <i 
                        className="ti ti-trash recent-trash" 
                        aria-hidden="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${entry.topic}"?`)) deleteArticle(entry.id);
                        }}
                      ></i>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom (Settings & Profile) ────────────────────── */}
      <div className="sidebar-bottom">
        {/* Settings Link */}
        <a 
          className={`nav-item${activeTab === 'settings' ? ' active' : ''}`}
          href="#"
          onClick={(e) => { e.preventDefault(); navigateTo('settings'); }}
          title="Settings"
          style={{ marginBottom: '8px' }}
        >
          <i className="ti ti-settings"></i>
          <span className="nav-label">Settings</span>
        </a>

        {/* Token Balance with Progress Bar */}
        {user && (
          <div 
            className="sidebar-tokens nav-item"
            style={{ cursor: 'default', pointerEvents: 'auto', marginBottom: '8px' }}
            title={`${(user.token_balance ?? 100000).toLocaleString()} / 100,000 tokens remaining`}
          >
            <i className="ti ti-coins" style={{ color: 'var(--primary)' }} aria-hidden="true"></i>
            <div className="sidebar-tokens-inner">
              <div className="sidebar-tokens-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 500 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Remaining</span>
                <span style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                  {Math.round((user.token_balance ?? 100000) / 1000).toLocaleString()}k
                </span>
              </div>
              <div className="sidebar-tokens-bar-bg" style={{ height: '6px', background: 'var(--surface-container-high, #e9e8e8)', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  className="sidebar-tokens-bar-fill" 
                  style={{ 
                    height: '100%', 
                    background: 'var(--primary)', 
                    width: `${Math.min(100, Math.max(0, ((user.token_balance ?? 100000) / 100000) * 100))}%`,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* User profile info */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <div className="sidebar-avatar-inner">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user.username}
              </span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button 
          className="nav-item" 
          onClick={handleSignOut}
          title="Sign Out"
          style={{ 
            border: 'none', 
            background: 'transparent', 
            width: '100%', 
            color: 'var(--secondary)'
          }}
        >
          <i className="ti ti-logout"></i>
          <span className="nav-label">Sign Out</span>
        </button>
      </div>

    </aside>
    </>
  );
}
