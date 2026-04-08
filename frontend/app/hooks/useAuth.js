'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const publicPaths = ['/login'];
    
    if (!token && !publicPaths.includes(pathname)) {
      router.push('/login');
    } else if (token && pathname === '/login') {
      router.push('/');
    }
  }, [pathname, router]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    router.push('/login');
  };

  return { getAuthHeaders, logout };
}