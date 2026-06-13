'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Bell, TrendingUp, CheckSquare, Check, Trash2, Clock, AlertTriangle, UserPlus, Loader2,
} from 'lucide-react';
import { notificationsApi, type ApiNotification, type NotificationType } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  lead_assigned:    { icon: UserPlus,      color: 'text-blue-600 bg-blue-50' },
  task_assigned:    { icon: CheckSquare,   color: 'text-purple-600 bg-purple-50' },
  task_due:         { icon: Clock,         color: 'text-[var(--t-f79c31)] bg-[var(--s-fef5e7)]' },
  followup_overdue: { icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  kpi_alert:        { icon: TrendingUp,    color: 'text-[var(--t-f79c31)] bg-[var(--s-fef5e7)]' },
  system:           { icon: Bell,          color: 'text-[var(--t-4a4a6a)] bg-[var(--s-f0f0f0)]' },
};

export default function NotificacionesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await notificationsApi.markRead(id); } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await notificationsApi.markAllRead(); } catch (e) { console.error(e); }
  };

  const remove = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await notificationsApi.dismiss(id); } catch (e) { console.error(e); }
  };

  const open = (n: ApiNotification) => {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(n.link);
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="animate-fade-in">
      <Header
        title="Notificaciones"
        subtitle={`${unread} sin leer`}
        actions={
          unread > 0 ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todo como leído
            </button>
          ) : null
        }
      />

      <div className="px-10 py-10 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--t-f79c31)]" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-[var(--t-d0d0e0)] mx-auto mb-3" />
            <p className="text-[var(--t-4a4a6a)] font-medium">Sin notificaciones</p>
            <p className="text-xs text-[var(--t-8888a8)] mt-1">Te avisaremos sobre tareas, seguimientos y leads asignados.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <Card
                  key={n.id}
                  className={`p-4 transition-all ${n.link ? 'cursor-pointer hover:shadow-md' : ''} ${!n.read ? 'border-l-4 border-l-[#F79C31]' : ''}`}
                >
                  <div className="flex items-start gap-3" onClick={() => open(n)}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${n.read ? 'text-[var(--t-4a4a6a)]' : 'text-[var(--t-1a1a2e)]'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--s-f79c31)] flex-shrink-0 mt-1" />}
                      </div>
                      {n.message && <p className="text-xs text-[var(--t-8888a8)] mt-0.5">{n.message}</p>}
                      <p className="text-[10px] text-[var(--t-8888a8)] mt-1.5">{formatRelative(n.created_at)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)]">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--t-8888a8)] hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
