// app/login/page.js 

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async () => {
    if (!username || !password) { setError('Username and password are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); setLoading(false); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      router.push('/');
    } catch {
      setError('Network error. Is the server running?');
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <>
      <Header />
      <main className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 18l5-8 4 5 4.5-9 5 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="login-title">Welcome back</div>
              <div className="login-sub">Sign in to manage your machines</div>
            </div>
          </div>

          {error && <div className="flash err">{error}</div>}

          <div className="login-fields">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={onKey}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={onKey}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <><span className="spinner"></span> Signing in…</> : 'Sign In'}
          </button>

          <div className="login-footer">Machine Runtime Tracker · Secure Login</div>
        </div>
      </main>
      <Footer />
    </>
  );
}