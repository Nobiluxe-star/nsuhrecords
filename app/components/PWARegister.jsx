'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('✅ ClassLogs Service Worker registered:', reg.scope))
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  }, []);

  return null;
}