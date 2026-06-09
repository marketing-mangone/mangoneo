'use client';
import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Globe, Mic, Play, X, Loader2, Trash2, AlertCircle,
} from 'lucide-react';
import { calendarApi, ApiCalendarEvent } from '@/lib/api';

const DAYS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  content:  { bg: 'bg-blue-50',      text: 'text-blue-700',   dot: '#3b82f6', label: 'Contenido' },
  meeting:  { bg: 'bg-purple-50',    text: 'text-purple-700', dot: '#9333ea', label: 'Reunión'   },
  deadline: { bg: 'bg-red-50',       text: 'text-red-700',    dot: '#ef4444', label: 'Entrega'   },
  campaign: { bg: 'bg-[var(--s-fef5e7)]',    text: 'text-[var(--t-f79c31)]',  dot: '#F79C31', label: 'Campaña'   },
  event:    { bg: 'bg-green-50',     text: 'text-green-700',  dot: '#10b981', label: 'Evento'    },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  instagram: <span className="text-[10px] font-bold">IG</span>,
  tiktok:    <span className="text-[10px] font-bold">TT</span>,
  youtube:   <Play className="w-3 h-3" />,
  linkedin:  <span className="text-[10px] font-bold">LI</span>,
  facebook:  <span className="text-[10px] font-bold">FB</span>,
  podcast:   <Mic className="w-3 h-3" />,
  web:       <Globe className="w-3 h-3" />,
};

// ── Add Event Modal ────────────────────────────────────────────────────────────

