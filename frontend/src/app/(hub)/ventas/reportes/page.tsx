'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, TrendingUp, Trophy, DollarSign, Clock, Handshake, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ventasApi, type VentasStats } from '@/lib/api';
import { PIPELINE_STAGES, STAGE_COLORS, formatMoney } from '@/components/modules/ventas/constants';

const SOURCE_COLORS = ['#F79C31', '#0C2054', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444', '#f59e0b'];

export default function ReportesPage() {
  const [stats, setStats] = useState<VentasStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    ventasApi.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Embudo solo con etapas del pipeline (excluye 'perdido')
  const funnel = (stats?.funnel ?? []).filter(f => f.stage !== 'perdido');
  const maxFunnel = Math.max(1, ...funnel.map(f => f.count));

  const cards = stats ? [
    { label: 'Leads totales', value: stats.total.toLocaleString('es'), icon: Handshake, color: 'var(--t-0c2054)' },
    { label: 'Tasa de conversión', value: `${stats.conversion_rate}%`, icon: TrendingUp, color: '#10b981' },
    { label: 'Ganados', value: stats.won.toLocaleString('es'), icon: Trophy, color: '#F79C31' },
    { label: 'Valor ganado', value: formatMoney(stats.won_value), icon: DollarSign, color: '#8b5cf6' },
    { label: 'Pipeline abierto', value: formatMoney(stats.pipeline_value), icon: Target, color: '#3b82f6' },
    { label: 'Ciclo de venta', value: stats.avg_cycle_days != null ? `${stats.avg_cycle_days} días` : '—', icon: Clock, color: '#06b6d4' },
  ] : [];

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ventas" className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">Reportes de Ventas</h1>
            <p className="text-[var(--t-6b7280)] text-sm">Analítica del pipeline en tiempo real</p>
          </div>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin" />
        </div>
      ) : !stats ? (
        <p className="text-[var(--t-8888a8)] text-sm">No se pudieron cargar los datos.</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-xl font-bold text-[var(--t-0c2054)] leading-none">{value}</p>
                <p className="text-xs text-[var(--t-9ca3af)] mt-1.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Embudo por etapa */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
            <h3 className="text-[15px] font-bold text-[var(--t-111827)] mb-5">Embudo por etapa</h3>
            <div className="space-y-3">
              {funnel.map(f => (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--t-4a4a6a)] w-32 flex-shrink-0 truncate">{f.label}</span>
                  <div className="flex-1 h-7 bg-[var(--s-f3f4f6)] rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center justify-end px-2 transition-all"
                      style={{ width: `${Math.max((f.count / maxFunnel) * 100, 4)}%`, background: STAGE_COLORS[f.stage] }}>
                      <span className="text-[11px] font-bold text-white">{f.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--t-9ca3af)] w-24 text-right flex-shrink-0">{formatMoney(f.value)}</span>
                </div>
              ))}
              {funnel.every(f => f.count === 0) && <p className="text-sm text-[var(--t-8888a8)] italic">Sin leads registrados aún.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por fuente */}
            <ChartCard title="Leads por fuente" data={stats.by_source ?? []} colorset={SOURCE_COLORS} />
            {/* Por tipo de caso */}
            <ChartCard title="Leads por tipo de caso" data={stats.by_practice_area ?? []} colorset={SOURCE_COLORS} />
          </div>

          {/* Por responsable */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
            <h3 className="text-[15px] font-bold text-[var(--t-111827)] mb-5">Desempeño por responsable</h3>
            {(stats.by_assignee ?? []).length === 0 ? (
              <p className="text-sm text-[var(--t-8888a8)] italic">Sin leads asignados.</p>
            ) : (
              <div className="border border-[var(--s-f0f0f0)] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-[var(--s-f7f8fc)] text-[11px] font-semibold text-[var(--t-9ca3af)] uppercase tracking-wide">
                  <span>Responsable</span><span className="text-right w-16">Leads</span><span className="text-right w-16">Ganados</span><span className="text-right w-16">Tasa</span>
                </div>
                {(stats.by_assignee ?? []).map(a => (
                  <div key={a.user_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-t border-[var(--s-f0f0f0)] items-center">
                    <span className="text-sm font-medium text-[var(--t-0c2054)] truncate">{a.name}</span>
                    <span className="text-sm text-[var(--t-374151)] text-right w-16">{a.count}</span>
                    <span className="text-sm text-emerald-600 font-semibold text-right w-16">{a.won}</span>
                    <span className="text-sm text-[var(--t-9ca3af)] text-right w-16">{a.count ? Math.round((a.won / a.count) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, data, colorset }: {
  title: string;
  data: { key: string; label: string; count: number; won: number }[];
  colorset: string[];
}) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
      <h3 className="text-[15px] font-bold text-[var(--t-111827)] mb-5">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--t-8888a8)] italic">Sin datos.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
          <BarChart data={data} layout="vertical" barSize={18} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#8888a8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#4a4a6a' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={colorset[i % colorset.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
