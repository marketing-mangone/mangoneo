'use client';
import { useState } from 'react';
import { X, Upload, FileDown, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { ventasApi, type LeadImportResult } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Plantilla CSV de ejemplo — montos sin separador de miles, fechas AAAA-MM-DD
const TEMPLATE = [
  'name,email,phone,language,location,source,campaign,practice_area,stage,priority,estimated_value,next_followup,notes',
  'María González,maria@ejemplo.com,(862) 555-0101,es,"Newark, NJ",meta_ads,Campaña VAWA Mayo,vawa,nuevo,alta,4500,2026-06-20,Llegó por anuncio de Facebook',
  'John Smith,john@ejemplo.com,973-555-0199,en,"Dover, NJ",google_ads,,visa_u,contactado,media,3200,2026-06-25,',
].join('\n');

function downloadTemplate() {
  const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-leads-mangone.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportLeadsModal({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LeadImportResult | null>(null);

  if (!open) return null;

  const reset = () => { setFile(null); setError(''); setResult(null); setLoading(false); };
  const close = () => { reset(); onClose(); };

  const handleImport = async () => {
    if (!file) { setError('Selecciona un archivo CSV.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await ventasApi.importCsv(file, skipDuplicates);
      setResult(res);
      if (res.created > 0) onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--s-e5e7eb)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--t-0c2054)]">Importar leads (CSV)</h2>
              <p className="text-xs text-[var(--t-9ca3af)]">Carga masiva de contactos al pipeline</p>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--t-9ca3af)] hover:bg-[var(--s-f0f2f8)] hover:text-[var(--t-0c2054)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Resultado de importación */}
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    {result.created} {result.created === 1 ? 'lead importado' : 'leads importados'}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {result.total_rows} filas procesadas
                    {result.skipped > 0 && ` · ${result.skipped} omitidos (duplicados)`}
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-amber-50 rounded-xl px-4 py-3.5">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    {result.errors.length} {result.errors.length === 1 ? 'advertencia' : 'advertencias'}
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((er, i) => (
                      <li key={i} className="text-xs text-amber-700">
                        <span className="font-semibold">Fila {er.row}:</span> {er.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={reset} className="flex-1 border border-[var(--s-e5e7eb)] text-[var(--t-374151)] rounded-xl py-2.5 text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
                  Importar otro
                </button>
                <button onClick={close} className="flex-1 bg-[var(--s-0c2054)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-colors">
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

              {/* Plantilla */}
              <div className="flex items-center justify-between bg-[var(--s-f7f8fc)] rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--t-f79c31)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--t-0c2054)]">¿No sabes el formato?</p>
                    <p className="text-xs text-[var(--t-9ca3af)]">Descarga la plantilla de ejemplo</p>
                  </div>
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] border border-[var(--s-e5e7eb)] bg-[var(--surface)] px-3 py-2 rounded-lg hover:bg-[var(--s-f9fafb)] transition-all">
                  <FileDown className="w-4 h-4" />
                  Plantilla
                </button>
              </div>

              {/* Selector de archivo */}
              <div>
                <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Archivo CSV</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--s-e5e7eb)] rounded-xl px-4 py-8 cursor-pointer hover:border-[var(--s-0c2054)] transition-colors">
                  <Upload className="w-6 h-6 text-[var(--t-9ca3af)]" />
                  <span className="text-sm text-[var(--t-6b7280)] text-center">
                    {file ? <span className="font-semibold text-[var(--t-0c2054)]">{file.name}</span> : 'Haz clic para seleccionar un .csv'}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); }}
                  />
                </label>
              </div>

              {/* Opción de duplicados */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={e => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0C2054]"
                />
                <span className="text-sm text-[var(--t-374151)]">Omitir contactos con email ya existente</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button onClick={close} className="flex-1 border border-[var(--s-e5e7eb)] text-[var(--t-374151)] rounded-xl py-2.5 text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !file}
                  className="flex-1 bg-[var(--s-0c2054)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
