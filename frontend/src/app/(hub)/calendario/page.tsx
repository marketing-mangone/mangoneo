'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Globe, Mic, Play, Video, Music,
} from 'lucide-react';
import { MOCK_EVENTS } from '@/lib/mock-data';
import type { CalendarEvent } from '@/types';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EVENT_COLORS: Record<CalendarEvent['type'], { bg: string; text: string; dot: string; label: string }> = {
  content: { bg: 'bg-blue-50', text: 'text-blue-700', dot: '#3b82f6', label: 'Contenido' },
  meeting: { bg: 'bg-purple-50', text: 'text-purple-700', dot: '#9333ea', label: 'Reunión' },
  deadline: { bg: 'bg-red-50', text: 'text-red-700', dot: '#ef4444', label: 'Entrega' },
  campaign: { bg: 'bg-[#fef5e7]', text: 'text-[#F79C31]', dot: '#F79C31', label: 'Campaña' },
  event: { bg: 'bg-green-50', text: 'text-green-700', dot: '#10b981', label: 'Evento' },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  instagram: <span className="text-[10px] font-bold">IG</span>,
  tiktok: <span className="text-[10px] font-bold">TT</span>,
  youtube: <Play className="w-3 h-3" />,
  linkedin: <span className="text-[10px] font-bold">LI</span>,
  facebook: <span className="text-[10px] font-bold">FB</span>,
  podcast: <Mic className="w-3 h-3" />,
  web: <Globe className="w-3 h-3" />,
  all: <Globe className="w-3 h-3" />,
};

