'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  CheckCircle2, XCircle, AlertTriangle, ClipboardCheck,
  Trash2, ChevronDown, ChevronUp, Wand2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type RuleResult = { pass: boolean; warning?: boolean; message: string };
type Rule = { id: string; label: string; check: (text: string) => RuleResult };
type Platform = { id: string; name: string; color: string; bgColor: string; rules: Rule[] };
type AnalysisResult = {
  platformId: string;
  rules: Array<{ id: string; label: string; result: RuleResult }>;
  passCount: number;
  failCount: number;
  warnCount: number;
};

// ── Shared rules ──────────────────────────────────────────────────────────────
const ruleNoEspecialistas: Rule = {
  id: 'no_especialistas',
  label: 'Sin "especialistas" (ética legal)',
  check: (text) => {
    if (!/especialista/i.test(text)) return { pass: true, message: 'Cumple — término no encontrado' };
    return { pass: false, message: 'Contiene "especialista/s" — prohibido por regulaciones de ética legal' };
  },
};

const ruleNoGuarantees: Rule = {
  id: 'no_guarantees',
  label: 'Sin garantías de resultados',
  check: (text) => {
    if (!/garantizamos|garantizado|aseguramos|100\s*%\s*(de\s*)?(éxito|aprobación)|resultados\s+garantizados/i.test(text))
      return { pass: true, message: 'Sin promesas de resultados detectadas' };
    return { pass: false, message: 'Contiene lenguaje que promete resultados — riesgo de violación de ética legal' };
  },
};

