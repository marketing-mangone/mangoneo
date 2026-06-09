'use client';
import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { competitorsApi, type InsightInput, type InsightType, type InsightImpact } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  competitorId?: number;
  competitors?: { id: number; name: string }[];
}

export function AddInsightModal({ open, onClose, onCreated, competitorId, competitors = [] }: Props) {
  const [form, setForm] = useState<InsightInput & { action_items: string[] }>({
    insight_type: 'observation',
    impact: 'medium',
    title: '',
    description: '',
    action_items: [''],
    competitor: competitorId ?? null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError('Título y descripción son requeridos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await competitorsApi.createInsight({
        ...form,
        action_items: form.action_items.filter(a => a.trim()),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f2f8)]">
          <h2 className="font-bold text-[var(--t-0c2054)] text-lg">Nuevo Insight</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--t-9ca3af)] hover:bg-[var(--s-f0f2f8)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Tipo</label>
              <select
                value={form.insight_type}
                onChange={e => setForm(f => ({ ...f, insight_type: e.target.value as InsightType }))}
                className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 bg-[var(--surface)]"
              >
                <option value="observation">Observación</option>
                <option value="threat">Amenaza</option>
                <option value="opportunity">Oportunidad</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Impacto</label>
              <select
                value={form.impact}
                onChange={e => setForm(f => ({ ...f, impact: e.target.value as InsightImpact }))}
                className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 bg-[var(--surface)]"
              >
                <option value="high">Alto</option>
                <option value="medium">Medio</option>
                <option value="low">Bajo</option>
              </select>
            </div>
          </div>

          {competitors.length > 0 && !competitorId && (
            <div>
              <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Competidor (opcional)</label>
              <select
                value={form.competitor ?? ''}
                onChange={e => setForm(f => ({ ...f, competitor: e.target.value ? Number(e.target.value) : null }))}
                className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 bg-[var(--surface)]"
              >
                <option value="">General (sin competidor específico)</option>
                {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Título *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="ej. Competidor lanzó campaña agresiva en Meta"
              className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Descripción *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe el insight en detalle..."
              rows={3}
              className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Acciones recomendadas</label>
            <div className="space-y-2">
              {form.action_items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item}
                    onChange={e => setForm(f => ({
                      ...f,
                      action_items: f.action_items.map((a, j) => j === i ? e.target.value : a),
                    }))}
                    placeholder={`Acción ${i + 1}`}
                    className="flex-1 border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20"
                  />
                  {form.action_items.length > 1 && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, action_items: f.action_items.filter((_, j) => j !== i) }))}
                      className="w-9 h-9 rounded-xl border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-9ca3af)] hover:text-red-500 hover:border-red-200 transition-all">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setForm(f => ({ ...f, action_items: [...f.action_items, ''] }))}
                className="flex items-center gap-1.5 text-xs text-[var(--t-0c2054)] font-medium hover:text-[#1a3a7a] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar acción
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[var(--s-e5e7eb)] text-[var(--t-374151)] rounded-xl py-2.5 text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[var(--s-0c2054)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors">
              {loading ? 'Guardando...' : 'Guardar insight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
