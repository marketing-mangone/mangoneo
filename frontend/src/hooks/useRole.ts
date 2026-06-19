'use client';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/api';

export function useRole(): string | null {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const user = auth.getCurrentUser();
    setRole(user?.role ?? null);
  }, []);
  return role;
}

export function useIsGuest(): boolean {
  const role = useRole();
  return role === 'guest';
}

export function useIsAdmin(): boolean {
  const role = useRole();
  return role === 'admin';
}