function getEventDot(type: CalendarEvent['type']) {
  return EVENT_COLORS[type]?.dot || '#8888a8';
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026
  const [selectedDate, setSelectedDate] = useState<string | null>('2026-05-10');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return MOCK_EVENTS.filter(e => e.date === dateStr);
  };

  const selectedEvents = selectedDate
    ? MOCK_EVENTS.filter(e => e.date === selectedDate)
    : [];

  const upcomingEvents = [...MOCK_EVENTS]
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const cells: { day: number; currentMonth: boolean; dateStr: string }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, currentMonth: false, dateStr: '' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      currentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, dateStr: '' });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const stats = {
    total: MOCK_EVENTS.length,
    content: MOCK_EVENTS.filter(e => e.type === 'content').length,
    meetings: MOCK_EVENTS.filter(e => e.type === 'meeting').length,
    deadlines: MOCK_EVENTS.filter(e => e.type === 'deadline').length,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Calendario"
        subtitle="Planificación de contenido y actividades del equipo"
        actions={
          <button className="flex items-center gap-2 bg-[#F79C31] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Nuevo evento
          </button>
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: stats.total, label: 'Eventos totales', icon: '📅', color: 'text-[#0C2054]' },
            { val: stats.content, label: 'Piezas de contenido', icon: '✍️', color: 'text-blue-600' },
            { val: stats.meetings, label: 'Reuniones', icon: '👥', color: 'text-purple-600' },
            { val: stats.deadlines, label: 'Entregas', icon: '🚩', color: 'text-red-600' },
          ].map(({ val, label, icon, color }) => (
            <Card key={label} className="p-6 text-center">
              <p className="text-2xl mb-2">{icon}</p>
              <p className={`text-3xl font-bold tracking-tight ${color}`}>{val}</p>
              <p className="text-xs text-[#6b7280] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#111827]">
                  {MONTHS[month]} {year}
                </h2>
                <div className="flex gap-1">
                  <button onClick={prevMonth} className="p-2 hover:bg-[#f7f8fc] rounded-lg text-[#4a4a6a] transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(2026, 4, 1))}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#f7f8fc] text-[#4a4a6a] transition-colors"
                  >
                    Hoy
                  </button>
                  <button onClick={nextMonth} className="p-2 hover:bg-[#f7f8fc] rounded-lg text-[#4a4a6a] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-[#8888a8] uppercase tracking-wide py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((cell, idx) => {
                  const evs = cell.currentMonth ? getEventsForDate(cell.day) : [];
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  const hasEvents = evs.length > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => cell.currentMonth && setSelectedDate(cell.dateStr)}
                      className={`
                        min-h-[80px] p-1.5 rounded-lg cursor-pointer transition-all
                        ${!cell.currentMonth ? 'opacity-30 cursor-default' : 'hover:bg-[#f7f8fc]'}
                        ${isSelected ? 'bg-[#0C2054]/5 ring-2 ring-[#F79C31]' : ''}
                        ${isToday && !isSelected ? 'bg-[#fef5e7]' : ''}
                      `}
                    >
                      <div className={`
                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1
                        ${isToday ? 'bg-[#F79C31] text-white' : isSelected ? 'text-[#0C2054]' : 'text-[#4a4a6a]'}
                      `}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map(ev => (
                          <div
                            key={ev.id}
                            className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${EVENT_COLORS[ev.type].bg} ${EVENT_COLORS[ev.type].text}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {evs.length > 2 && (
                          <p className="text-[9px] text-[#8888a8] pl-1">+{evs.length - 2} más</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#f0f0f0]">
                {Object.entries(EVENT_COLORS).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: config.dot }} />
                    <span className="text-[11px] text-[#8888a8] font-medium">{config.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected day events */}
            {selectedDate && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-[#1a1a2e] mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F79C31]" />
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-[#8888a8]">Sin eventos este día</p>
                    <button className="mt-2 text-xs text-[#F79C31] font-semibold hover:underline">
                      + Agregar evento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map(ev => {
                      const evColor = EVENT_COLORS[ev.type];
                      return (
                        <div key={ev.id} className={`p-3 rounded-lg ${evColor.bg} border border-transparent hover:border-current/10 transition-all cursor-pointer`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${evColor.text} leading-tight`}>{ev.title}</p>
                              {ev.time && <p className={`text-[10px] mt-0.5 ${evColor.text} opacity-70`}>{ev.time}</p>}
                              {ev.description && <p className="text-[10px] text-[#4a4a6a] mt-1 line-clamp-2">{ev.description}</p>}
                            </div>
                            {ev.channel && CHANNEL_ICONS[ev.channel] && (
                              <span className={`flex-shrink-0 ${evColor.text}`}>{CHANNEL_ICONS[ev.channel]}</span>
                            )}
                          </div>
                          {ev.assignee && (
                            <p className={`text-[10px] mt-1.5 ${evColor.text} opacity-70`}>👤 {ev.assignee.split(' ')[0]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Upcoming */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">Próximos eventos</h3>
              <div className="space-y-2.5">
                {upcomingEvents.map(ev => {
                  const evColor = EVENT_COLORS[ev.type];
                  const evDate = new Date(ev.date + 'T12:00:00');
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-[#f7f8fc] rounded-lg p-1.5 -mx-1.5 transition-colors"
                      onClick={() => setSelectedDate(ev.date)}
                    >
                      <div className="text-center min-w-[32px]">
                        <p className="text-[#F79C31] font-bold text-sm leading-none">{evDate.getDate()}</p>
                        <p className="text-[#8888a8] text-[10px] uppercase">{evDate.toLocaleString('es', { month: 'short' })}</p>
                      </div>
                      <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: evColor.dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1a1a2e] truncate">{ev.title}</p>
                        <span className={`text-[10px] font-medium ${evColor.text}`}>{evColor.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Content by channel */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">Contenido por canal</h3>
              <div className="space-y-2">
                {[
                  { channel: 'instagram', label: 'Instagram', count: MOCK_EVENTS.filter(e => e.channel === 'instagram').length },
                  { channel: 'tiktok', label: 'TikTok', count: MOCK_EVENTS.filter(e => e.channel === 'tiktok').length },
                  { channel: 'youtube', label: 'YouTube', count: MOCK_EVENTS.filter(e => e.channel === 'youtube').length },
                  { channel: 'podcast', label: 'Podcast', count: MOCK_EVENTS.filter(e => e.channel === 'podcast').length },
                  { channel: 'facebook', label: 'Facebook', count: MOCK_EVENTS.filter(e => e.channel === 'facebook').length },
                ].map(({ channel, label, count }) => (
                  <div key={channel} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#8888a8]">{CHANNEL_ICONS[channel]}</span>
                      <span className="text-[#4a4a6a] font-medium">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#0C2054]" style={{ width: `${(count / 5) * 100}%` }} />
                      </div>
                      <span className="font-bold text-[#1a1a2e] w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
