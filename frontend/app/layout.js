

// app/layout.js
'use client';
import './styles/globals.css';
import './styles/login.css';
import './styles/dashboard.css';
import './styles/setup.css';
import './styles/device.css';
import './styles/components.css';
import './styles/qr-generate.css';
import './styles/admin.css'
import { useEffect, useState } from 'react';

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MachineTrack</title>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}