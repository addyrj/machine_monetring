'use client';

export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '18px',
      fontSize: '0.72rem',
      color: 'var(--muted)',
      borderTop: '1px solid var(--border)'
    }}>
      Machine Runtime Track &nbsp;·&nbsp; {new Date().getFullYear()}
    </footer>
  );
}