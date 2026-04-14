
// app/components/Header.js
'use client';
import Image from 'next/image';
import Link from 'next/link';
// import logo from '../../public/logo.png'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const router = useRouter();
  const [clock, setClock] = useState('');
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem('username') || 'User');
    const tick = () => setClock(new Date().toLocaleString('en-IN', {
      weekday:'short', day:'2-digit', month:'short',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
       <Link href="/" className="logo">
  <Image 
    src="/logo.png" 
    alt="MachineTrack Logo" 
    width={150} 
    height={50}
    className="logo-img"
  />
  <span className="logo-text">MachineTrack</span>
</Link>

        <div className="header-right">
          {mounted && <span className="clock">{clock}</span>}
          <div className="live-pill">
            <div className="dot-pulse"></div>
            LIVE
          </div>
       
          {mounted && (
            <div className="user-chip">
              <span className="username">{username}</span>
              <button className="logout-btn" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}