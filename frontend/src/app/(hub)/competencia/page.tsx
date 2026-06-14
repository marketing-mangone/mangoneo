'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Target, Lightbulb, Eye, AlertTriangle } from 'lucide-react';
import { competitorsApi, type ApiCompetitorList, type ApiCompetitorInsight, type CompetitorDimension } from '@/lib/api';
import { CompetitorRadarChart, type RadarDataPoint } from '@/components/modules/competitors/CompetitorRadarChart';
import { CompetitorCard } from '@/components/modules/competitors/CompetitorCard';
import { AddCompetitorModal } from '@/components/modules/competitors/AddCompetitorModal';
import { AddInsightModal } from '@/components/modules/competitors/AddInsightModal';
import { InsightCard } from '@/components/modules/competitors/InsightCard';

const DIMENSIONS: { key: CompetitorDimension; label: string }[] = [
  { key: 'seo', label: 'SEO' },
  { key: 'social_media', label: 'Redes Sociales' },
  { key: 'advertising', label: 'Publicidad' },
  { key: 'web_presence', label: 'Presencia Web' },
  { key: 'content', label: 'Contenido' },
  { key: 'reviews', label: 'Reseñas' },
];

const COLORS = ['#F79C31', '#0C2054', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

function buildRadarData(competitors: ApiCompetitorList[]): RadarDataPoint[] {
  return DIMENSIONS.map(({ key, label }) => {
    const point: RadarDataPoint = { dimension: label };
    competitors.forEach(c => {
      point[c.name] = c.latest_scores[key] ?? 0;
    });
    return point;
  });
}

export default function CompetenciaPage() {
  const [competitors, setCompetitors] = useState<ApiCompetitorList[]>([]);
  const [insights, setInsights] = useState<ApiCompetitorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [showAddInsight, setShowAddInsight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, insRes] = await Promise.all([
        competitorsApi.list(),
        competitorsApi.listInsights(),
      ]);
      setCompetitors(compRes.results);
      setInsights(insRes.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const radarData = buildRadarData(competitors);
  const radarCompetitors = competitors.map((c, i) => ({ name: c.name, color: COLORS[i % COLORS.length] }));

  const statsItems = [
    { label: 'Competidores', value: competitors.length, icon: Target, color: 'var(--t-0c2054)' },
    { label: 'Oportunidades', value: insights.filter(i => i.insight_type === 'opportunity').length, icon: Lightbulb, color: '#10b981' },
    { label: 'Amenazas', value: insights.filter(i => i.insight_type === 'threat').length, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Observaciones', value: insights.filter(i => i.insight_type === 'observation').length, icon: Eye, color: 'var(--t-6b7280)' },
  ];

  const handleDeleteInsight = async (id: number) => {
    await competitorsApi.deleteInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">Benchmarking</h1>
          </div>
          <p className="text-[var(--t-6b7280)] text-sm ml-12">Monitorea las estrategias, presencia digital y publicidad de la competencia</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--surface)] hover:text-[var(--t-0c2054)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddInsight(true)}
            className="flex items-center gap-2 border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-[var(--t-374151)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-all"
          >
            <Lightbulb className="w-4 h-4 text-[var(--t-f79c31)]" />
            Nuevo insight
          </button>
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar competidor
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {statsItems.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--t-0c2054)]">{value}</p>
              <p className="text-xs text-[var(--t-9ca3af)] font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin mx-auto mb-3" />
            <p className="text-[var(--t-9ca3af)] text-sm">Cargando datos...</p>
          </div>
        </div>
      ) : competitors.length === 0 ? (
        /* Empty state */
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-[var(--t-9ca3af)]" />
          </div>
          <h3 className="font-bold text-[var(--t-0c2054)] text-lg mb-2">Sin competidores registrados</h3>
          <p className="text-[var(--t-6b7280)] text-sm mb-6 max-w-sm mx-auto">
            Agrega las firmas de abogados de inmigración que compiten con Mangone Law Firm para comenzar a monitorear sus estrategias.
          </p>
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="inline-flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar primer competidor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-5">
          {/* Radar Chart — 3/5 */}
          <div className="col-span-3 bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-bold text-[var(--t-0c2054)] text-base">Comparación de Dimensiones</h2>
                <p className="text-[var(--t-9ca3af)] text-xs mt-0.5">Puntuación 0–10 por área · Scores más recientes</p>
              </div>
            </div>
            {radarData.some(d => Object.keys(d).length > 1) ? (
              <CompetitorRadarChart data={radarData} competitors={radarCompetitors} />
            ) : (
              <div className="flex items-center justify-center h-72 text-[var(--t-9ca3af)] text-sm">
                Agrega puntuaciones en el perfil de cada competidor para ver el radar
              </div>
            )}
          </div>

          {/* Competitor cards — 2/5 */}
          <div className="col-span-2 space-y-3 overflow-y-auto max-h-[460px] pr-1">
            <p className="text-xs font-semibold text-[var(--t-9ca3af)] uppercase tracking-wide px-1">
              {competitors.length} competidor{competitors.length !== 1 ? 'es' : ''} monitoreado{competitors.length !== 1 ? 's' : ''}
            </p>
            {competitors.map(c => (
              <CompetitorCard key={c.id} competitor={c} />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[var(--t-0c2054)]">Insights Recientes</h2>
            <button
              onClick={() => setShowAddInsight(true)}
              className="text-xs text-[var(--t-0c2054)] font-medium hover:text-[#1a3a7a] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {insights.slice(0, 6).map(insight => {
              const comp = competitors.find(c => c.id === insight.competitor);
              return (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  competitorName={comp?.name}
                  onDelete={handleDeleteInsight}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddCompetitorModal
        open={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        onCreated={load}
      />
      <AddInsightModal
        open={showAddInsight}
        onClose={() => setShowAddInsight(false)}
        onCreated={load}
        competitors={competitors.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
