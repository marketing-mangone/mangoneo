import type { GA4Summary, YouTubeWeeklyData, MetaSummary, DashboardSummary } from './api';

type YTTotals = DashboardSummary['youtube'];

// ── Formateo ──────────────────────────────────────────────────────────────────

function fN(v: number | null | undefined): string {
  if (v == null) return '—';
  const n = Math.abs(v);
  if (n >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fC(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${((v as number) * 100).toFixed(1)}%`;
}

function fSec(v: number | null | undefined): string {
  if (v == null) return '—';
  const s = Math.round(v as number);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function fWT(v: number | null | undefined): string {
  if (v == null) return '—';
  const m = v as number;
  return m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)} min`;
}

function fChg(v: number | null | undefined): string {
  if (v == null) return '—';
  const n = v as number;
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ── Generador ─────────────────────────────────────────────────────────────────

export async function generateMetricsPDF({
  weekStr, dateRange, ga4, yt, ytTotals, meta,
}: {
  weekStr:   string;
  dateRange: string;
  ga4:      GA4Summary | null;
  yt:       YouTubeWeeklyData | null;
  ytTotals: YTTotals | null;
  meta:     MetaSummary | null;
}): Promise<Blob> {
  const { jsPDF }  = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  let y = 0;

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(12, 32, 84);
  doc.rect(0, 0, W, 38, 'F');

  doc.setFillColor(247, 156, 49);
  doc.rect(0, 38, W, 2.5, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 165, 200);
  doc.text('MANGONE LAW FIRM  ·  DEPARTAMENTO DE MARKETING', M, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Reporte Semanal de Métricas', M, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(140, 165, 200);
  doc.text(`${dateRange}  ·  ${weekStr}`, M, 32);

  // ── Totales destacados ────────────────────────────────────────────────────
  const fbFans      = meta?.totals?.['meta-fb-fans']?.value ?? null;
  const igFollowers = meta?.totals?.['meta-ig-followers']?.value ?? null;
  const ytSubs      = ytTotals?.['youtube-subscribers-total']?.value ?? null;
  const ga4Sessions = ga4?.metrics['ga4-sessions']?.value ?? null;

  y = 48;
  const cardData: { label: string; value: string; rgb: [number, number, number] }[] = [
    { label: 'Fans Facebook',    value: fN(fbFans),      rgb: [12,  32,  84]  },
    { label: 'Seguidores IG',    value: fN(igFollowers), rgb: [157, 23,  77]  },
    { label: 'Suscriptores YT',  value: fN(ytSubs),      rgb: [185, 28,  28]  },
    { label: 'Sesiones GA4',     value: fN(ga4Sessions), rgb: [29,  78,  216] },
  ];
  const cW = (W - 2 * M - 9) / 4;
  cardData.forEach((c, i) => {
    const cx = M + i * (cW + 3);
    doc.setFillColor(...c.rgb);
    doc.roundedRect(cx, y, cW, 20, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 190, 225);
    doc.text(c.label.toUpperCase(), cx + 3, y + 7);
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(c.value, cx + 3, y + 17);
  });
  y += 28;

  // ── Helpers ───────────────────────────────────────────────────────────────
  type RGB = [number, number, number];

  function addSection(title: string, rgb: RGB, rows: string[][]) {
    if (y > 238) { doc.addPage(); y = 18; }

    doc.setFillColor(...rgb);
    doc.circle(M + 2.5, y + 3.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(title, M + 8, y + 5.5);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.25);
    doc.line(M + 8 + doc.getTextWidth(title) + 3, y + 2.5, W - M, y + 2.5);
    y += 12;

    autoTable(doc, {
      startY:  y,
      head:    [['Métrica', 'Valor actual', 'Cambio', 'Sem. anterior']],
      body:    rows,
      margin:  { left: M, right: M },
      styles:  {
        fontSize:    8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor:   [55, 65, 81],
        lineColor:   [229, 231, 235],
        lineWidth:   0.2,
      },
      headStyles: {
        fillColor:  rgb,
        textColor:  [255, 255, 255],
        fontStyle:  'bold',
        fontSize:   8,
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52 },
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        3: { halign: 'right', textColor: [156, 163, 175], cellWidth: 28 },
      },
      didParseCell(data) {
        if (data.section !== 'body' || data.column.index !== 2) return;
        const v = data.cell.raw as string;
        if (v && v !== '—') {
          data.cell.styles.textColor = v.startsWith('+') ? [5, 150, 105] : [220, 38, 38];
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Secciones ─────────────────────────────────────────────────────────────

  addSection('Google Analytics 4 — últimos 28 días', [29, 78, 216], [
    ['Sesiones',            fN(ga4?.metrics['ga4-sessions']?.value),              fChg(ga4?.metrics['ga4-sessions']?.change_pct),              fN(ga4?.metrics['ga4-sessions']?.prev_value)],
    ['Usuarios activos',    fN(ga4?.metrics['ga4-active-users']?.value),          fChg(ga4?.metrics['ga4-active-users']?.change_pct),          fN(ga4?.metrics['ga4-active-users']?.prev_value)],
    ['Usuarios nuevos',     fN(ga4?.metrics['ga4-new-users']?.value),             fChg(ga4?.metrics['ga4-new-users']?.change_pct),             fN(ga4?.metrics['ga4-new-users']?.prev_value)],
    ['Vistas de página',    fN(ga4?.metrics['ga4-pageviews']?.value),             fChg(ga4?.metrics['ga4-pageviews']?.change_pct),             fN(ga4?.metrics['ga4-pageviews']?.prev_value)],
    ['Tasa de interacción', fPct(ga4?.metrics['ga4-engagement-rate']?.value),     fChg(ga4?.metrics['ga4-engagement-rate']?.change_pct),     fPct(ga4?.metrics['ga4-engagement-rate']?.prev_value)],
    ['Duración media',      fSec(ga4?.metrics['ga4-avg-session-duration']?.value), fChg(ga4?.metrics['ga4-avg-session-duration']?.change_pct), fSec(ga4?.metrics['ga4-avg-session-duration']?.prev_value)],
    ['Conversiones',        fN(ga4?.metrics['ga4-conversions']?.value),           fChg(ga4?.metrics['ga4-conversions']?.change_pct),           fN(ga4?.metrics['ga4-conversions']?.prev_value)],
  ]);

  addSection('YouTube — semana seleccionada', [220, 38, 38], [
    ['Reproducciones',      fN(yt?.metrics['youtube-views']?.value),               fChg(yt?.metrics['youtube-views']?.change_pct),               fN(yt?.metrics['youtube-views']?.prev_value)],
    ['Tiempo reproducción', fWT(yt?.metrics['youtube-watch-time']?.value),         fChg(yt?.metrics['youtube-watch-time']?.change_pct),         fWT(yt?.metrics['youtube-watch-time']?.prev_value)],
    ['Suscriptores netos',  fN(yt?.metrics['youtube-net-subscribers']?.value),     fChg(yt?.metrics['youtube-net-subscribers']?.change_pct),     fN(yt?.metrics['youtube-net-subscribers']?.prev_value)],
    ['Me gusta',            fN(yt?.metrics['youtube-likes']?.value),              fChg(yt?.metrics['youtube-likes']?.change_pct),              fN(yt?.metrics['youtube-likes']?.prev_value)],
    ['Comentarios',         fN(yt?.metrics['youtube-comments']?.value),           fChg(yt?.metrics['youtube-comments']?.change_pct),           fN(yt?.metrics['youtube-comments']?.prev_value)],
    ['Compartidos',         fN(yt?.metrics['youtube-shares']?.value),             fChg(yt?.metrics['youtube-shares']?.change_pct),             fN(yt?.metrics['youtube-shares']?.prev_value)],
  ]);

  addSection('Facebook — orgánico', [24, 119, 242], [
    ['Impresiones', fN(meta?.metrics['meta-fb-impressions']?.value), fChg(meta?.metrics['meta-fb-impressions']?.change_pct), fN(meta?.metrics['meta-fb-impressions']?.prev_value)],
    ['Alcance',     fN(meta?.metrics['meta-fb-reach']?.value),      fChg(meta?.metrics['meta-fb-reach']?.change_pct),      fN(meta?.metrics['meta-fb-reach']?.prev_value)],
    ['Engagement',  fN(meta?.metrics['meta-fb-engagement']?.value), fChg(meta?.metrics['meta-fb-engagement']?.change_pct), fN(meta?.metrics['meta-fb-engagement']?.prev_value)],
  ]);

  addSection('Instagram — orgánico', [219, 48, 108], [
    ['Impresiones',       fN(meta?.metrics['meta-ig-impressions']?.value),   fChg(meta?.metrics['meta-ig-impressions']?.change_pct),   fN(meta?.metrics['meta-ig-impressions']?.prev_value)],
    ['Alcance',           fN(meta?.metrics['meta-ig-reach']?.value),         fChg(meta?.metrics['meta-ig-reach']?.change_pct),         fN(meta?.metrics['meta-ig-reach']?.prev_value)],
    ['Visitas al perfil', fN(meta?.metrics['meta-ig-profile-views']?.value), fChg(meta?.metrics['meta-ig-profile-views']?.change_pct), fN(meta?.metrics['meta-ig-profile-views']?.prev_value)],
  ]);

  addSection('Meta Ads — pagado', [124, 58, 237], [
    ['Inversión',   fC(meta?.metrics['meta-ads-spend']?.value),       fChg(meta?.metrics['meta-ads-spend']?.change_pct),       fC(meta?.metrics['meta-ads-spend']?.prev_value)],
    ['Impresiones', fN(meta?.metrics['meta-ads-impressions']?.value), fChg(meta?.metrics['meta-ads-impressions']?.change_pct), fN(meta?.metrics['meta-ads-impressions']?.prev_value)],
    ['Alcance',     fN(meta?.metrics['meta-ads-reach']?.value),       fChg(meta?.metrics['meta-ads-reach']?.change_pct),       fN(meta?.metrics['meta-ads-reach']?.prev_value)],
    ['Clics',       fN(meta?.metrics['meta-ads-clicks']?.value),      fChg(meta?.metrics['meta-ads-clicks']?.change_pct),      fN(meta?.metrics['meta-ads-clicks']?.prev_value)],
  ]);

  // ── Footer en todas las páginas ───────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('Mangone Marketing Hub  ·  Confidencial', M, 291);
    doc.text(`${p} / ${pages}`, W - M - 6, 291);
  }

  return doc.output('blob');
}
