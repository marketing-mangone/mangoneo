'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { notificationsApi } from '@/lib/api';

export function SidebarWithBadge() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const fetchCount = () => {
      notificationsApi.unreadCount()
        .then(r => { if (active) setUnread(r.count); })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 60_000); // refresca cada minuto
    return () => { active = false; clearInterval(id); };
  }, []);

  // Al visitar la página de notificaciones, refresca el conteo poco después
  useEffect(() => {
    if (pathname === '/notificaciones') {
      const t = setTimeout(() => {
        notificationsApi.unreadCount().then(r => setUnread(r.count)).catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return <Sidebar unreadCount={unread} />;
}
