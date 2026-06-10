'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, Users, ArrowLeft } from 'lucide-react';
import { ventasApi, type ApiLeadList, type LeadStage, type LeadSource, type LeadPriority } from '@/lib/api';
import { LeadModal } from '@/components/modules/ventas/LeadModal';
import {
  PIPELINE_STAGES, STAGE_COLORS, SOURCE_OPTIONS, PRIORITY_OPTIONS,
  formatMoney, formatDate,
} from '@/components/modules/ventas/constants';

const ALL_STAGES: { key: LeadStage; label: string }[] = [
  ...PIPELINE_STAGES.map(s => ({ key: s.key, label: s.label })),
  { key: 'perdido', label: 'Perdido' },
];

const selectClass = 'border border-[var(--s-e5e7eb)] rounded-xl px-3 py-2 text-sm bg-[var(--surface)] text-[var(--t-374151)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<ApiLeadList[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<LeadStage | ''>('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [priority, setPriority] = useState<LeadPriority | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ventasApi.list({
        page_size: 200,
        ...(search ? { search } : {}),
        ...(stage ? { stage } : {}),
        ...(source ? { source } : {}),
        ...(priority ? { priority } : {}),
      });
      setLeads(res.results);
      setCount(res.count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, stage, source, priority]);

  // Debounce de búsqueda; filtros recargan de inmediato
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/ventas"
              className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">Leads</h1>
          </div>
          <p className="text-[var(--t-6b7280)] text-sm ml-12">Base completa de prospectos · {count} registro{count !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-9ca3af)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o campaña..."
            className="w-full border border-[var(--s-e5e7eb)] rounded-xl pl-10 pr-4 py-2 text-sm bg-[var(--surface)] text-[var(--t-0c2054)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20"
          />
        </div>
        <select value={stage} onChange={e => setStage(e.target.value as LeadStage | '')} className={selectClass}>
          <option value="">Todas las etapas</option>
          {ALL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={source} onChange={e => setSource(e.target.value as LeadSource | '')} className={selectClass}>
          <option value="">Todas las fuentes</option>
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as LeadPriority | '')} className={selectClass}>
          <option value="">Toda prioridad</option>
          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin mx-auto mb-3" />
            <p className="text-[var(--t-9ca3af)] text-sm">Cargando leads...</p>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--t-9ca3af)]" />
          </div>
          <h3 className="font-bold text-[var(--t-0c2054)] text-lg mb-2">Sin resultados</h3>
          <p className="text-[var(--t-6b7280)] text-sm max-w-sm mx-auto">
            No hay leads que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--s-f0f2f8)] text-left">
                {['Nombre', 'Contacto', 'Fuente', 'Área', 'Etapa', 'Prioridad', 'Valor', 'Seguimiento', 'Creado'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-[var(--t-9ca3af)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const prio = PRIORITY_OPTIONS.find(p => p.value === lead.priority);
                const overdue = lead.next_followup && new Date(lead.next_followup) < new Date(new Date().toDateString())
                  && lead.stage !== 'ganado' && lead.stage !== 'perdido';
                return (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/ventas/leads/${lead.id}`)}
                    className="border-b border-[var(--s-f0f2f8)] last:border-0 cursor-pointer hover:bg-[var(--s-f7f8fc)] transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--t-0c2054)]">{lead.name}</td>
                    <td className="px-4 py-3 text-[var(--t-6b7280)]">
                      <p className="truncate max-w-[180px]">{lead.email || '—'}</p>
                      {lead.phone && <p className="text-xs text-[var(--t-9ca3af)]">{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-[var(--t-6b7280)]">{lead.source_display}</td>
                    <td className="px-4 py-3 text-[var(--t-6b7280)]">{lead.practice_area_display}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage] }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLORS[lead.stage] }} />
                        {lead.stage_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: prio?.color }}>{prio?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--t-374151)] font-medium">{formatMoney(lead.estimated_value)}</td>
                    <td className={`px-4 py-3 ${overdue ? 'text-red-500 font-semibold' : 'text-[var(--t-6b7280)]'}`}>
                      {formatDate(lead.next_followup)}
                    </td>
                    <td className="px-4 py-3 text-[var(--t-9ca3af)] text-xs">{formatDate(lead.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LeadModal open={showAddLead} onClose={() => setShowAddLead(false)} onSaved={load} />
    </div>
  );
}
