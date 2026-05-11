'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Bell, TrendingUp, FileText, CheckSquare, AtSign, Check, Trash2 } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import type { Notification } from '@/types';
import { formatRelative } from '@/lib/utils';

const TYPE_CONFIG = {
  kpi_alert: { icon: TrendingUp, color: 'text-[#F79C31] bg-[#fef5e7]', label: 'KPI' },
  document_update: { icon: FileText, color: 'text-blue-600 bg-blue-50', label: 'Documento' },
  task_assigned: { icon: CheckSquare, color: 'text-purple-600 bg-purple-50', label: 'Tarea' },
  mention: { icon: AtSign, color: 'text-green-600 bg-green-50', label: 'Mención' },
};

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const remove = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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
              className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todo como leído
            </button>
          ) : null
        }
      />

      <div className="px-10 py-10 max-w-3xl">
        {notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-[#d0d0e0] mx-auto mb-3" />
            <p className="text-[#4a4a6a] font-medium">Sin notificaciones</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <Card
                  key={n.id}
                  className={`p-4 transition-all ${!n.read ? 'border-l-4 border-l-[#F79C31]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${n.read ? 'text-[#4a4a6a]' : 'text-[#1a1a2e]'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#F79C31] flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-[#8888a8] mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-[#8888a8] mt-1.5">{formatRelative(n.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] hover:text-[#4a4a6a]">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#8888a8] hover:text-red-500">
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
