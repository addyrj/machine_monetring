'use client';

// app/layout.js
import './styles/globals.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/setup.css';
import './styles/device.css';
import './styles/components.css'; 
import { useEffect, useState } from 'react';

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </body>
    </html>
  );
}