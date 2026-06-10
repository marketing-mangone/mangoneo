import type { LeadStage, LeadPriority, LeadSource, LeadActivityType } from '@/lib/api';

export const PIPELINE_STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'nuevo',      label: 'Nuevo',             color: '#3b82f6' },
  { key: 'contactado', label: 'Contactado',        color: '#06b6d4' },
  { key: 'calificado', label: 'Calificado',        color: '#8b5cf6' },
  { key: 'consulta',   label: 'Consulta agendada', color: '#F79C31' },
  { key: 'contrato',   label: 'Contrato enviado',  color: '#f59e0b' },
  { key: 'ganado',     label: 'Ganado',            color: '#10b981' },
];

export const STAGE_COLORS: Record<LeadStage, string> = {
  nuevo: '#3b82f6',
  contactado: '#06b6d4',
  calificado: '#8b5cf6',
  consulta: '#F79C31',
  contrato: '#f59e0b',
  ganado: '#10b981',
  perdido: '#ef4444',
};

export const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'website',          label: 'Sitio Web' },
  { value: 'meta_ads',         label: 'Meta Ads' },
  { value: 'google_ads',       label: 'Google Ads' },
  { value: 'organico',         label: 'Búsqueda Orgánica' },
  { value: 'redes_sociales',   label: 'Redes Sociales' },
  { value: 'golden_tickets',   label: 'Golden Tickets (Referido)' },
  { value: 'consultation_day', label: 'Consultation Day' },
  { value: 'podcast',          label: 'Podcast' },
  { value: 'evento',           label: 'Evento' },
  { value: 'otro',             label: 'Otro' },
];

export const PRACTICE_AREA_OPTIONS: { value: string; label: string }[] = [
  { value: 'vawa',                label: 'VAWA' },
  { value: 'visa_u',              label: 'Visa U' },
  { value: 'visa_t',              label: 'Visa T' },
  { value: 'sijs',                label: 'SIJS' },
  { value: 'ajuste_estatus',      label: 'Ajuste de Estatus' },
  { value: 'reunion_familiar',    label: 'Reunificación Familiar' },
  { value: 'defensa_deportacion', label: 'Defensa de Deportación' },
  { value: 'naturalizacion',      label: 'Naturalización' },
  { value: 'proceso_consular',    label: 'Proceso Consular' },
  { value: 'general',             label: 'General / Inmigración' },
];

export const PRIORITY_OPTIONS: { value: LeadPriority; label: string; color: string }[] = [
  { value: 'alta',  label: 'Alta',  color: '#ef4444' },
  { value: 'media', label: 'Media', color: '#F79C31' },
  { value: 'baja',  label: 'Baja',  color: '#10b981' },
];

export const ACTIVITY_TYPE_OPTIONS: { value: LeadActivityType; label: string }[] = [
  { value: 'nota',     label: 'Nota' },
  { value: 'llamada',  label: 'Llamada' },
  { value: 'email',    label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'reunion',  label: 'Reunión' },
];

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!n) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
