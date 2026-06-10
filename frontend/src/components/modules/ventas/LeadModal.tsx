'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { ventasApi, type ApiLead, type ApiLeadList, type LeadInput } from '@/lib/api';
import { SOURCE_OPTIONS, PRACTICE_AREA_OPTIONS, PRIORITY_OPTIONS } from './constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Si se pasa, el modal edita ese lead; si no, crea uno nuevo */
  lead?: ApiLead | ApiLeadList | null;
}

const EMPTY: LeadInput = {
  name: '', email: '', phone: '', location: '', language: 'es',
  source: 'website', campaign: '', practice_area: 'general',
  priority: 'media', estimated_value: null, next_followup: null, notes: '',
};

const inputClass = 'w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm bg-[var(--surface)] text-[var(--t-0c2054)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20 focus:border-[var(--s-0c2054)]';
const labelClass = 'block text-sm font-semibold text-[var(--t-374151)] mb-1.5';

export function LeadModal({ open, onClose, onSaved, lead }: Props) {
  const [form, setForm] = useState<LeadInput>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!lead;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(lead ? {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        language: 'language' in lead ? lead.language : 'es',
        source: lead.source,
        campaign: 'campaign' in lead ? lead.campaign : '',
        practice_area: lead.practice_area,
        priority: lead.priority,
        estimated_value: lead.estimated_value,
        next_followup: lead.next_followup,
        notes: 'notes' in lead ? lead.notes : '',
      } : EMPTY);
    }
  }, [open, lead]);

  if (!open) return null;

  const set = (patch: Partial<LeadInput>) => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: LeadInput = {
        ...form,
        estimated_value: form.estimated_value || null,
        next_followup: form.next_followup || null,
      };
      if (isEdit && lead) {
        await ventasApi.update(lead.id, payload);
      } else {
        await ventasApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f2f8)]">
          <div>
            <h2 className="font-bold text-[var(--t-0c2054)] text-lg">{isEdit ? 'Editar Lead' : 'Nuevo Lead'}</h2>
            <p className="text-[var(--t-6b7280)] text-sm mt-0.5">
              {isEdit ? 'Actualiza la información del prospecto' : 'Registra un nuevo prospecto para seguimiento'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--t-9ca3af)] hover:bg-[var(--s-f0f2f8)] hover:text-[var(--t-0c2054)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div>
            <label className={labelClass}>Nombre *</label>
            <input value={form.name ?? ''} onChange={e => set({ name: e.target.value })} placeholder="ej. María Rodríguez" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email ?? ''} onChange={e => set({ email: e.target.value })} placeholder="correo@ejemplo.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input value={form.phone ?? ''} onChange={e => set({ phone: e.target.value })} placeholder="+1 (973) ..." className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ciudad / Estado</label>
              <input value={form.location ?? ''} onChange={e => set({ location: e.target.value })} placeholder="ej. Newark, NJ" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Idioma</label>
              <select value={form.language ?? 'es'} onChange={e => set({ language: e.target.value as 'es' | 'en' })} className={inputClass}>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fuente</label>
              <select value={form.source} onChange={e => set({ source: e.target.value as LeadInput['source'] })} className={inputClass}>
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Campaña</label>
              <input value={form.campaign ?? ''} onChange={e => set({ campaign: e.target.value })} placeholder="ej. VAWA Mayo 2026" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Área de práctica</label>
              <select value={form.practice_area} onChange={e => set({ practice_area: e.target.value })} className={inputClass}>
                {PRACTICE_AREA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select value={form.priority} onChange={e => set({ priority: e.target.value as LeadInput['priority'] })} className={inputClass}>
                {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor estimado (USD)</label>
              <input
                type="number" min="0" step="100"
                value={form.estimated_value ?? ''}
                onChange={e => set({ estimated_value: e.target.value || null })}
                placeholder="ej. 5000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Próximo seguimiento</label>
              <input
                type="date"
                value={form.next_followup ?? ''}
                onChange={e => set({ next_followup: e.target.value || null })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set({ notes: e.target.value })}
              placeholder="Contexto del caso, situación del prospecto, detalles relevantes..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[var(--s-e5e7eb)] text-[var(--t-374151)] rounded-xl py-2.5 text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--s-0c2054)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : isEdit
                ? <><Save className="w-4 h-4" /> Guardar cambios</>
                : <><Plus className="w-4 h-4" /> Crear lead</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
