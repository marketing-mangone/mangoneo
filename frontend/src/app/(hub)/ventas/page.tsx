'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, RefreshCw, Handshake, TrendingUp, DollarSign,
  Trophy, AlertTriangle, List, Upload,
} from 'lucide-react';
import { ventasApi, auth, type ApiLeadList, type VentasStats, type LeadStage } from '@/lib/api';
import { LeadCard } from '@/components/modules/ventas/LeadCard';
import { LeadModal } from '@/components/modules/ventas/LeadModal';
import { ImportLeadsModal } from '@/components/modules/ventas/ImportLeadsModal';
import { TasksPanel } from '@/components/modules/ventas/TasksPanel';
import { PIPELINE_STAGES, STAGE_COLORS, formatMoney } from '@/components/modules/ventas/constants';

export default function VentasPage() {
  const isGuest = typeof window !== 'undefined' && auth.getCurrentUser()?.role === 'guest';

  const [leads, setLeads] = useState<ApiLeadList[]>([]);
  const [stats, setStats] = useState<VentasStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        ventasApi.list({ page_size: 200 }),
        ventasApi.stats(),
      ]);
      setLeads(leadsRes.results);
      setStats(statsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdvance = async (lead: ApiLeadList) => {
    setAdvancingId(lead.id);
    try {
      await ventasApi.move(lead.id);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDropOnStage = async (stage: LeadStage) => {
    const id = dragId;
    setDragOver(null);
    setDragId(null);
    if (!id) return;
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.stage === stage) return;
    // Optimista: mueve la tarjeta en UI y confirma con el backend
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, stage } : l)));
    try {
      await ventasApi.move(id, stage);
      await load();
    } catch (e) {
      console.error(e);
      await load(); // revertir desde el servidor si falla
    }
  };

  const byStage = (stage: LeadStage) => leads.filter(l => l.stage === stage);
  const lostLeads = byStage('perdido');

  const statsItems = stats ? [
    { label: 'Leads abiertos', value: stats.open, icon: Handshake, color: 'var(--t-0c2054)' },
    { label: 'Nuevos este mes', value: stats.new_this_month, icon: TrendingUp, color: '#3b82f6' },
    { label: 'Ganados este mes', value: stats.won_this_month, icon: Trophy, color: '#10b981' },
    { label: 'Tasa de conversión', value: `${stats.conversion_rate}%`, icon: TrendingUp, color: '#F79C31' },
    { label: 'Valor en pipeline', value: formatMoney(stats.pipeline_value), icon: DollarSign, color: '#8b5cf6' },
    { label: 'Seguimientos vencidos', value: stats.overdue_followups, icon: AlertTriangle, color: '#ef4444' },
  ] : [];

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">Pipeline de Ventas</h1>
          </div>
          <p className="text-[var(--t-6b7280)] text-sm ml-12">Captación, prospección y conversión de leads de Mangone Law Firm</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/ventas/leads"
            className="flex items-center gap-2 border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-[var(--t-374151)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-all"
          >
            <List className="w-4 h-4 text-[var(--t-f79c31)]" />
            Ver todos los leads
          </Link>
          {!isGuest && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-[var(--t-374151)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-all"
            >
              <Upload className="w-4 h-4 text-[var(--t-f79c31)]" />
              Importar
            </button>
          )}
          <Link
            href="/ventas/reportes"
            className="flex items-center gap-2 border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-[var(--t-374151)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-all"
          >
            <TrendingUp className="w-4 h-4 text-[var(--t-f79c31)]" />
            Reportes
          </Link>
          {!isGuest && (
            <button
              onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo lead
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-6 gap-4">
          {statsItems.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-[var(--t-0c2054)] truncate">{value}</p>
                <p className="text-xs text-[var(--t-9ca3af)] font-medium truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tareas / recordatorios */}
      <TasksPanel />

      {/* Pipeline kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin mx-auto mb-3" />
            <p className="text-[var(--t-9ca3af)] text-sm">Cargando pipeline...</p>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-8 h-8 text-[var(--t-9ca3af)]" />
          </div>
          <h3 className="font-bold text-[var(--t-0c2054)] text-lg mb-2">Sin leads registrados</h3>
          <p className="text-[var(--t-6b7280)] text-sm mb-6 max-w-sm mx-auto">
            Registra los prospectos que llegan por campañas, referidos o el sitio web para darles seguimiento hasta convertirlos en clientes.
          </p>
          <button
            onClick={() => setShowAddLead(true)}
            className="inline-flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Registrar primer lead
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-4 items-start">
            {PIPELINE_STAGES.map(stage => {
              const stageLeads = byStage(stage.key);
              const stageValue = stageLeads.reduce((sum, l) => sum + (parseFloat(l.estimated_value ?? '0') || 0), 0);
              return (
                <div
                  key={stage.key}
                  className="space-y-3"
                  onDragOver={e => { e.preventDefault(); if (dragOver !== stage.key) setDragOver(stage.key); }}
                  onDragLeave={() => setDragOver(d => (d === stage.key ? null : d))}
                  onDrop={() => handleDropOnStage(stage.key)}
                >
                  {/* Column header */}
                  <div className="bg-[var(--surface)] rounded-xl border border-[var(--s-e8eaf0)] px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <p className="text-[12px] font-bold text-[var(--t-0c2054)] truncate">{stage.label}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[var(--t-9ca3af)] flex-shrink-0">{stageLeads.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-[10px] text-[var(--t-9ca3af)] mt-0.5">{formatMoney(stageValue)}</p>
                    )}
                  </div>
                  {/* Cards (drop zone) */}
                  <div className={`space-y-2.5 min-h-[120px] rounded-xl transition-colors ${
                    dragOver === stage.key ? 'bg-[#0C2054]/5 outline-2 outline-dashed outline-[#0C2054]/30' : ''
                  }`}>
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragId(lead.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null); }}
                        className={`cursor-grab active:cursor-grabbing ${dragId === lead.id ? 'opacity-40' : ''}`}
                      >
                        <LeadCard
                          lead={lead}
                          onAdvance={handleAdvance}
                          advancing={advancingId === lead.id}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lost leads strip */}
          {lostLeads.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-4">
              <p className="text-xs font-semibold text-[var(--t-9ca3af)] uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS.perdido }} />
                Perdidos ({lostLeads.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {lostLeads.map(lead => (
                  <Link
                    key={lead.id}
                    href={`/ventas/leads/${lead.id}`}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--s-e5e7eb)] text-[var(--t-6b7280)] hover:border-red-300 hover:text-red-500 transition-all"
                  >
                    {lead.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <LeadModal open={showAddLead} onClose={() => setShowAddLead(false)} onSaved={load} />
      <ImportLeadsModal open={showImport} onClose={() => setShowImport(false)} onImported={load} />
    </div>
  );
}
