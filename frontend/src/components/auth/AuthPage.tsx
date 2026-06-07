import { useState } from 'react';
import { useCurio } from '../../contexts/CurioContext';

export function AuthPage() {
  const { login, register } = useCurio();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!email.trim() || !username.trim() || !password.trim()) {
          throw new Error('All fields are required.');
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
              />
            </div>
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
      </div>
    </div>
  );
}
