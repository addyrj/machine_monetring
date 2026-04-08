'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      router.push('/');
    } catch (e) {
      setError('Network error. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="login-container">
        <div className="login-box">
          <div className="login-title">Welcome back</div>
          <div className="login-sub">Sign in to manage your machines</div>
          
          {error && <div className="flash err">{error}</div>}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? <div className="spin-wrap"><div className="spin"></div>Signing in…</div> : 'Sign In'}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}