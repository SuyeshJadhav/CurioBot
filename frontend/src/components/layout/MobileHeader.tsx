import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipeline } from '../../contexts/PipelineContext';
import { useChat } from '../../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';

export function MobileHeader() {
  const { changeTab, isMenuOpen, setMenuOpen, user, logout } = useAuth();
  const { activeArticleId, isGeneratingArticle } = usePipeline();
  const { isTutorOpen, setTutorOpen } = useChat();
  const navigate = useNavigate();
  const showTutorToggle = !!(activeArticleId || isGeneratingArticle);

  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const handleLogoClick = () => {
    changeTab('home');
    setMenuOpen(false);
    navigate('/');
  };

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
        <span 
          className="logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {'Curios'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
        
        {/* Profile Dropdown Container */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button 
            className="icon-btn" 
            aria-label="Account"
            onClick={() => setProfileOpen(!isProfileOpen)}
            style={{
              color: isProfileOpen ? '#7F77DD' : 'var(--primary-container)',
              background: isProfileOpen ? 'rgba(127, 119, 221, 0.12)' : 'transparent',
            }}
          >
            <span className="material-symbols-outlined">{"account_circle"}</span>
          </button>
          
          {isProfileOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                background: 'var(--color-background-primary, #fdfcf8)',
                border: '1.5px solid var(--color-border-secondary, #e5e9ec)',
                borderRadius: 'var(--border-radius-md, 8px)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '200px',
                zIndex: 100
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-container, rgba(127, 119, 221, 0.12))',
                  color: 'var(--primary, #7F77DD)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}>
                  {user?.username?.substring(0, 2).toUpperCase() || 'US'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #1e293b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.username || 'User'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary, #64748b)' }}>
                    Explorer Account
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '0.5px solid var(--color-border-tertiary, #f1f5f9)', margin: '4px 0' }} />

              {user && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #475569)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Remaining:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary, #7F77DD)' }}>
                    {user.token_balance !== undefined ? user.token_balance.toLocaleString() : '100,000'}
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  logout();
                  setProfileOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: 'rgba(254, 203, 203, 0.18)',
                  color: 'var(--error, #e11d48)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm, 6px)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginTop: '4px',
                  width: '100%',
                  transition: 'background 0.2s'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
        
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
