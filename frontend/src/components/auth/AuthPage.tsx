import { useState, useEffect } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function AuthPage() {
  const { login, loginWithOAuth, register } = useCurio();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setLoading(true);
        loginWithOAuth(accessToken)
          .then(() => {
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'OAuth login failed');
            setLoading(false);
          });
      }
    }
  }, [loginWithOAuth]);

  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = isLengthValid && hasUppercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!email.trim() || !username.trim() || !password.trim()) {
          throw new Error('All fields are required.');
        }
        if (!isPasswordValid) {
          throw new Error('Please ensure your password meets all requirements.');
        }
        await register(email, username, password);
      } else {
        if (!username.trim() || !password.trim()) {
          throw new Error('Username/Email and Password are required.');
        }
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: 'var(--canvas-bg)',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <div className="noise-overlay" />

      <div
        className="paper-shadow sketch-border"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--surface-cream)',
          padding: '2.5rem 2rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeInUp 0.5s ease',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: '2.2rem',
              fontWeight: 700,
              fontStyle: 'italic',
              color: 'var(--ink-charcoal)',
              marginBottom: '0.25rem',
            }}
          >
            {'CurioBot'}
          </h1>
          <span
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: '1.25rem',
              color: 'var(--tertiary)',
            }}
          >
            {'Ignite your curiosity...'}
          </span>
        </div>

        {/* Heading */}
        <h2
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--ink-charcoal)',
            marginBottom: '1.5rem',
          }}
        >
          {isRegister ? 'Begin Your Journey' : 'Log In to Your Journal'}
        </h2>

        {/* Error notification */}
        {error && (
          <div
            className="sketch-border"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'rgba(186, 26, 26, 0.08)',
              border: '1.5px solid var(--error)',
              color: 'var(--error)',
              fontSize: '0.875rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
              {'warning'}
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {isRegister && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}
                htmlFor="email"
              >
                {'Email Address'}
              </label>
              <div className="chat-input-wrap">
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
              htmlFor="username"
            >
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <div className="chat-input-wrap">
              <input
                id="username"
                type="text"
                placeholder={isRegister ? 'your_nickname' : 'username or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--primary)',
              }}
              htmlFor="password"
            >
              {'Password'}
            </label>
            <div className="chat-input-wrap">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>
            {isRegister && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--ink-wash)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isLengthValid ? 'var(--success-green)' : 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{isLengthValid ? 'check_circle' : 'circle'}</span> At least 8 characters
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasUppercase ? 'var(--success-green)' : 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{hasUppercase ? 'check_circle' : 'circle'}</span> At least 1 uppercase letter
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasNumber ? 'var(--success-green)' : 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{hasNumber ? 'check_circle' : 'circle'}</span> At least 1 number
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="new-quest-btn"
            style={{
              marginTop: '0.75rem',
              padding: '0.85rem',
              border: '2px solid var(--ink-charcoal)',
              background: 'var(--surface-cream)',
              color: 'var(--ink-charcoal)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
            }}
            disabled={loading}
          >
            {loading ? (
              <span
                className="material-symbols-outlined"
                style={{
                  animation: 'spin 1.4s linear infinite',
                  fontSize: '1.2rem',
                }}
              >
                {'progress_activity'}
              </span>
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Open Journal'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--ink-wash)' }}>
            {isRegister ? 'Already registered? ' : "First time explorer? "}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600,
              padding: '0 0.2rem',
            }}
            disabled={loading}
          >
            {isRegister ? 'Log In here' : 'Sign Up here'}
          </button>
        </div>

        {/* OAuth Section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
            <hr style={{ flex: 1, borderColor: 'var(--outline-variant)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-wash)' }}>OR</span>
            <hr style={{ flex: 1, borderColor: 'var(--outline-variant)' }} />
          </div>
          <button
            type="button"
            className="new-quest-btn"
            style={{
              width: '100%',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-paper)',
              color: 'var(--ink-charcoal)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
              window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}/auth/callback`;
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
