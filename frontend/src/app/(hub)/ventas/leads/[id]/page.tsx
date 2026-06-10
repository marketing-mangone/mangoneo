'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Pencil, Trash2, Mail, Phone, MapPin,
  Megaphone, DollarSign, CalendarClock, Globe, Send, XCircle,
  StickyNote, PhoneCall, MessageCircle, Video, ArrowRightCircle, Check,
} from 'lucide-react';
import { ventasApi, type ApiLead, type LeadActivityType, type LeadStage } from '@/lib/api';
import { LeadModal } from '@/components/modules/ventas/LeadModal';
import {
  PIPELINE_STAGES, STAGE_COLORS, PRIORITY_OPTIONS, ACTIVITY_TYPE_OPTIONS,
  formatMoney, formatDate,
} from '@/components/modules/ventas/constants';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  nota: StickyNote,
  llamada: PhoneCall,
  email: Mail,
  whatsapp: MessageCircle,
  reunion: Video,
  etapa: ArrowRightCircle,
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<ApiLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const [activityType, setActivityType] = useState<LeadActivityType>('nota');
  const [activityText, setActivityText] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLead(await ventasApi.get(Number(id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleMove = async (stage: LeadStage) => {
    if (!lead) return;
    setMoving(true);
    try {
      setLead(await ventasApi.move(lead.id, stage, stage === 'perdido' ? lostReason : undefined));
      setShowLost(false);
      setLostReason('');
    } catch (e) {
      console.error(e);
    } finally {
      setMoving(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !activityText.trim()) return;
    setSavingActivity(true);
    try {
      await ventasApi.addActivity(lead.id, { activity_type: activityType, description: activityText.trim() });
      setActivityText('');
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!confirm(`¿Eliminar el lead "${lead.name}"? Esta acción no se puede deshacer.`)) return;
    await ventasApi.remove(lead.id);
    router.push('/ventas/leads');
  };

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin" />
      </div>
    );
  }

  const priority = PRIORITY_OPTIONS.find(p => p.value === lead.priority);
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === lead.stage);
  const isClosed = lead.stage === 'ganado' || lead.stage === 'perdido';

  const infoItems = [
    { icon: Mail, label: 'Email', value: lead.email || '—' },
    { icon: Phone, label: 'Teléfono', value: lead.phone || '—' },
    { icon: MapPin, label: 'Ubicación', value: lead.location || '—' },
    { icon: Globe, label: 'Idioma', value: lead.language_display },
    { icon: Megaphone, label: 'Fuente', value: lead.campaign ? `${lead.source_display} · ${lead.campaign}` : lead.source_display },
    { icon: DollarSign, label: 'Valor estimado', value: formatMoney(lead.estimated_value) },
    { icon: CalendarClock, label: 'Próximo seguimiento', value: formatDate(lead.next_followup) },
  ];

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ventas/leads"
            className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">{lead.name}</h1>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage] }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLORS[lead.stage] }} />
                {lead.stage_display}
              </span>
              <span className="text-xs font-semibold" style={{ color: priority?.color }}>
                Prioridad {priority?.label.toLowerCase()}
              </span>
            </div>
            <p className="text-[var(--t-6b7280)] text-sm mt-0.5">
              {lead.practice_area_display} · Registrado el {formatDate(lead.created_at)}
              {lead.created_by_name ? ` por ${lead.created_by_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-[var(--t-374151)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-all"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button
            onClick={handleDelete}
            className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-9ca3af)] hover:text-red-500 hover:border-red-200 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--t-0c2054)] text-base">Etapa del pipeline</h2>
          {!isClosed && (
            <button
              onClick={() => setShowLost(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--t-9ca3af)] hover:text-red-500 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Marcar como perdido
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, i) => {
            const reached = lead.stage === 'perdido' ? false : i <= stageIdx;
            const current = stage.key === lead.stage;
            return (
              <button
                key={stage.key}
                onClick={() => !moving && handleMove(stage.key)}
                disabled={moving || current}
                title={`Mover a ${stage.label}`}
                className={`flex-1 group relative py-2.5 px-2 text-[11px] font-semibold transition-all first:rounded-l-xl last:rounded-r-xl ${
                  current
                    ? 'text-white'
                    : reached
                      ? 'text-[var(--t-0c2054)] hover:opacity-80'
                      : 'text-[var(--t-9ca3af)] hover:text-[var(--t-0c2054)] hover:bg-[var(--s-f0f2f8)]'
                }`}
                style={{
                  background: current ? stage.color : reached ? `${stage.color}20` : 'var(--s-f7f8fc)',
                }}
              >
                <span className="flex items-center justify-center gap-1">
                  {reached && !current && <Check className="w-3 h-3" />}
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>

        {lead.stage === 'perdido' && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
            Lead perdido{lead.lost_reason ? `: ${lead.lost_reason}` : ''}. Puedes reactivarlo seleccionando una etapa.
          </div>
        )}
        {lead.stage === 'ganado' && (
          <div className="mt-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl px-4 py-3">
            🎉 Cliente ganado el {formatDate(lead.won_at)}.
          </div>
        )}

        {showLost && !isClosed && (
          <div className="mt-4 flex items-center gap-3">
            <input
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              placeholder="Motivo de la pérdida (ej. eligió otra firma, no calificaba...)"
              className="flex-1 border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] text-[var(--t-0c2054)] focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <button
              onClick={() => handleMove('perdido')}
              disabled={moving}
              className="bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5 items-start">
        {/* Info — 2/5 */}
        <div className="col-span-2 space-y-5">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
            <h2 className="font-bold text-[var(--t-0c2054)] text-base mb-4">Información del prospecto</h2>
            <div className="space-y-3.5">
              {infoItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--s-f0f2f8)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--t-6b7280)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--t-9ca3af)] font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-[var(--t-0c2054)] font-medium break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lead.notes && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
              <h2 className="font-bold text-[var(--t-0c2054)] text-base mb-3">Notas</h2>
              <p className="text-sm text-[var(--t-374151)] whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Activity — 3/5 */}
        <div className="col-span-3 bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
          <h2 className="font-bold text-[var(--t-0c2054)] text-base mb-4">Actividad y seguimiento</h2>

          {/* Add activity */}
          <form onSubmit={handleAddActivity} className="flex items-start gap-2 mb-6">
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value as LeadActivityType)}
              className="border border-[var(--s-e5e7eb)] rounded-xl px-3 py-2.5 text-sm bg-[var(--surface)] text-[var(--t-374151)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20"
            >
              {ACTIVITY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              value={activityText}
              onChange={e => setActivityText(e.target.value)}
              placeholder="Registra una llamada, nota o interacción..."
              className="flex-1 border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] text-[var(--t-0c2054)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20"
            />
            <button
              type="submit"
              disabled={savingActivity || !activityText.trim()}
              className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Registrar
            </button>
          </form>

          {/* Timeline */}
          {lead.activities.length === 0 ? (
            <p className="text-sm text-[var(--t-9ca3af)] text-center py-8">
              Aún no hay actividades registradas para este lead.
            </p>
          ) : (
            <div className="space-y-0">
              {lead.activities.map((act, i) => {
                const Icon = ACTIVITY_ICONS[act.activity_type] ?? StickyNote;
                const isStageChange = act.activity_type === 'etapa';
                return (
                  <div key={act.id} className="flex gap-3 relative pb-5 last:pb-0">
                    {i < lead.activities.length - 1 && (
                      <span className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--s-f0f2f8)]" />
                    )}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                      style={{ background: isStageChange ? '#F79C3118' : 'var(--s-f0f2f8)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: isStageChange ? '#F79C31' : 'var(--t-6b7280)' }} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--t-0c2054)]">{act.activity_type_display}</span>
                        <span className="text-[11px] text-[var(--t-9ca3af)]">
                          {formatDateTime(act.created_at)}{act.created_by_name ? ` · ${act.created_by_name}` : ''}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--t-374151)] mt-0.5 break-words">{act.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LeadModal open={showEdit} onClose={() => setShowEdit(false)} onSaved={load} lead={lead} />
    </div>
  );
}
