'use client';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { competitorsApi, type CompetitorInput } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRACTICE_AREAS_OPTIONS = [
  'VAWA', 'Visa U', 'Visa T', 'SIJS', 'Reunificación Familiar',
  'Defensa de Deportación', 'Naturalización', 'Asilo', 'TPS', 'DACA',
];

export function AddCompetitorModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CompetitorInput>({
    name: '', website: '', category: 'direct', description: '', location: '',
    practice_areas: [], logo_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const toggleArea = (area: string) => {
    setForm(f => ({
      ...f,
      practice_areas: f.practice_areas?.includes(area)
        ? f.practice_areas.filter(a => a !== area)
        : [...(f.practice_areas ?? []), area],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    setError('');
    try {
      await competitorsApi.create(form);
      onCreated();
      onClose();
      setForm({ name: '', website: '', category: 'direct', description: '', location: '', practice_areas: [], logo_url: '' });
    } catch (err: any) {
      setError(err.message || 'Error al crear competidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f2f8]">
          <div>
            <h2 className="font-bold text-[#0C2054] text-lg">Agregar Competidor</h2>
            <p className="text-[#6b7280] text-sm mt-0.5">Registra una firma competidora para monitorear</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ca3af] hover:bg-[#f0f2f8] hover:text-[#0C2054] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Nombre *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ej. García Immigration Law"
              className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[#0C2054]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Tipo</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[#0C2054] bg-white"
              >
                <option value="direct">Directo</option>
                <option value="indirect">Indirecto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">Ciudad / Estado</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="ej. Morris Plains, NJ"
                className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[#0C2054]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Sitio web</label>
            <input
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
              type="url"
              className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[#0C2054]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Breve descripción del competidor, su posicionamiento, mercado objetivo..."
              rows={3}
              className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[#0C2054] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-2">Áreas de práctica</label>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_AREAS_OPTIONS.map(area => {
                const selected = form.practice_areas?.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected
                        ? 'bg-[#0C2054] text-white border-[#0C2054]'
                        : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#0C2054]/30'
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#e5e7eb] text-[#374151] rounded-xl py-2.5 text-sm font-medium hover:bg-[#f9fafb] transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0C2054] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a7a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : (
                <><Plus className="w-4 h-4" /> Agregar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
