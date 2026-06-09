'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Globe, MapPin, ExternalLink, Plus, RefreshCw,
  BarChart3, Megaphone, Star, Calendar, Trash2,
} from 'lucide-react';
import {
  competitorsApi, type ApiCompetitor, type ApiAdObservation,
  type CompetitorDimension, type ScoreInput, type AdObservationInput,
} from '@/lib/api';
import { CompetitorRadarChart, type RadarDataPoint } from '@/components/modules/competitors/CompetitorRadarChart';
import { InsightCard } from '@/components/modules/competitors/InsightCard';
import { AddInsightModal } from '@/components/modules/competitors/AddInsightModal';

const DIMENSIONS: { key: CompetitorDimension; label: string; desc: string }[] = [
  { key: 'seo', label: 'SEO', desc: 'Posicionamiento orgánico, keywords, backlinks' },
  { key: 'social_media', label: 'Redes Sociales', desc: 'Seguidores, engagement, frecuencia de publicación' },
  { key: 'advertising', label: 'Publicidad', desc: 'Inversión en ads, plataformas activas, creatividades' },
  { key: 'web_presence', label: 'Presencia Web', desc: 'Tráfico estimado, UX, velocidad, mobile' },
  { key: 'content', label: 'Contenido', desc: 'Blog, video, podcast, calidad y frecuencia' },
  { key: 'reviews', label: 'Reseñas', desc: 'Rating en Google, Avvo, Yelp; volumen de reseñas' },
];

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta (Facebook/Instagram)',
  google: 'Google Ads',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: '#1877F2',
  google: '#EA4335',
  youtube: '#FF0000',
  tiktok: '#000000',
};

function ScoreForm({ onSave }: { onSave: (data: Omit<ScoreInput, 'competitor'>) => Promise<void> }) {
  const today = new Date();
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const [form, setForm] = useState({ dimension: 'seo' as CompetitorDimension, score: '', raw_value: '', notes: '', period: defaultPeriod });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.score || isNaN(Number(form.score)) || Number(form.score) < 0 || Number(form.score) > 10) {
      setError('Ingresa una puntuación válida (0–10)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({ ...form, score: Number(form.score), source: 'manual' });
      setForm(f => ({ ...f, score: '', raw_value: '', notes: '' }));
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--s-f8f9fb)] rounded-xl border border-[var(--s-e8eaf0)] p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--t-374151)] uppercase tracking-wide">Registrar puntuación</p>
      {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Dimensión</label>
          <select value={form.dimension} onChange={e => setForm(f => ({ ...f, dimension: e.target.value as CompetitorDimension }))}
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20">
            {DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Puntuación (0–10)</label>
          <input value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
            type="number" min="0" max="10" step="0.1" placeholder="ej. 7.5"
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Valor real (opcional)</label>
        <input value={form.raw_value} onChange={e => setForm(f => ({ ...f, raw_value: e.target.value }))}
          placeholder="ej. 4.8/5 (120 reseñas), 15K seguidores..."
          className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Notas</label>
        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Observaciones adicionales..."
          className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-[var(--s-0c2054)] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? 'Guardando...' : <><Plus className="w-4 h-4" /> Guardar puntuación</>}
      </button>
    </form>
  );
}

function AdForm({ onSave }: { onSave: (data: Omit<AdObservationInput, 'competitor'>) => Promise<void> }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Omit<AdObservationInput, 'competitor'>>({
    platform: 'meta', headline: '', message: '', cta: '', differentiator: '',
    observed_date: today, creative_url: '', notes: '', is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(form);
      setForm(f => ({ ...f, headline: '', message: '', cta: '', differentiator: '', creative_url: '', notes: '' }));
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--s-f8f9fb)] rounded-xl border border-[var(--s-e8eaf0)] p-4 space-y-3">
      <p className="text-xs font-semibold text-[var(--t-374151)] uppercase tracking-wide">Registrar ad observado</p>
      {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Plataforma</label>
          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as any }))}
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20">
            <option value="meta">Meta (Facebook/Instagram)</option>
            <option value="google">Google Ads</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Fecha observado</label>
          <input type="date" value={form.observed_date} onChange={e => setForm(f => ({ ...f, observed_date: e.target.value }))}
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Título / Headline</label>
        <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
          placeholder="Titular del anuncio"
          className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Mensaje principal</label>
        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Copy del anuncio..." rows={2}
          className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Call to Action</label>
          <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
            placeholder="ej. Llama ahora, Agenda gratis..."
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">Diferenciador usado</label>
          <input value={form.differentiator} onChange={e => setForm(f => ({ ...f, differentiator: e.target.value }))}
            placeholder="ej. Gratis la primera consulta..."
            className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--t-6b7280)] mb-1">URL del creativo (opcional)</label>
        <input value={form.creative_url} onChange={e => setForm(f => ({ ...f, creative_url: e.target.value }))}
          type="url" placeholder="https://..."
          className="w-full border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full bg-[var(--s-0c2054)] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? 'Guardando...' : <><Plus className="w-4 h-4" /> Registrar ad</>}
      </button>
    </form>
  );
}

