'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const [clock, setClock] = useState('');
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem('username') || 'User');

    const tick = () => {
      setClock(new Date().toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '62px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 28px',
          height: '62px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="9" fill="url(#logoGrad)"/>
              <path d="M8 22l4.5-7 4 4.5 4.5-9 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="25.5" cy="10" r="2.8" fill="#10b981"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Machine Runtime</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'rgba(16,185,129,.1)',
              border: '1px solid rgba(16,185,129,.25)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--green)'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)' }}></span>
              LIVE
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 28px',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link href="/" className="logo" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none'
        }}>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect width="34" height="34" rx="9" fill="url(#logoGrad)"/>
            <path d="M8 22l4.5-7 4 4.5 4.5-9 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="25.5" cy="10" r="2.8" fill="#10b981"/>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <span style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Machine Runtime</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.77rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: 'rgba(16,185,129,.1)',
            border: '1px solid rgba(16,185,129,.25)',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--green)'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', animation: 'livepulse 1.8s infinite' }}></span>
            LIVE
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: 'var(--card2)',
            border: '1px solid var(--border)',
            fontSize: '0.75rem'
          }}>
            <span style={{ fontWeight: 700 }}>{username}</span>
            <button onClick={logout} style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '5px'
            }}>Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
}