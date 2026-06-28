'use client';

import { useEffect } from 'react';
import { silentRefresh, auth } from '@/lib/api';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export function SessionKeepAlive() {
  useEffect(() => {
    if (!auth.isAuthenticated()) return;

    // Hydrate _memToken immediately on mount
    silentRefresh();

    // Keep token alive proactively — fires every 10 min before the 8-hour expiry
    const id = setInterval(() => {
      if (auth.isAuthenticated()) silentRefresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return null;
}
