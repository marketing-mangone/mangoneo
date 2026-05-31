'use client';
import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import {
  CheckCircle2, XCircle, AlertTriangle, ClipboardCheck,
  Trash2, ChevronDown, ChevronUp, Wand2, ShieldAlert,
  FileText, ImageIcon, Upload, ArrowRight, RotateCcw, ScanText,
} from 'lucide-react';

type InputMode = 'text' | 'image';
type OcrStatus = 'idle' | 'processing' | 'done' | 'error';

// ── Types ─────────────────────────────────────────────────────────────────────
type ContentType = 'organic' | 'video' | 'paid' | 'blog' | 'print';

type AuditCtx = { text: string; contentType: ContentType };

type RuleResult = {
  pass: boolean;
  /** amarillo: pasa pero con advertencia */
  warning?: boolean;
  /** rojo oscuro: falla crítica (trademark / norma severa) */
  critical?: boolean;
  message: string;
};

type Rule = {
  id: string;
  label: string;
  /** 'legal' = cumplimiento ético/legal | 'technical' = límites de plataforma */
  category: 'legal' | 'technical';
  check: (ctx: AuditCtx) => RuleResult;
};

type Platform = {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  rules: Rule[];
};

type AnalysisResult = {
  platformId: string;
  rules: Array<{ id: string; label: string; category: 'legal' | 'technical'; result: RuleResult }>;
  criticalCount: number;
  failCount: number;
  warnCount: number;
  passCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// REGLAS DE CUMPLIMIENTO LEGAL COMPARTIDAS
// Fuente: Documento Maestro de Cumplimiento Ético v2.0 (Mayo 2026)
// Base normativa: NJ RPC 7.1 / 7.2 / 7.3 / 7.4 / 1.18 | ABA Model Rule 7.1 | ACPE | USPTO
// ─────────────────────────────────────────────────────────────────────────────

// ① CRÍTICO — Trademark USPTO Serial 90227319 + promesa de resultado (Sección 1)
const ruleNoArreglarSinSalir: Rule = {
  id: 'no_arreglar_sin_salir',
  category: 'legal',
  label: 'Sin "Arreglar sin salir" y variantes (USPTO + NJ RPC 7.1)',
  check: ({ text }) => {
    if (!/arreglar\s+sin\s+salir|ajustar\s+sin\s+salir|regulariz[ae][rn]?\s+sin\s+salir/i.test(text))
      return { pass: true, message: 'Cumple — frase de marca registrada no detectada' };
    return {
      pass: false,
      critical: true,
      message: 'CRÍTICO: "Arreglar sin salir" es marca registrada USPTO (Alexandra Lozano, Serial 90227319). Eliminación inmediata requerida — infringe marca registrada y constituye promesa de resultado. Ver Sección 1 del Documento Maestro.',
    };
  },
};

// ② Término "especialista/s" sin certificación oficial (NJ RPC 7.4)
const ruleNoEspecialistas: Rule = {
  id: 'no_especialistas',
  category: 'legal',
  label: 'Sin "especialista/s" (NJ RPC 7.4 — sin certificación en NJ)',
  check: ({ text }) => {
    if (!/especialista/i.test(text))
      return { pass: true, message: 'Cumple — NJ no reconoce certificación de especialista en derecho migratorio' };
    return {
      pass: false,
      message: 'Contiene "especialista/s" — NJ RPC 7.4 prohíbe este término sin certificación oficial reconocida en NJ. Usar: "con concentración en derecho migratorio" o "dedicada exclusivamente a casos de inmigración".',
    };
  },
};

// ③ Garantías explícitas de resultado (NJ RPC 7.1 / ABA Model Rule 7.1)
const ruleNoGuarantees: Rule = {
  id: 'no_explicit_guarantees',
  category: 'legal',
  label: 'Sin garantías explícitas de resultado (NJ RPC 7.1)',
  check: ({ text }) => {
    const pattern = /garantizamos|garantizado|aprobaci[oó]n\s+garantizada|100\s*%\s*(de\s*)?(éxito|aprobaci[oó]n)|te\s+conseguimos\s+(tu\s+)?(visa|residencia|green\s*card|pap[eo]les)|conseguimos\s+tu|hemos\s+ganado\s+\d|ganado\s+\d+\s+casos/i;
    if (!pattern.test(text))
      return { pass: true, message: 'Sin garantías explícitas de resultado detectadas' };
    return {
      pass: false,
      critical: true,
      message: 'Contiene promesa de resultado (garantizamos, 100% de éxito, "te conseguimos tu visa/residencia", etc.) — violación directa de NJ RPC 7.1. Ningún abogado puede garantizar una aprobación de USCIS. Reformular con condicionales.',
    };
  },
};

// ④ Garantías implícitas ("sin riesgo", "tu caso es seguro", protección deportación) (NJ RPC 7.1)
const ruleNoImpliedGuarantees: Rule = {
  id: 'no_implied_guarantees',
  category: 'legal',
  label: 'Sin garantías implícitas de resultado (NJ RPC 7.1)',
  check: ({ text }) => {
    const pattern = /sin\s+riesgo|tu\s+caso\s+es\s+seguro|aprobaci[oó]n\s+segura|te\s+protegemos\s+de\s+la\s+deportaci[oó]n|te\s+salvamos|libres\s+de\s+deportaci[oó]n|no\s+te\s+van\s+a\s+deportar|tu\s+(caso|aplicaci[oó]n)\s+(est[aá]\s+)?segur/i;
    if (!pattern.test(text))
      return { pass: true, message: 'Sin garantías implícitas detectadas' };
    return {
      pass: false,
      message: 'Contiene garantía implícita de resultado ("sin riesgo", "tu caso es seguro", "te protegemos de la deportación") — viola NJ RPC 7.1. Reformular: "Te orientamos sobre las opciones legales disponibles para tu situación migratoria".',
    };
  },
};

// ⑤ Estadísticas propias no verificables (NJ RPC 7.1)
const ruleNoUnverifiableStats: Rule = {
  id: 'no_unverifiable_stats',
  category: 'legal',
  label: 'Sin estadísticas propias sin fuente verificable (NJ RPC 7.1)',
  check: ({ text }) => {
    const pattern = /\d[\d,\.]+\s*(casos?\s+(ganados?|aprobados?|exitosos?)|aprobaciones|familias\s+(regularizadas?|ayudadas?|reunificadas?))|hemos?\s+(ganado|logrado|conseguido|tramitado)\s+\d|miles?\s+de\s+(familias|casos|clientes)/i;
    if (!pattern.test(text))
      return { pass: true, message: 'Sin estadísticas propias no verificables detectadas' };
    return {
      pass: false,
      message: 'Contiene estadísticas propias sin fuente verificable — NJ RPC 7.1 prohíbe publicidad engañosa. Solo se permiten estadísticas de terceros verificables (ej: "Inc. 5000 – 2025", "+18 años de experiencia"). Eliminar o citar fuente externa.',
    };
  },
};

// ⑥ Comparaciones de precio no verificables (NJ RPC 7.1)
const ruleNoPriceComparisons: Rule = {
  id: 'no_price_comparisons',
  category: 'legal',
  label: 'Sin comparativas de precio no verificables (NJ RPC 7.1)',
  check: ({ text }) => {
    const pattern = /el\s+(caso\s+)?m[aá]s\s+barato|los?\s+mejores?\s+precios?|m[aá]s\s+econ[oó]micos?|precios?\s+m[aá]s\s+bajos?|tarifas?\s+m[aá]s\s+(bajas?|accesibles?)/i;
    if (!pattern.test(text))
      return { pass: true, message: 'Sin comparativas de precio detectadas' };
    return {
      pass: false,
      message: 'Contiene afirmación comparativa de precio no verificable — viola NJ RPC 7.1. Sustituir por: "Consulta gratuita disponible. Los honorarios varían según el tipo de caso".',
    };
  },
};

// ⑦ Superlativos no verificables (NJ RPC 7.1 / ABA Model Rule 7.1)
const ruleNoUnverifiableSuperlatives: Rule = {
  id: 'no_unverifiable_superlatives',
  category: 'legal',
  label: 'Sin superlativos no verificables (NJ RPC 7.1 / ABA Model Rule 7.1)',
  check: ({ text }) => {
    const pattern = /la\s+mejor\s+abogada?|el\s+mejor\s+abogado?|los?\s+mejores?\s+abogados?|la\s+firma\s+(m[aá]s|mejor|#1|n[uú]mero\s+1)|#1\s+en\s+inmigraci[oó]n|el\s+m[aá]s\s+confiable|la\s+m[aá]s\s+confiable/i;
    if (!pattern.test(text))
      return { pass: true, message: 'Sin superlativos no verificables detectados' };
    return {
      pass: false,
      message: 'Contiene superlativo no verificable ("la mejor abogada", "#1 en inmigración") — comparación no sustanciable bajo ABA Model Rule 7.1 y NJ RPC 7.1. Sustituir por credenciales verificables: "Licencia activa en NJ · Inc. 5000 (2025)".',
    };
  },
};

// ⑧ Hashtags con promesas o garantías (NJ RPC 7.1)
const ruleNoProhibitedHashtags: Rule = {
  id: 'no_prohibited_hashtags',
  category: 'legal',
  label: 'Sin hashtags con promesas o garantías (NJ RPC 7.1)',
  check: ({ text }) => {
    const hashtags = text.match(/#[\wÀ-ſ]+/g) || [];
    const prohibited = hashtags.filter(h =>
      /garantiz|aprobaci[oó]n(segura|garantizada)|visagarantizada|teayudamos|residenciagarantizada|sindeportaci[oó]n|seguros?connosotros|100exito|sinriesgo/i.test(h.replace(/#/, ''))
    );
    if (prohibited.length === 0)
      return { pass: true, message: 'Sin hashtags con promesas detectados' };
    return {
      pass: false,
      message: `Hashtag(s) con promesa detectado(s): ${prohibited.join(', ')} — los hashtags son parte del contenido publicitario y están sujetos a NJ RPC 7.1. Eliminar o reemplazar por hashtags descriptivos (#InmigracionNJ, #DerechoMigratorio).`,
    };
  },
};

// ⑨ Testimonios sin disclaimer obligatorio (NJ RPC 7.1 + ACPE + NJ RPC 1.6)
const ruleTestimonialDisclaimer: Rule = {
  id: 'testimonial_disclaimer',
  category: 'legal',
  label: 'Disclaimer requerido en testimonios de clientes (NJ RPC 7.1 + ACPE)',
  check: ({ text }) => {
    const hasTestimonialSignal = /testimonio|me\s+ayudaron|gracias\s+a\s+(la\s+)?(abogad|firma|mangone)|aprobaron\s+mi|nos\s+aprobaron|mi\s+caso\s+(fue\s+)?aprobado|lo\s+logramos|mi\s+historia|cliente\s+satisfecho|resultado\s+de\s+mi\s+caso/i.test(text);
    if (!hasTestimonialSignal)
      return { pass: true, message: 'Sin señales de testimonio detectadas' };
    const hasDisclaimer = /cada\s+caso.*[uú]nico|resultados.*dependen|no\s+garantiz|circunstancias\s+individuales|no\s+constituye\s+asesor[ií]a/i.test(text);
    if (hasDisclaimer)
      return { pass: true, message: 'Se detectó testimonio con disclaimer presente ✓' };
    return {
      pass: false,
      warning: true,
      message: 'Se detectaron señales de testimonio de cliente sin el disclaimer obligatorio (Sección 3.1). Agregar: "Cada caso de inmigración es único. Los resultados dependen de las circunstancias individuales y de las determinaciones de USCIS u otras autoridades competentes. Este contenido es informativo y no constituye asesoría legal." También requiere consentimiento escrito del cliente (NJ RPC 1.6).',
    };
  },
};

// ⑩ Contenido informativo/legal sin disclaimer educativo (ACPE)
const ruleEducationalDisclaimer: Rule = {
  id: 'educational_disclaimer',
  category: 'legal',
  label: 'Disclaimer en contenido informativo legal (ACPE / NJ RPC 7.1)',
  check: ({ text }) => {
    const hasLegalContent = /\b(USCIS|visa\s+[UBTFJH]|forma\s+I[-\s]?\d|green\s*card|residencia\s+permanente|naturalizaci[oó]n|asilo|deportaci[oó]n|solicitud\s+de|proceso\s+(migratorio|de\s+inmigr)|ley\s+de\s+inmigr|audiencia\s+(de\s+)?inmigr|corte\s+de\s+inmigr|VAWA|TPS|DACA|parole)\b/i.test(text);
    if (!hasLegalContent)
      return { pass: true, message: 'Sin contenido informativo legal específico detectado' };
    const hasDisclaimer = /no\s+constituye\s+asesor[ií]a\s+legal|solo\s+informativo|consulta\s+con\s+un\s+abogado|no\s+es\s+asesor[ií]a\s+legal/i.test(text);
    if (hasDisclaimer)
      return { pass: true, message: 'Contenido legal con disclaimer educativo presente ✓' };
    return {
      pass: false,
      warning: true,
      message: 'Se detectó contenido informativo legal específico sin el disclaimer educativo (Sección 3.2). Agregar: "Este contenido es solo informativo y no constituye asesoría legal. Cada caso migratorio es único. Consulta con un abogado para evaluar tu situación particular." (Obligatorio en posts educativos, según ACPE).',
    };
  },
};

// ⑪ Precios mencionados sin disclaimer de variabilidad (NJ RPC 7.1 — Sección 3.3)
const rulePriceDisclaimer: Rule = {
  id: 'price_disclaimer',
  category: 'legal',
  label: 'Disclaimer de variabilidad si se mencionan costos (NJ RPC 7.1 — §3.3)',
  check: ({ text }) => {
    const hasPriceSignal = /\$\s*\d|\d+\s*(d[oó]lares|usd)|honorario|tarifa|costo|precio|pago\s+(inicial|mensual|total)/i.test(text);
    if (!hasPriceSignal)
      return { pass: true, message: 'Sin mención de precios o costos detectada' };
    const hasDisclaimer = /pueden\s+variar|varian\s+seg[uú]n|seg[uú]n\s+el\s+caso|contacta?nos\s+para|consulta\s+personalizada/i.test(text);
    if (hasDisclaimer)
      return { pass: true, message: 'Precio mencionado con disclaimer de variabilidad presente ✓' };
    return {
      pass: false,
      warning: true,
      message: 'Se detectó mención de precios sin el disclaimer de variabilidad (Sección 3.3). Agregar: "Las tarifas de USCIS y los honorarios profesionales pueden variar según el tipo de caso y las circunstancias individuales. Contáctanos para una consulta personalizada."',
    };
  },
};

// ⑫ CTA que invita a compartir detalles del caso en comentarios públicos (NJ RPC 1.18 + 7.3)
const ruleNoPublicCaseDisclosure: Rule = {
  id: 'no_public_case_disclosure',
  category: 'legal',
  label: 'CTA sin solicitud de datos del caso en público (NJ RPC 1.18 + 7.3)',
  check: ({ text }) => {
    const pattern = /coment[ae]\s+(aqu[ií]|abajo)\s+(tu\s+)?(caso|situaci[oó]n|status)|cu[eé]ntanos?\s+(en\s+comentarios?|aqu[ií])\s+(tu\s+)?(caso|histor|situaci[oó]n)|comparte?\s+(tu\s+)?(caso|situaci[oó]n)\s+en\s+comentarios?|d[eé]janos?\s+en\s+comentarios?.{0,30}(caso|situaci[oó]n)/i;
    if (!pattern.test(text))
      return { pass: true, message: 'CTA no solicita datos del caso en comentarios públicos' };
    return {
      pass: false,
      message: 'CTA solicita detalles del caso en comentarios públicos — viola NJ RPC 1.18 (confidencialidad desde primer contacto) y puede configurar solicitation bajo NJ RPC 7.3. Sustituir por: "Escríbeme al DM y te oriento sobre las opciones que podrían aplicar para tu caso."',
    };
  },
};

// Regla exclusiva para anuncios pagados (NJ RPC 7.2)
const rulePaidAdIdentification: Rule = {
  id: 'paid_ad_identification',
  category: 'legal',
  label: 'Identificación completa en publicidad pagada (NJ RPC 7.2)',
  check: ({ text, contentType }) => {
    if (contentType !== 'paid')
      return { pass: true, message: 'No aplica (solo para anuncios pagados)' };
    const hasFirmName = /mangone\s+law\s+firm/i.test(text);
    const hasAbogados = /abogados?|firma\s+de\s+abogados?/i.test(text);
    const hasJurisdiction = /\bNJ\b|new\s+jersey/i.test(text);
    if (hasFirmName && hasAbogados && hasJurisdiction)
      return { pass: true, message: 'Identificación completa: nombre de firma + "Abogados" + jurisdicción NJ ✓' };
    const missing = [];
    if (!hasFirmName) missing.push('"Mangone Law Firm"');
    if (!hasAbogados) missing.push('"Abogados" o "Firma de abogados"');
    if (!hasJurisdiction) missing.push('jurisdicción (New Jersey / NJ)');
    return {
      pass: false,
      message: `Publicidad pagada sin identificación completa — NJ RPC 7.2 requiere: nombre de la firma + "Abogados" + jurisdicción. Falta: ${missing.join(', ')}.`,
    };
  },
};

// Regla exclusiva para videos/reels (ACPE — Sección 4.2)
const ruleVideoDisclaimer: Rule = {
  id: 'video_disclaimer',
  category: 'legal',
  label: 'Disclaimer en descripción de video/reel (ACPE — §4.2)',
  check: ({ text, contentType }) => {
    if (contentType !== 'video')
      return { pass: true, message: 'No aplica (solo para videos y reels)' };
    const hasDisclaimer = /no\s+constituye\s+asesor[ií]a\s+legal|solo\s+informativo|no\s+es\s+asesor[ií]a\s+legal/i.test(text);
    if (hasDisclaimer)
      return { pass: true, message: 'Disclaimer educativo en descripción de video presente ✓' };
    return {
      pass: false,
      warning: true,
      message: 'Los videos y reels deben incluir el disclaimer 3.2 en la descripción: "Este contenido es solo informativo y no constituye asesoría legal. Cada caso migratorio es único. Consulta con un abogado para evaluar tu situación particular."',
    };
  },
};

// Todas las reglas de cumplimiento legal compartidas
const SHARED_LEGAL_RULES: Rule[] = [
  ruleNoArreglarSinSalir,
  ruleNoEspecialistas,
  ruleNoGuarantees,
  ruleNoImpliedGuarantees,
  ruleNoUnverifiableStats,
  ruleNoPriceComparisons,
  ruleNoUnverifiableSuperlatives,
  ruleNoProhibitedHashtags,
  ruleTestimonialDisclaimer,
  ruleEducationalDisclaimer,
  rulePriceDisclaimer,
  ruleNoPublicCaseDisclosure,
  rulePaidAdIdentification,
  ruleVideoDisclaimer,
];

// ─────────────────────────────────────────────────────────────────────────────
// REGLAS TÉCNICAS POR PLATAFORMA
// ─────────────────────────────────────────────────────────────────────────────
const makePlatformTechRules = (platformId: string): Rule[] => {
  switch (platformId) {
    case 'instagram': return [
      {
        id: 'char_limit', category: 'technical',
        label: 'Límite de caracteres del caption (2,200)',
        check: ({ text }) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 2200) return { pass: true, message: `${n.toLocaleString('es')} / 2,200 caracteres` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 2,200 caracteres` };
        },
      },
      {
        id: 'hashtag_count', category: 'technical',
        label: 'Hashtags (máx. 30; óptimo 3-10)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera agregar 3-10 para mayor alcance' };
          if (count <= 10) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — Instagram puede reducir alcance con más de 10` };
          return { pass: false, message: `${count} hashtags — supera el límite de 30` };
        },
      },
      {
        id: 'no_links', category: 'technical',
        label: 'Sin URLs en caption (no son clickeables)',
        check: ({ text }) => {
          if (!/https?:\/\/[^\s]+|www\.[^\s]+/i.test(text)) return { pass: true, message: 'Sin links detectados' };
          return { pass: false, message: 'Instagram no hace clickeables los links en captions — usa "link en bio"' };
        },
      },
    ];
    case 'facebook': return [
      {
        id: 'char_best_practice', category: 'technical',
        label: 'Longitud óptima de engagement (< 500 caracteres)',
        check: ({ text }) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 500) return { pass: true, message: `${n} caracteres — rango óptimo de engagement` };
          if (n <= 63206) return { pass: true, warning: true, message: `${n.toLocaleString('es')} caracteres — dentro del límite técnico pero puede reducir el engagement` };
          return { pass: false, message: `Excede el límite técnico: ${n.toLocaleString('es')} / 63,206 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice', category: 'technical',
        label: 'Hashtags (1-3 recomendados en Facebook)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera 1-3 relevantes' };
          if (count <= 3) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima` };
          return { pass: true, warning: true, message: `${count} hashtags — Facebook rinde mejor con 1-3` };
        },
      },
    ];
    case 'tiktok': return [
      {
        id: 'char_limit', category: 'technical',
        label: 'Límite de caracteres de descripción (2,200)',
        check: ({ text }) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 2200) return { pass: true, message: `${n.toLocaleString('es')} / 2,200 caracteres` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 2,200 caracteres` };
        },
      },
      {
        id: 'hashtag_count', category: 'technical',
        label: 'Hashtags (5-10 recomendados; máx. 30)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — TikTok depende de hashtags para distribución' };
          if (count >= 5 && count <= 10) return { pass: true, message: `${count} hashtags — cantidad óptima para TikTok` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — rango óptimo es 5-10` };
          return { pass: false, message: `${count} hashtags — supera el límite de 30` };
        },
      },
      {
        id: 'no_links', category: 'technical',
        label: 'Sin URLs en descripción',
        check: ({ text }) => {
          if (!/https?:\/\/[^\s]+|www\.[^\s]+/i.test(text)) return { pass: true, message: 'Sin links detectados' };
          return { pass: false, message: 'TikTok no permite links clickeables en descripciones de video' };
        },
      },
    ];
    case 'linkedin': return [
      {
        id: 'char_limit', category: 'technical',
        label: 'Límite de caracteres (700 empresa / 3,000 personal)',
        check: ({ text }) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 700) return { pass: true, message: `${n} caracteres — dentro del límite de páginas empresa` };
          if (n <= 1300) return { pass: true, warning: true, message: `${n} caracteres — se truncará en páginas empresa (700 c); apto para perfil personal` };
          if (n <= 3000) return { pass: true, warning: true, message: `${n} caracteres — solo válido para perfil personal` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 3,000 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice', category: 'technical',
        label: 'Hashtags (3-5 recomendados en LinkedIn)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera 3-5 relevantes' };
          if (count >= 3 && count <= 5) return { pass: true, message: `${count} hashtags — cantidad óptima` };
          if (count <= 30) return { pass: true, warning: true, message: `${count} hashtags — LinkedIn sugiere 3-5` };
          return { pass: false, message: `${count} hashtags — excede el máximo recomendado` };
        },
      },
    ];
    case 'twitter': return [
      {
        id: 'char_limit', category: 'technical',
        label: 'Límite de caracteres (280; links = 23 c/u)',
        check: ({ text }) => {
          const normalized = text.replace(/https?:\/\/[^\s]+/g, 'x'.repeat(23));
          const n = normalized.length;
          if (text.length === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 280) return { pass: true, message: `~${n} / 280 caracteres (los links cuentan como 23 c/u)` };
          return { pass: false, message: `Excede el límite: ~${n} / 280 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice', category: 'technical',
        label: 'Hashtags (1-2 recomendados en X)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags' };
          if (count <= 2) return { pass: true, message: `${count} hashtag${count !== 1 ? 's' : ''} — cantidad óptima` };
          return { pass: true, warning: true, message: `${count} hashtags — X rinde mejor con 1-2` };
        },
      },
    ];
    case 'youtube': return [
      {
        id: 'char_limit', category: 'technical',
        label: 'Límite de descripción (5,000 caracteres)',
        check: ({ text }) => {
          const n = text.length;
          if (n === 0) return { pass: true, warning: true, message: 'Texto vacío' };
          if (n <= 5000) return { pass: true, message: `${n.toLocaleString('es')} / 5,000 caracteres${n <= 157 ? ' — los primeros 157 chars son la vista previa en búsqueda' : ''}` };
          return { pass: false, message: `Excede el límite: ${n.toLocaleString('es')} / 5,000 caracteres` };
        },
      },
      {
        id: 'hashtag_best_practice', category: 'technical',
        label: 'Hashtags en descripción (3-5 óptimo; máx. 15 visibles)',
        check: ({ text }) => {
          const count = (text.match(/#[\wÀ-ſ]+/g) || []).length;
          if (count === 0) return { pass: true, warning: true, message: 'Sin hashtags — considera 3-5 relevantes al tema del video' };
          if (count >= 3 && count <= 5) return { pass: true, message: `${count} hashtags — cantidad óptima` };
          if (count <= 15) return { pass: true, warning: true, message: `${count} hashtags — YouTube muestra solo los primeros 15` };
          return { pass: true, warning: true, message: `${count} hashtags — YouTube ignora los que superan 15; puede marcar como spam` };
        },
      },
    ];
    default: return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATAFORMAS
// ─────────────────────────────────────────────────────────────────────────────
const buildPlatforms = (): Platform[] => [
  { id: 'instagram', name: 'Instagram', color: '#E1306C', bgColor: '#FDF2F8',
    rules: [...makePlatformTechRules('instagram'), ...SHARED_LEGAL_RULES] },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', bgColor: '#EFF6FF',
    rules: [...makePlatformTechRules('facebook'), ...SHARED_LEGAL_RULES] },
  { id: 'tiktok', name: 'TikTok', color: '#010101', bgColor: '#F5F5F5',
    rules: [...makePlatformTechRules('tiktok'), ...SHARED_LEGAL_RULES] },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', bgColor: '#EFF6FF',
    rules: [...makePlatformTechRules('linkedin'), ...SHARED_LEGAL_RULES] },
  { id: 'twitter', name: 'X (Twitter)', color: '#000000', bgColor: '#F9FAFB',
    rules: [...makePlatformTechRules('twitter'), ...SHARED_LEGAL_RULES] },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', bgColor: '#FFF5F5',
    rules: [...makePlatformTechRules('youtube'), ...SHARED_LEGAL_RULES] },
];

const PLATFORMS = buildPlatforms();

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT TYPE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_TYPES: { id: ContentType; label: string; desc: string }[] = [
  { id: 'organic', label: 'Caption / Post orgánico', desc: 'Post regular en redes sociales' },
  { id: 'video', label: 'Video / Reel / Short', desc: 'Descripción de video o reel' },
  { id: 'paid', label: 'Anuncio pagado', desc: 'Meta Ads o Google Ads' },
  { id: 'blog', label: 'Blog / Sitio web', desc: 'Artículo o página web' },
  { id: 'print', label: 'Material impreso', desc: 'Flyer, tarjeta, brochure' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM ICON SVGs
// ─────────────────────────────────────────────────────────────────────────────
function PlatformIcon({ id, size = 16, color = 'currentColor' }: { id: string; size?: number; color?: string }) {
  const s = size;
  if (id === 'instagram') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill={color} />
    </svg>
  );
  if (id === 'facebook') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
  if (id === 'tiktok') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.27 8.27 0 0 0 4.84 1.55V7.03a4.85 4.85 0 0 1-1.07-.34z" />
    </svg>
  );
  if (id === 'linkedin') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
  if (id === 'twitter') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
  if (id === 'youtube') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.97A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white" />
    </svg>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
// ── Spell-check types ─────────────────────────────────────────────────────────
type SpellMatch = {
  message: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: { text: string; offset: number; length: number };
  rule: { id: string; description: string; category: { id: string; name: string } };
  original: string;
};
type SpellStatus = 'idle' | 'checking' | 'done' | 'error';

const SPELL_CATEGORY_LABEL: Record<string, string> = {
  TYPOS: 'Ortografía',
  GRAMMAR: 'Gramática',
  PUNCTUATION: 'Puntuación',
  CASING: 'Mayúsculas',
  CONFUSED_WORDS: 'Palabra incorrecta',
  STYLE: 'Estilo',
  TYPOGRAPHY: 'Tipografía',
};

export default function HerramientasPage() {
  // ── Text auditor state ────────────────────────────────────────────────────
  const [text, setText] = useState('');
  const [contentType, setContentType] = useState<ContentType>('organic');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'facebook', 'linkedin']);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());

  // ── Spell-check state ─────────────────────────────────────────────────────
  const [spellMatches, setSpellMatches] = useState<SpellMatch[]>([]);
  const [spellStatus, setSpellStatus] = useState<SpellStatus>('idle');

  // ── Image / OCR state ─────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const hashtagCount = (text.match(/#[\wÀ-ſ]+/g) || []).length;
  const mentionCount = (text.match(/@\w+/g) || []).length;
  const linkCount = (text.match(/https?:\/\/[^\s]+/gi) || []).length;

  const togglePlatform = (id: string) =>
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const toggleExpanded = (id: string) =>
    setExpandedPlatforms(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const analyze = () => {
    if (!text.trim() || selectedPlatforms.length === 0) return;
    const ctx: AuditCtx = { text, contentType };
    const newResults: AnalysisResult[] = PLATFORMS
      .filter(p => selectedPlatforms.includes(p.id))
      .map(platform => {
        const rules = platform.rules.map(rule => ({
          id: rule.id, label: rule.label, category: rule.category,
          result: rule.check(ctx),
        }));
        return {
          platformId: platform.id,
          rules,
          criticalCount: rules.filter(r => !r.result.pass && r.result.critical).length,
          failCount: rules.filter(r => !r.result.pass && !r.result.critical).length,
          warnCount: rules.filter(r => r.result.pass && r.result.warning).length,
          passCount: rules.filter(r => r.result.pass && !r.result.warning).length,
        };
      });
    setResults(newResults);
    setExpandedPlatforms(new Set(newResults.map(r => r.platformId)));
  };

  const reset = () => {
    setText('');
    setResults(null);
    setExpandedPlatforms(new Set());
    setSpellMatches([]);
    setSpellStatus('idle');
  };

  // ── Spell-check functions ─────────────────────────────────────────────────
  const checkSpelling = useCallback(async () => {
    if (!text.trim()) return;
    setSpellStatus('checking');
    setSpellMatches([]);
    try {
      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          text,
          language: 'es',      // Español principal; detecta inglés automáticamente
          enabledOnly: 'false',
          level: 'picky',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const matches: SpellMatch[] = (data.matches || []).map((m: SpellMatch) => ({
        ...m,
        original: text.substring(m.offset, m.offset + m.length),
      }));
      setSpellMatches(matches);
      setSpellStatus('done');
    } catch {
      setSpellStatus('error');
    }
  }, [text]);

  const applyCorrection = useCallback((match: SpellMatch, replacement: string) => {
    const newText =
      text.substring(0, match.offset) +
      replacement +
      text.substring(match.offset + match.length);
    setText(newText);
    // Adjust remaining offsets after this one
    const diff = replacement.length - match.length;
    setSpellMatches(prev =>
      prev
        .filter(m => m.offset !== match.offset)
        .map(m => m.offset > match.offset ? { ...m, offset: m.offset + diff } : m)
    );
  }, [text]);

  const dismissCorrection = useCallback((offset: number) => {
    setSpellMatches(prev => prev.filter(m => m.offset !== offset));
  }, []);

  const applyAllCorrections = useCallback(() => {
    // Apply from end to start to preserve earlier offsets
    const sorted = [...spellMatches]
      .filter(m => m.replacements.length > 0)
      .sort((a, b) => b.offset - a.offset);
    let newText = text;
    for (const m of sorted) {
      newText =
        newText.substring(0, m.offset) +
        m.replacements[0].value +
        newText.substring(m.offset + m.length);
    }
    setText(newText);
    setSpellMatches([]);
    setSpellStatus('idle');
  }, [text, spellMatches]);

  // ── OCR helpers ───────────────────────────────────────────────────────────
  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    setOcrText('');
    setOcrStatus('idle');
    setOcrProgress(0);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const runOcr = useCallback(async () => {
    if (!imagePreview) return;
    setOcrStatus('processing');
    setOcrProgress(0);
    setOcrText('');
    try {
      // Dynamic import avoids SSR issues with Tesseract's web workers
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['spa', 'eng'], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data: { text: extracted } } = await worker.recognize(imagePreview);
      await worker.terminate();
      const cleaned = extracted.trim();
      setOcrText(cleaned);
      setOcrStatus(cleaned ? 'done' : 'error');
    } catch {
      setOcrStatus('error');
    }
  }, [imagePreview]);

  const useOcrText = useCallback(() => {
    if (!ocrText) return;
    setText(ocrText);
    setInputMode('text');
  }, [ocrText]);

  const resetImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setOcrText('');
    setOcrStatus('idle');
    setOcrProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const charPct = Math.min((charCount / 2200) * 100, 100);
  const barColor = charCount > 2200 ? 'bg-red-500' : charCount > 1800 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f8fc]">
      <Header title="Herramientas" subtitle="Utilidades para el equipo de marketing" />

      <div className="px-10 py-8 space-y-8">

        {/* Tab bar */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C2054] text-white shadow-sm">
            <ClipboardCheck className="w-4 h-4" />
            Auditor de Contenido
          </button>
        </div>

        {/* Legal basis notice */}
        <div className="flex items-start gap-3 bg-[#0C2054]/5 border border-[#0C2054]/12 rounded-xl px-5 py-3.5">
          <ShieldAlert className="w-4 h-4 text-[#0C2054] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#4a4a6a] leading-relaxed">
            <span className="font-bold text-[#0C2054]">Base normativa:</span>{' '}
            Documento Maestro de Cumplimiento Ético v2.0 (Mayo 2026) · NJ RPC 7.1 / 7.2 / 7.3 / 7.4 / 1.18 · ABA Model Rule 7.1 · Opiniones ACPE · USPTO Trademark Serial 90227319
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* ── LEFT: input ───────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Content type selector */}
            <div className="bg-white rounded-2xl border border-[#e8e8f0] p-6 shadow-sm space-y-3">
              <h2 className="text-[15px] font-bold text-[#1a1a3e]">Tipo de contenido</h2>
              <div className="grid grid-cols-1 gap-2">
                {CONTENT_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setContentType(ct.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                      contentType === ct.id
                        ? 'bg-[#0C2054]/5 border-[#0C2054] text-[#0C2054]'
                        : 'border-[#e8e8f0] text-[#8888aa] hover:border-[#c0c0d8]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 transition-all ${
                      contentType === ct.id ? 'bg-[#0C2054] border-[#0C2054]' : 'border-[#c0c0d8]'
                    }`} />
                    <div>
                      <p className={`text-[13px] font-semibold leading-tight ${contentType === ct.id ? 'text-[#0C2054]' : 'text-[#4a4a6a]'}`}>{ct.label}</p>
                      <p className="text-[11px] text-[#9898bb] mt-0.5">{ct.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido — tabs Texto / Imagen */}
            <div className="bg-white rounded-2xl border border-[#e8e8f0] shadow-sm overflow-hidden">
              {/* Mode toggle header */}
              <div className="flex items-center gap-0 border-b border-[#e8e8f0]">
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex items-center gap-2 flex-1 justify-center px-4 py-3.5 text-[13px] font-semibold transition-all border-b-2 ${
                    inputMode === 'text'
                      ? 'text-[#0C2054] border-[#0C2054] bg-white'
                      : 'text-[#9898bb] border-transparent hover:text-[#4a4a6a] bg-[#f7f8fc]'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Pegar texto
                </button>
                <button
                  onClick={() => setInputMode('image')}
                  className={`flex items-center gap-2 flex-1 justify-center px-4 py-3.5 text-[13px] font-semibold transition-all border-b-2 ${
                    inputMode === 'image'
                      ? 'text-[#0C2054] border-[#0C2054] bg-white'
                      : 'text-[#9898bb] border-transparent hover:text-[#4a4a6a] bg-[#f7f8fc]'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> Analizar imagen
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* ── TEXT MODE ── */}
                {inputMode === 'text' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#4a4a6a]">Contenido a auditar</p>
                      <div className="flex items-center gap-3 text-[12px] text-[#9898bb]">
                        <span><span className={charCount > 0 ? 'font-bold text-[#1a1a3e]' : ''}>{charCount.toLocaleString('es')}</span> chars</span>
                        {hashtagCount > 0 && <span className="font-semibold text-[#F79C31]">{hashtagCount} #</span>}
                        {mentionCount > 0 && <span className="font-semibold text-[#0C2054]">{mentionCount} @</span>}
                        {linkCount > 0 && <span className="font-semibold text-blue-500">{linkCount} link{linkCount !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <textarea
                      value={text}
                      onChange={e => {
                        setText(e.target.value);
                        // Invalidate spell results when user edits manually
                        if (spellMatches.length > 0) {
                          setSpellMatches([]);
                          setSpellStatus('idle');
                        }
                      }}
                      placeholder="Pega aquí el caption, descripción, guión o texto que quieres auditar…"
                      className="w-full h-48 resize-none text-[14px] text-[#1a1a3e] placeholder:text-[#c0c0d8] border border-[#e8e8f0] rounded-xl p-4 focus:outline-none focus:border-[#0C2054] focus:ring-2 focus:ring-[#0C2054]/8 transition-all leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <button onClick={reset} className="flex items-center gap-1.5 text-[12px] text-[#9898bb] hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Limpiar
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#c0c0d8]">Límite IG</span>
                        <div className="w-24 h-1.5 bg-[#e8e8f0] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${charPct}%` }} />
                        </div>
                        <span className="text-[11px] text-[#c0c0d8]">2,200</span>
                      </div>
                    </div>

                    {/* ── Spell-check button ── */}
                    <button
                      onClick={checkSpelling}
                      disabled={!text.trim() || spellStatus === 'checking'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#e8e8f0] text-[13px] font-semibold text-[#4a4a6a] hover:border-[#0C2054]/30 hover:text-[#0C2054] hover:bg-[#f0f2ff] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {spellStatus === 'checking' ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                          </svg>
                          Revisando ortografía…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
                            <circle cx="18" cy="18" r="3"/><path d="M18 16v2l1 1"/>
                          </svg>
                          {spellStatus === 'done'
                            ? `Revisar de nuevo${spellMatches.length > 0 ? ` (${spellMatches.length} encontrado${spellMatches.length !== 1 ? 's' : ''})` : ''}`
                            : 'Revisar ortografía y gramática'}
                        </>
                      )}
                    </button>

                    {/* ── Spell error: API fail ── */}
                    {spellStatus === 'error' && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] text-red-600">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        No se pudo conectar con LanguageTool. Verifica tu conexión e intenta de nuevo.
                      </div>
                    )}

                    {/* ── Spell results: no errors ── */}
                    {spellStatus === 'done' && spellMatches.length === 0 && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[12px] text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        Sin errores ortográficos ni gramaticales detectados ✓
                      </div>
                    )}

                    {/* ── Spell results: corrections list ── */}
                    {spellStatus === 'done' && spellMatches.length > 0 && (
                      <div className="border border-[#e8e8f0] rounded-xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-[#f7f8fc] border-b border-[#e8e8f0]">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold text-[#1a1a3e]">
                              {spellMatches.length} corrección{spellMatches.length !== 1 ? 'es' : ''} sugerida{spellMatches.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[11px] text-[#9898bb]">· LanguageTool</span>
                          </div>
                          {spellMatches.some(m => m.replacements.length > 0) && (
                            <button
                              onClick={applyAllCorrections}
                              className="text-[12px] font-semibold text-[#0C2054] hover:underline"
                            >
                              Aplicar todas
                            </button>
                          )}
                        </div>

                        {/* Corrections */}
                        <div className="divide-y divide-[#f0f0f8] max-h-72 overflow-y-auto">
                          {spellMatches.map(match => {
                            const catLabel = SPELL_CATEGORY_LABEL[match.rule.category.id] ?? 'Sugerencia';
                            const isTypo = match.rule.category.id === 'TYPOS';
                            // Highlight the error inside the context string
                            const ctxBefore = match.context.text.substring(0, match.context.offset);
                            const ctxError  = match.context.text.substring(match.context.offset, match.context.offset + match.context.length);
                            const ctxAfter  = match.context.text.substring(match.context.offset + match.context.length);

                            return (
                              <div key={match.offset} className="px-4 py-3 space-y-2">
                                {/* Category + message */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      isTypo ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {catLabel}
                                    </span>
                                    <span className="text-[12px] text-[#4a4a6a]">{match.message}</span>
                                  </div>
                                  <button
                                    onClick={() => dismissCorrection(match.offset)}
                                    className="text-[#c0c0d8] hover:text-[#8888aa] flex-shrink-0 text-[14px] leading-none"
                                    title="Ignorar"
                                  >
                                    ×
                                  </button>
                                </div>

                                {/* Context with error underlined */}
                                <p className="text-[12px] text-[#8888aa] font-mono">
                                  …{ctxBefore}
                                  <span className={`font-semibold underline decoration-wavy ${isTypo ? 'text-red-600 decoration-red-500' : 'text-amber-600 decoration-amber-500'}`}>
                                    {ctxError}
                                  </span>
                                  {ctxAfter}…
                                </p>

                                {/* Suggestions */}
                                {match.replacements.length > 0 && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-[#9898bb]">Sugerencias:</span>
                                    {match.replacements.slice(0, 4).map(r => (
                                      <button
                                        key={r.value}
                                        onClick={() => applyCorrection(match, r.value)}
                                        className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                                      >
                                        {r.value}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── IMAGE MODE ── */}
                {inputMode === 'image' && (
                  <>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Drop zone / preview */}
                    {!imagePreview ? (
                      <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-[#0C2054] bg-[#0C2054]/4'
                            : 'border-[#e8e8f0] hover:border-[#0C2054]/40 hover:bg-[#f7f8fc]'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-[#f0f2ff] flex items-center justify-center mb-4">
                          <Upload className="w-6 h-6 text-[#0C2054]" />
                        </div>
                        <p className="text-[14px] font-semibold text-[#1a1a3e] mb-1">
                          {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic'}
                        </p>
                        <p className="text-[12px] text-[#9898bb] text-center">
                          PNG, JPG, WEBP, GIF · Flyers, graphics de Canva,<br />capturas de anuncios, posts con texto
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Image preview + change button */}
                        <div className="relative rounded-xl overflow-hidden border border-[#e8e8f0] bg-[#f7f8fc]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Imagen a auditar"
                            className="w-full max-h-52 object-contain"
                          />
                          <button
                            onClick={resetImage}
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 shadow flex items-center justify-center text-[#9898bb] hover:text-red-500 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* OCR action */}
                        {ocrStatus === 'idle' && (
                          <button
                            onClick={runOcr}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0C2054] text-white text-[13px] font-bold shadow-sm hover:bg-[#0f2860] transition-all"
                          >
                            <ScanText className="w-4 h-4" />
                            Extraer texto de la imagen
                          </button>
                        )}

                        {/* Progress */}
                        {ocrStatus === 'processing' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="text-[#4a4a6a] font-medium">Extrayendo texto (ES + EN)…</span>
                              <span className="font-bold text-[#0C2054]">{ocrProgress}%</span>
                            </div>
                            <div className="h-2 bg-[#e8e8f0] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0C2054] rounded-full transition-all duration-200"
                                style={{ width: `${ocrProgress}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-[#9898bb]">Procesando en el navegador — sin enviar datos externos</p>
                          </div>
                        )}

                        {/* OCR error */}
                        {ocrStatus === 'error' && (
                          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[13px] font-semibold text-amber-700">No se detectó texto legible</p>
                              <p className="text-[12px] text-amber-600 mt-0.5">Verifica que la imagen tenga texto visible y nítido. Las imágenes con texto muy pequeño o estilizado pueden tener baja precisión.</p>
                              <button onClick={runOcr} className="mt-2 text-[12px] font-semibold text-amber-700 underline">Reintentar</button>
                            </div>
                          </div>
                        )}

                        {/* Extracted text */}
                        {ocrStatus === 'done' && ocrText && (
                          <div className="space-y-3">
                            <div className="bg-[#f7f8fc] rounded-xl border border-[#e8e8f0] p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-[#9898bb] uppercase tracking-wider">Texto extraído</p>
                                <span className="text-[11px] text-[#c0c0d8]">{ocrText.length} chars</span>
                              </div>
                              <p className="text-[13px] text-[#4a4a6a] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                                {ocrText}
                              </p>
                            </div>
                            <button
                              onClick={useOcrText}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0C2054] text-white text-[13px] font-bold shadow-sm hover:bg-[#0f2860] transition-all"
                            >
                              <ArrowRight className="w-4 h-4" />
                              Usar texto extraído para auditar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-[#c0c0d8] text-center">
                      OCR local con Tesseract.js · Español + Inglés · Sin envío de datos a servidores externos
                    </p>
                  </>
                )}
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
                        active ? 'text-white border-transparent shadow-sm' : 'bg-white border-[#e8e8f0] text-[#8888aa] hover:border-[#c0c0d8]'
                      }`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : {}}
                    >
                      <PlatformIcon id={p.id} size={14} color={active ? 'white' : p.color} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
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

          {/* ── RIGHT: results ────────────────────────────────────────────── */}
          <div className="space-y-4">
            {results === null ? (
              <div className="bg-white rounded-2xl border border-[#e8e8f0] p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[420px]">
                <div className="w-16 h-16 rounded-2xl bg-[#f0f2ff] flex items-center justify-center mb-5">
                  <ClipboardCheck className="w-8 h-8 text-[#0C2054]" />
                </div>
                <p className="text-[16px] font-bold text-[#1a1a3e] mb-2">Listo para auditar</p>
                <p className="text-[13px] text-[#9898bb] max-w-xs leading-relaxed">
                  Selecciona el tipo de contenido, pega el texto, elige las redes y haz clic en{' '}
                  <span className="font-semibold text-[#0C2054]">Analizar Contenido</span>.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 text-left w-full max-w-xs">
                  {[
                    ['14', 'reglas de cumplimiento legal'],
                    ['6', 'plataformas'],
                    ['5', 'tipos de contenido'],
                    ['NJ RPC', '7.1 · 7.2 · 7.3 · 7.4 · 1.18'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="bg-[#f7f8fc] rounded-xl px-3 py-2.5">
                      <p className="text-[15px] font-bold text-[#0C2054]">{val}</p>
                      <p className="text-[11px] text-[#9898bb] leading-tight">{lbl}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Global summary */}
                {(() => {
                  const totalCritical = results.reduce((s, r) => s + r.criticalCount, 0);
                  const totalFail = results.reduce((s, r) => s + r.failCount, 0);
                  const totalWarn = results.reduce((s, r) => s + r.warnCount, 0);
                  return (
                    <div className={`flex items-center gap-2 flex-wrap px-4 py-3 rounded-xl border ${
                      totalCritical > 0 ? 'bg-red-50 border-red-200' : totalFail > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      {totalCritical > 0 && (
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-red-700">
                          <ShieldAlert className="w-4 h-4" /> {totalCritical} CRÍTICO{totalCritical !== 1 ? 'S' : ''}
                        </span>
                      )}
                      {totalFail > 0 && (
                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-orange-700">
                          <XCircle className="w-3.5 h-3.5" /> {totalFail} error{totalFail !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {totalWarn > 0 && (
                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" /> {totalWarn} advertencia{totalWarn !== 1 ? 's' : ''}
                        </span>
                      )}
                      {totalCritical === 0 && totalFail === 0 && totalWarn === 0 && (
                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" /> Contenido aprobado — sin problemas detectados
                        </span>
                      )}
                      {totalCritical === 0 && totalFail === 0 && totalWarn > 0 && (
                        <span className="text-[12px] text-amber-700 font-medium">— revisar advertencias antes de publicar</span>
                      )}
                      <span className="ml-auto text-[11px] text-[#9898bb]">{results.length} red{results.length !== 1 ? 'es' : ''}</span>
                    </div>
                  );
                })()}

                {/* Per-platform cards */}
                {results.map(result => {
                  const platform = PLATFORMS.find(p => p.id === result.platformId)!;
                  const isExpanded = expandedPlatforms.has(result.platformId);
                  const techRules = result.rules.filter(r => r.category === 'technical');
                  const legalRules = result.rules.filter(r => r.category === 'legal');

                  return (
                    <div key={result.platformId} className="bg-white rounded-2xl border border-[#e8e8f0] shadow-sm overflow-hidden">
                      {/* Header */}
                      <button
                        onClick={() => toggleExpanded(result.platformId)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f7f8fc] transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: platform.bgColor }}>
                          <PlatformIcon id={platform.id} size={18} color={platform.color} />
                        </div>
                        <span className="font-bold text-[14px] text-[#1a1a3e] flex-1">{platform.name}</span>
                        <div className="flex items-center gap-1.5">
                          {result.criticalCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <ShieldAlert className="w-3 h-3" /> {result.criticalCount} CRÍT.
                            </span>
                          )}
                          {result.failCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <XCircle className="w-3 h-3" /> {result.failCount}
                            </span>
                          )}
                          {result.warnCount > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> {result.warnCount}
                            </span>
                          )}
                          {result.criticalCount === 0 && result.failCount === 0 && result.warnCount === 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#c0c0d8] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#c0c0d8] flex-shrink-0" />}
                      </button>

                      {/* Expanded rules */}
                      {isExpanded && (
                        <div className="border-t border-[#f0f0f8]">
                          {/* Technical rules */}
                          {techRules.length > 0 && (
                            <>
                              <div className="px-5 py-2 bg-[#f7f8fc]">
                                <p className="text-[10px] font-bold text-[#9898bb] uppercase tracking-wider">Reglas técnicas de plataforma</p>
                              </div>
                              <div className="divide-y divide-[#f7f7fc]">
                                {techRules.map(rule => (
                                  <RuleRow key={rule.id} rule={rule} />
                                ))}
                              </div>
                            </>
                          )}
                          {/* Legal compliance rules */}
                          <div className="px-5 py-2 bg-[#fdf5ff]">
                            <p className="text-[10px] font-bold text-[#7c3aed]/60 uppercase tracking-wider">Cumplimiento ético y legal</p>
                          </div>
                          <div className="divide-y divide-[#f7f7fc]">
                            {legalRules.map(rule => (
                              <RuleRow key={rule.id} rule={rule} />
                            ))}
                          </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// RULE ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function RuleRow({ rule }: { rule: { id: string; label: string; result: RuleResult } }) {
  const { result } = rule;
  const isCritical = !result.pass && result.critical;
  const isFail = !result.pass && !result.critical;
  const isWarn = result.pass && result.warning;
  const isPass = result.pass && !result.warning;

  return (
    <div className={`flex items-start gap-3 px-5 py-3.5 ${isCritical ? 'bg-red-50/60' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {isCritical ? (
          <ShieldAlert className="w-4 h-4 text-red-600" />
        ) : isFail ? (
          <XCircle className="w-4 h-4 text-orange-500" />
        ) : isWarn ? (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[12px] font-semibold leading-snug ${isCritical ? 'text-red-700' : 'text-[#4a4a6a]'}`}>
          {rule.label}
        </p>
        <p className={`text-[12px] mt-0.5 leading-snug ${
          isCritical ? 'text-red-700 font-medium' :
          isFail ? 'text-orange-600' :
          isWarn ? 'text-amber-600' : 'text-[#9898bb]'
        }`}>
          {result.message}
        </p>
      </div>
    </div>
  );
}