function AddEventModal({ defaultDate, onClose, onSuccess }: {
  defaultDate: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title,       setTitle]       = useState('');
  const [type,        setType]        = useState<ApiCalendarEvent['type']>('content');
  const [date,        setDate]        = useState(defaultDate);
  const [time,        setTime]        = useState('');
  const [channel,     setChannel]     = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const submit = async () => {
    if (!title.trim() || !date) { setError('El título y la fecha son obligatorios.'); return; }
    setSaving(true);
    setError('');
    try {
      await calendarApi.create({ title: title.trim(), type, date, time, channel, description, status: 'scheduled' });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al crear el evento.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f0f0)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <h3 className="font-bold text-[var(--t-1a1a2e)]">Nuevo evento</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Título <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del evento"
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EVENT_COLORS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key as ApiCalendarEvent['type'])}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    type === key ? `${cfg.bg} ${cfg.text} border-current` : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Fecha <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Hora <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span></label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
              />
            </div>
          </div>

          {/* Canal */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Canal <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span></label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] bg-[var(--surface)] transition-colors"
            >
              <option value="">Sin canal específico</option>
              {['instagram','tiktok','youtube','linkedin','facebook','podcast','web'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Descripción <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalles del evento..."
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[var(--s-f79c31)] rounded-lg hover:bg-[var(--s-e08a20)] transition-colors disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const [currentDate,  setCurrentDate]  = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [events,       setEvents]       = useState<ApiCalendarEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [addOpen,      setAddOpen]      = useState(false);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calendarApi.list(monthKey);
      setEvents(res.results);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const getEventsForDate = (day: number) => {
    const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date === d);
  };

  const selectedEvents = events.filter(e => e.date === selectedDate);

  const upcomingEvents = [...events]
    .filter(e => e.date >= todayStr)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await calendarApi.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // Build calendar grid
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: { day: number; currentMonth: boolean; dateStr: string }[] = [];
  for (let i = firstDay-1; i >= 0; i--)
    cells.push({ day: daysInPrev-i, currentMonth: false, dateStr: '' });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, currentMonth: true, dateStr: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
  while (cells.length < 42)
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, currentMonth: false, dateStr: '' });

  const stats = {
    total:     events.length,
    content:   events.filter(e => e.type === 'content').length,
    meetings:  events.filter(e => e.type === 'meeting').length,
    deadlines: events.filter(e => e.type === 'deadline').length,
  };

  return (
    <div className="animate-fade-in">
      {addOpen && (
        <AddEventModal
          defaultDate={selectedDate}
          onClose={() => setAddOpen(false)}
          onSuccess={loadEvents}
        />
      )}

      <Header
        title="Calendario"
        subtitle="Planificación de contenido y actividades del equipo"
        actions={
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-[var(--s-f79c31)] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo evento
          </button>
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: stats.total,     label: 'Eventos este mes',    icon: '📅', color: 'text-[var(--t-0c2054)]'  },
            { val: stats.content,   label: 'Piezas de contenido', icon: '✍️', color: 'text-blue-600'   },
            { val: stats.meetings,  label: 'Reuniones',           icon: '👥', color: 'text-purple-600' },
            { val: stats.deadlines, label: 'Entregas',            icon: '🚩', color: 'text-red-600'    },
          ].map(({ val, label, icon, color }) => (
            <Card key={label} className="p-6 text-center">
              <p className="text-2xl mb-2">{icon}</p>
              <p className={`text-3xl font-bold tracking-tight ${color}`}>{loading ? '—' : val}</p>
              <p className="text-xs text-[var(--t-6b7280)] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--t-111827)]">{MONTHS[month]} {year}</h2>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentDate(new Date(year, month-1, 1))} className="p-2 hover:bg-[var(--s-f7f8fc)] rounded-lg text-[var(--t-4a4a6a)] transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { const n = new Date(); setCurrentDate(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDate(todayStr); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-4a4a6a)] transition-colors"
                  >
                    Hoy
                  </button>
                  <button onClick={() => setCurrentDate(new Date(year, month+1, 1))} className="p-2 hover:bg-[var(--s-f7f8fc)] rounded-lg text-[var(--t-4a4a6a)] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-[var(--t-8888a8)] uppercase tracking-wide py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((cell, idx) => {
                  const evs = cell.currentMonth ? getEventsForDate(cell.day) : [];
                  const isToday    = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  return (
                    <div
                      key={idx}
                      onClick={() => cell.currentMonth && setSelectedDate(cell.dateStr)}
                      className={`min-h-[80px] p-1.5 rounded-lg transition-all ${
                        !cell.currentMonth ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-[var(--s-f7f8fc)]'
                      } ${isSelected ? 'bg-[#0C2054]/5 ring-2 ring-[var(--s-f79c31)]' : ''} ${isToday && !isSelected ? 'bg-[var(--s-fef5e7)]' : ''}`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                        isToday ? 'bg-[var(--s-f79c31)] text-white' : 'text-[var(--t-4a4a6a)]'
                      }`}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0,2).map(ev => (
                          <div key={ev.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${EVENT_COLORS[ev.type]?.bg} ${EVENT_COLORS[ev.type]?.text}`}>
                            {ev.title}
                          </div>
                        ))}
                        {evs.length > 2 && <p className="text-[9px] text-[var(--t-8888a8)] pl-1">+{evs.length-2} más</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--s-f0f0f0)]">
                {Object.entries(EVENT_COLORS).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    <span className="text-[11px] text-[var(--t-8888a8)] font-medium">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Día seleccionado */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-[var(--t-1a1a2e)] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--t-f79c31)]" />
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[var(--t-8888a8)]">Sin eventos este día</p>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="mt-2 text-xs text-[var(--t-f79c31)] font-semibold hover:underline"
                  >
                    + Agregar evento
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => {
                    const cfg = EVENT_COLORS[ev.type] ?? EVENT_COLORS.event;
                    return (
                      <div key={ev.id} className={`p-3 rounded-lg ${cfg.bg} group relative`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${cfg.text} leading-tight`}>{ev.title}</p>
                            {ev.time && <p className={`text-[10px] mt-0.5 ${cfg.text} opacity-70`}>{ev.time}</p>}
                            {ev.description && <p className="text-[10px] text-[var(--t-4a4a6a)] mt-1 line-clamp-2">{ev.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {ev.channel && CHANNEL_ICONS[ev.channel] && (
                              <span className={cfg.text}>{CHANNEL_ICONS[ev.channel]}</span>
                            )}
                            <button
                              onClick={() => handleDelete(ev.id)}
                              disabled={deletingId === ev.id}
                              title="Eliminar evento"
                              className={`p-1 rounded-lg hover:bg-red-100 text-transparent group-hover:text-red-400 transition-all ${deletingId === ev.id ? 'text-red-300' : ''}`}
                            >
                              {deletingId === ev.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-300" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Próximos eventos */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-[var(--t-1a1a2e)] mb-3">Próximos eventos</h3>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-[var(--t-f79c31)] animate-spin" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-[var(--t-8888a8)] text-center py-4">No hay eventos próximos</p>
              ) : (
                <div className="space-y-2.5">
                  {upcomingEvents.map(ev => {
                    const cfg = EVENT_COLORS[ev.type] ?? EVENT_COLORS.event;
                    const evDate = new Date(ev.date + 'T12:00:00');
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-[var(--s-f7f8fc)] rounded-lg p-1.5 -mx-1.5 transition-colors"
                        onClick={() => setSelectedDate(ev.date)}
                      >
                        <div className="text-center min-w-[32px]">
                          <p className="text-[var(--t-f79c31)] font-bold text-sm leading-none">{evDate.getDate()}</p>
                          <p className="text-[var(--t-8888a8)] text-[10px] uppercase">{evDate.toLocaleString('es', { month: 'short' })}</p>
                        </div>
                        <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--t-1a1a2e)] truncate">{ev.title}</p>
                          <span className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Contenido por canal */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-[var(--t-1a1a2e)] mb-3">Contenido por canal</h3>
              {['instagram','tiktok','youtube','podcast','facebook'].map(ch => {
                const count = events.filter(e => e.channel === ch).length;
                const max   = Math.max(...['instagram','tiktok','youtube','podcast','facebook'].map(c => events.filter(e => e.channel === c).length), 1);
                return (
                  <div key={ch} className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--t-8888a8)]">{CHANNEL_ICONS[ch]}</span>
                      <span className="text-[var(--t-4a4a6a)] font-medium capitalize">{ch}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--s-0c2054)]" style={{ width: `${(count/max)*100}%` }} />
                      </div>
                      <span className="font-bold text-[var(--t-1a1a2e)] w-4 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