// ── Platform definitions ──────────────────────────────────────────────────────
const PLATFORMS: Platform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    bgColor: '#FDF2F8',
    rules: [
      {
        id: 'char_limit',
        label: 'Límite de caracteres del caption (2,200)',
        check: (text) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 2200) return { pass: true, message: `${n.toLocaleString('es')} / 2,200 caracteres` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 2,200 caracteres` };
        },
      },
      {
        id: 'hashtag_count',
        label: 'Límite de hashtags (máx. 30)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera agregar 3-10 para mayor alcance' };
          if (count <= 10) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — Instagram puede reducir alcance con más de 10` };
          return { pass: false, message: `${count} hashtags — supera el límite de 30; Instagram podría penalizar el alcance` };
        },
      },
      {
        id: 'no_links',
        label: 'Sin URLs en el caption',
        check: (text) => {
          if (!/https?:\/\/[^\s]+|www\.[^\s]+/i.test(text)) return { pass: true, message: 'Sin links detectados' };
          return { pass: false, message: 'Instagram no hace clickeables los links en captions — usa "link en bio"' };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    bgColor: '#EFF6FF',
    rules: [
      {
        id: 'char_best_practice',
        label: 'Longitud óptima de engagement (< 500 caracteres)',
        check: (text) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 500) return { pass: true, message: `${n} caracteres — dentro del rango óptimo de engagement` };
          if (n <= 63206) return { pass: true, warning: true, message: `${n.toLocaleString('es')} caracteres — dentro del límite técnico pero puede reducir el engagement` };
          return { pass: false, message: `Excede el límite técnico: ${n.toLocaleString('es')} / 63,206 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice',
        label: 'Hashtags (1-3 recomendados en Facebook)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera agregar 1-3 relevantes' };
          if (count <= 3) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima` };
          return { pass: true, warning: true, message: `${count} hashtags — Facebook rinde mejor con 1-3` };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    bgColor: '#F5F5F5',
    rules: [
      {
        id: 'char_limit',
        label: 'Límite de caracteres de descripción (2,200)',
        check: (text) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 2200) return { pass: true, message: `${n.toLocaleString('es')} / 2,200 caracteres` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 2,200 caracteres` };
        },
      },
      {
        id: 'hashtag_count',
        label: 'Hashtags (5-10 recomendados, máx. 30)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — TikTok depende de hashtags para la distribución del video' };
          if (count >= 5 && count <= 10) return { pass: true, message: `${count} hashtags — cantidad óptima para TikTok` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — el rango óptimo es 5-10` };
          return { pass: false, message: `${count} hashtags — supera el límite de 30` };
        },
      },
      {
        id: 'no_links',
        label: 'Sin URLs en descripción',
        check: (text) => {
          if (!/https?:\/\/[^\s]+|www\.[^\s]+/i.test(text)) return { pass: true, message: 'Sin links detectados' };
          return { pass: false, message: 'TikTok no permite links clickeables en descripciones de video' };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    bgColor: '#EFF6FF',
    rules: [
      {
        id: 'char_limit',
        label: 'Límite de caracteres (700 empresa / 3,000 personal)',
        check: (text) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 700) return { pass: true, message: `${n} caracteres — dentro del límite para páginas de empresa` };
          if (n <= 1300) return { pass: true, warning: true, message: `${n} caracteres — se truncará en páginas empresa (700 c); apto para perfil personal` };
          if (n <= 3000) return { pass: true, warning: true, message: `${n} caracteres — solo válido para perfil personal; excede páginas empresa` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 3,000 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice',
        label: 'Hashtags (3-5 recomendados en LinkedIn)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera agregar 3-5 relevantes' };
          if (count >= 3 && count <= 5) return { pass: true, message: `${count} hashtags — cantidad óptima para LinkedIn` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — LinkedIn recomienda 3-5 para mejor alcance` };
          return { pass: false, message: `${count} hashtags — excede el máximo recomendado (30)` };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    color: '#000000',
    bgColor: '#F9FAFB',
    rules: [
      {
        id: 'char_limit',
        label: 'Límite de caracteres (280; links = 23 c/u)',
        check: (text) => {
          const normalized = text.replace(/https?:\/\/[^\s]+/g, 'x'.repeat(23));
          const n = normalized.length;
          const raw = text.length;
          if (raw === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 280) return { pass: true, message: `~${n} / 280 caracteres (los links cuentan como 23 c/u)` };
          return { pass: false, message: `Excede el límite: ~${n} / 280 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice',
        label: 'Hashtags (1-2 recomendados en X)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags' };
          if (count <= 2) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima para X` };
          return { pass: true, warning: true, message: `${count} hashtags — X rinde mejor con 1-2; también consumen caracteres` };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    bgColor: '#FFF5F5',
    rules: [
      {
        id: 'char_limit',
        label: 'Límite de descripción (5,000 caracteres)',
        check: (text) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 5000) return { pass: true, message: `${n.toLocaleString('es')} / 5,000 caracteres${n <= 157 ? ' — los primeros 157 chars son la vista previa en búsqueda' : ''}` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 5,000 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice',
        label: 'Hashtags en descripción (3-5 óptimo, máx. 15 visibles)',
        check: (text) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera agregar 3-5 relevantes al tema del video' };
          if (count >= 3 && count <= 5) return { pass: true, message: `${count} hashtags — cantidad óptima` };
          if (count <= 15) return { pass: true, warning: true, message: `${count} hashtags — YouTube solo muestra los primeros 15` };
          return { pass: true, warning: true, message: `${count} hashtags — YouTube ignora los que superan 15; puede marcar como spam` };
        },
      },
      ruleNoEspecialistas,
      ruleNoGuarantees,
    ],
  },
];

// ── Platform icon SVGs ────────────────────────────────────────────────────────
function PlatformIcon({ id, size = 16, color }: { id: string; size?: number; color?: string }) {
  const fill = color || 'currentColor';
  const s = size;

  if (id === 'instagram') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke={fill} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke={fill} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill={fill} />
    </svg>
  );

  if (id === 'facebook') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );

  if (id === 'tiktok') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.27 8.27 0 0 0 4.84 1.55V7.03a4.85 4.85 0 0 1-1.07-.34z" />
    </svg>
  );

  if (id === 'linkedin') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );

  if (id === 'twitter') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  if (id === 'youtube') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.97A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
    </svg>
  );

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HerramientasPage() {
  const [text, setText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'facebook', 'linkedin']);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());

  const charCount = text.length;
  const hashtagCount = (text.match(/#[\wÀ-ſ]+/g) || []).length;
  const mentionCount = (text.match(/@\w+/g) || []).length;
  const linkCount = (text.match(/https?:\/\/[^\s]+/gi) || []).length;

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const analyze = () => {
    if (!text.trim() || selectedPlatforms.length === 0) return;
    const newResults: AnalysisResult[] = PLATFORMS
      .filter(p => selectedPlatforms.includes(p.id))
      .map(platform => {
        const rules = platform.rules.map(rule => ({
          id: rule.id,
          label: rule.label,
          result: rule.check(text),
        }));
        return {
          platformId: platform.id,
          rules,
          passCount: rules.filter(r => r.result.pass && !r.result.warning).length,
          failCount: rules.filter(r => !r.result.pass).length,
          warnCount: rules.filter(r => r.result.pass && r.result.warning).length,
        };
      });
    setResults(newResults);
    setExpandedPlatforms(new Set(newResults.map(r => r.platformId)));
  };

  const reset = () => {
    setText('');
    setResults(null);
    setExpandedPlatforms(new Set());
  };

  const charPct = Math.min((charCount / 2200) * 100, 100);
  const barColor = charCount > 2200 ? 'bg-red-500' : charCount > 1800 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f8fc]">
      <Header title="Herramientas" subtitle="Utilidades para el equipo de marketing" />

      <div className="px-10 py-8 space-y-8">

        {/* Tab bar — listo para futuras herramientas */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C2054] text-white shadow-sm">
            <ClipboardCheck className="w-4 h-4" />
            Auditor de Contenido
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* ── LEFT: input panel ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Text area */}
            <div className="bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-[#1a1a3e]">Contenido a auditar</h2>
                <div className="flex items-center gap-3 text-[12px] text-[#9898bb]">
                  <span>
                    <span className={charCount > 0 ? 'font-bold text-[#1a1a3e]' : ''}>
                      {charCount.toLocaleString('es')}
                    </span>{' '}chars
                  </span>
                  {hashtagCount > 0 && (
                    <span className="font-semibold text-[#F79C31]">{hashtagCount} #</span>
                  )}
                  {mentionCount > 0 && (
                    <span className="font-semibold text-[#0C2054]">{mentionCount} @</span>
                  )}
                  {linkCount > 0 && (
                    <span className="font-semibold text-blue-500">{linkCount} link{linkCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Pega aquí el caption, descripción o texto que quieres auditar…"
                className="w-full h-52 resize-none text-[14px] text-[#1a1a3e] placeholder:text-[#c0c0d8] border border-[#e8e8f0] rounded-xl p-4 focus:outline-none focus:border-[#0C2054] focus:ring-2 focus:ring-[#0C2054]/8 transition-all leading-relaxed"
              />

              {/* Footer bar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-[12px] text-[#9898bb] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#c0c0d8]">Límite IG</span>
                  <div className="w-24 h-1.5 bg-[#e8e8f0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${charPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#c0c0d8]">2,200</span>
                </div>
              </div>
            </div>

            {/* Platform selector */}
            <div className="bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-sm space-y-4">
              <h2 className="text-[15px] font-bold text-[#1a1a3e]">Redes sociales a auditar</h2>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const active = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                        active
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-white border-[#e8e8f0] text-[#8888aa] hover:border-[#c0c0d8] hover:text-[#4a4a6a]'
                      }`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : {}}
                    >
                      <PlatformIcon id={p.id} size={14} color={active ? 'white' : p.color} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-[12px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Selecciona al menos una red social para auditar.
                </p>
              )}
            </div>

            {/* Analyze button */}
            <button
              onClick={analyze}
              disabled={!text.trim() || selectedPlatforms.length === 0}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0C2054] text-white text-[14px] font-bold shadow-md hover:bg-[#0f2860] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" />
              Analizar Contenido
            </button>
          </div>

          {/* ── RIGHT: results panel ───────────────────────────────────────── */}
          <div className="space-y-4">
            {results === null ? (
              <div className="bg-white rounded-2xl border border-[#e8e8f0] p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[420px]">
                <div className="w-16 h-16 rounded-2xl bg-[#f0f2ff] flex items-center justify-center mb-5">
                  <ClipboardCheck className="w-8 h-8 text-[#0C2054]" />
                </div>
                <p className="text-[16px] font-bold text-[#1a1a3e] mb-2">Listo para auditar</p>
                <p className="text-[13px] text-[#9898bb] max-w-xs leading-relaxed">
                  Pega tu contenido, selecciona las redes sociales y haz clic en{' '}
                  <span className="font-semibold text-[#0C2054]">Analizar Contenido</span>.
                </p>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const totalFails = results.reduce((s, r) => s + r.failCount, 0);
                    const totalWarns = results.reduce((s, r) => s + r.warnCount, 0);
                    const totalPass = results.reduce((s, r) => s + r.passCount, 0);
                    return (
                      <>
                        <span className="text-[12px] font-semibold text-[#4a4a6a]">
                          {results.length} red{results.length !== 1 ? 'es' : ''} analizadas
                        </span>
                        <span className="text-[#e8e8f0]">·</span>
                        {totalFails > 0 ? (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> {totalFails} error{totalFails !== 1 ? 'es' : ''}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sin errores críticos
                          </span>
                        )}
                        {totalWarns > 0 && (
                          <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5" /> {totalWarns} advertencia{totalWarns !== 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Per-platform cards */}
                {results.map(result => {
                  const platform = PLATFORMS.find(p => p.id === result.platformId)!;
                  const isExpanded = expandedPlatforms.has(result.platformId);

                  return (
                    <div
                      key={result.platformId}
                      className="bg-white rounded-2xl border border-[#e8e8f0] shadow-sm overflow-hidden"
                    >
                      {/* Header row */}
                      <button
                        onClick={() => toggleExpanded(result.platformId)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f7f8fc] transition-colors text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: platform.bgColor }}
                        >
                          <PlatformIcon id={platform.id} size={18} color={platform.color} />
                        </div>

                        <span className="font-bold text-[14px] text-[#1a1a3e] flex-1">{platform.name}</span>

                        {/* Score pills */}
                        <div className="flex items-center gap-1.5">
                          {result.failCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <XCircle className="w-3 h-3" /> {result.failCount} error{result.failCount !== 1 ? 'es' : ''}
                            </span>
                          )}
                          {result.warnCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> {result.warnCount}
                            </span>
                          )}
                          {result.failCount === 0 && result.warnCount === 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </div>

                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[#c0c0d8] flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-[#c0c0d8] flex-shrink-0" />
                        }
                      </button>

                      {/* Rule rows */}
                      {isExpanded && (
                        <div className="border-t border-[#f0f0f8] divide-y divide-[#f7f7fc]">
                          {result.rules.map(rule => (
                            <div key={rule.id} className="flex items-start gap-3 px-5 py-3.5">
                              <div className="flex-shrink-0 mt-0.5">
                                {!rule.result.pass ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : rule.result.warning ? (
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[#4a4a6a] leading-snug">{rule.label}</p>
                                <p className={`text-[12px] mt-0.5 leading-snug ${
                                  !rule.result.pass
                                    ? 'text-red-600'
                                    : rule.result.warning
                                    ? 'text-amber-600'
                                    : 'text-[#9898bb]'
                                }`}>
                                  {rule.result.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