function AdCard({ ad, onDelete }: { ad: ApiAdObservation; onDelete: (id: number) => void }) {
  const color = PLATFORM_COLORS[ad.platform] || '#6b7280';
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--s-e8eaf0)] p-4 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
            {PLATFORM_LABELS[ad.platform] || ad.platform}
          </span>
          {ad.is_active && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Activo</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <span className="text-[11px] text-[var(--t-9ca3af)] flex items-center gap-1">
            <Calendar className="w-3 h-3" />{ad.observed_date}
          </span>
          <button onClick={() => onDelete(ad.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--t-9ca3af)] hover:text-red-500 hover:bg-red-50 transition-all ml-1">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {ad.headline && <h4 className="font-semibold text-[var(--t-0c2054)] text-sm mb-1">{ad.headline}</h4>}
      {ad.message && <p className="text-[var(--t-6b7280)] text-xs leading-relaxed mb-2">{ad.message}</p>}
      {(ad.cta || ad.differentiator) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {ad.cta && (
            <span className="text-[10px] bg-[#F79C31]/10 text-[var(--t-b8720f)] px-2 py-1 rounded-lg font-medium">
              CTA: {ad.cta}
            </span>
          )}
          {ad.differentiator && (
            <span className="text-[10px] bg-[#0C2054]/[0.08] text-[var(--t-0c2054)] px-2 py-1 rounded-lg font-medium">
              {ad.differentiator}
            </span>
          )}
        </div>
      )}
      {ad.creative_url && (
        <a href={ad.creative_url} target="_blank" rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-[11px] text-[var(--t-0c2054)] hover:text-[#1a3a7a] transition-colors">
          <ExternalLink className="w-3 h-3" /> Ver creativo
        </a>
      )}
    </div>
  );
}

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [competitor, setCompetitor] = useState<ApiCompetitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'digital' | 'ads' | 'insights'>('digital');
  const [showAddInsight, setShowAddInsight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await competitorsApi.get(Number(id));
      setCompetitor(data);
    } catch {
      router.push('/competencia');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-[var(--t-d1d5db)] animate-spin" />
      </div>
    );
  }

  if (!competitor) return null;

  // Build radar for this single competitor
  const radarData: RadarDataPoint[] = DIMENSIONS.map(({ key, label }) => {
    const score = competitor.scores.find(s => s.dimension === key);
    return { dimension: label, [competitor.name]: score ? parseFloat(score.score) : 0 };
  });

  const getLatestScore = (dim: CompetitorDimension) => {
    const scores = competitor.scores.filter(s => s.dimension === dim);
    return scores.length > 0 ? scores[0] : null;
  };

  const handleSaveScore = async (data: Omit<ScoreInput, 'competitor'>) => {
    await competitorsApi.createScore({ ...data, competitor: competitor.id });
    await load();
  };

  const handleSaveAd = async (data: Omit<AdObservationInput, 'competitor'>) => {
    await competitorsApi.createAd({ ...data, competitor: competitor.id });
    await load();
  };

  const handleDeleteAd = async (adId: number) => {
    await competitorsApi.deleteAd(adId);
    await load();
  };

  const handleDeleteInsight = async (insightId: number) => {
    await competitorsApi.deleteInsight(insightId);
    await load();
  };

  return (
    <div className="p-8 space-y-6 min-h-screen">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.push('/competencia')}
          className="flex items-center gap-2 text-[var(--t-9ca3af)] hover:text-[var(--t-0c2054)] text-sm font-medium mb-4 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Volver al radar
        </button>
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
              {competitor.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[var(--t-0c2054)]">{competitor.name}</h1>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  competitor.category === 'direct' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {competitor.category === 'direct' ? 'Competidor Directo' : 'Competidor Indirecto'}
                </span>
              </div>
              {competitor.location && (
                <div className="flex items-center gap-1 text-sm text-[var(--t-9ca3af)] mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {competitor.location}
                </div>
              )}
              {competitor.description && (
                <p className="text-[var(--t-6b7280)] text-sm leading-relaxed mb-3">{competitor.description}</p>
              )}
              <div className="flex items-center gap-4">
                {competitor.website && (
                  <a href={competitor.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[var(--t-0c2054)] hover:text-[#1a3a7a] font-medium transition-colors">
                    <Globe className="w-4 h-4" />
                    {competitor.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3 text-[var(--t-9ca3af)]" />
                  </a>
                )}
                {competitor.practice_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {competitor.practice_areas.map(area => (
                      <span key={area} className="text-[10px] bg-[var(--s-f0f2f8)] text-[var(--t-4b5563)] px-2 py-0.5 rounded-full">{area}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface)] rounded-xl border border-[var(--s-e8eaf0)] p-1 w-fit">
        {([
          { key: 'digital', label: 'Presencia Digital', icon: BarChart3 },
          { key: 'ads', label: 'Publicidad', icon: Megaphone },
          { key: 'insights', label: 'Insights', icon: Star },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--s-0c2054)] text-white shadow-sm'
                : 'text-[var(--t-6b7280)] hover:text-[var(--t-0c2054)] hover:bg-[var(--s-f8f9fb)]'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Presencia Digital */}
      {activeTab === 'digital' && (
        <div className="grid grid-cols-5 gap-5">
          {/* Radar */}
          <div className="col-span-3 bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
            <h2 className="font-bold text-[var(--t-0c2054)] mb-1">Perfil de Dimensiones</h2>
            <p className="text-[var(--t-9ca3af)] text-xs mb-4">Puntuaciones registradas manualmente · Escala 0–10</p>
            <CompetitorRadarChart
              data={radarData}
              competitors={[{ name: competitor.name, color: 'var(--t-f79c31)' }]}
            />
          </div>

          {/* Scores + form */}
          <div className="col-span-2 space-y-4">
            {/* Score breakdown */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-5">
              <h3 className="font-bold text-[var(--t-0c2054)] text-sm mb-3">Puntuaciones por dimensión</h3>
              <div className="space-y-2.5">
                {DIMENSIONS.map(({ key, label }) => {
                  const s = getLatestScore(key);
                  const score = s ? parseFloat(s.score) : null;
                  const barColor = score !== null ? (score >= 7 ? '#10b981' : score >= 5 ? '#F79C31' : '#ef4444') : '#e5e7eb';
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-semibold text-[var(--t-374151)]">{label}</span>
                          {s?.raw_value && <span className="text-[10px] text-[var(--t-9ca3af)] ml-2">{s.raw_value}</span>}
                        </div>
                        <span className="text-sm font-bold" style={{ color: barColor }}>
                          {score !== null ? `${score.toFixed(1)}/10` : '—'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--s-f0f2f8)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: score !== null ? `${score * 10}%` : '0%', background: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score form */}
            <ScoreForm onSave={handleSaveScore} />
          </div>
        </div>
      )}

      {/* Tab: Publicidad */}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-3">
            {competitor.ad_observations.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-12 text-center">
                <Megaphone className="w-10 h-10 text-[var(--t-d1d5db)] mx-auto mb-3" />
                <p className="text-[var(--t-9ca3af)] text-sm">Sin ads registrados aún</p>
                <p className="text-[var(--t-d1d5db)] text-xs mt-1">Usa el formulario para agregar anuncios observados</p>
              </div>
            ) : (
              competitor.ad_observations.map(ad => (
                <AdCard key={ad.id} ad={ad} onDelete={handleDeleteAd} />
              ))
            )}
          </div>
          <div className="col-span-2">
            <AdForm onSave={handleSaveAd} />
          </div>
        </div>
      )}

      {/* Tab: Insights */}
      {activeTab === 'insights' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[var(--t-0c2054)]">Insights sobre {competitor.name}</h2>
            <button onClick={() => setShowAddInsight(true)}
              className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all">
              <Plus className="w-4 h-4" /> Nuevo insight
            </button>
          </div>
          {competitor.insights.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-12 text-center">
              <Star className="w-10 h-10 text-[var(--t-d1d5db)] mx-auto mb-3" />
              <p className="text-[var(--t-9ca3af)] text-sm">Sin insights registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {competitor.insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} onDelete={handleDeleteInsight} />
              ))}
            </div>
          )}
        </div>
      )}

      <AddInsightModal
        open={showAddInsight}
        onClose={() => setShowAddInsight(false)}
        onCreated={load}
        competitorId={competitor.id}
      />
    </div>
  );
}
