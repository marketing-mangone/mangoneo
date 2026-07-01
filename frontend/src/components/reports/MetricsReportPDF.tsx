import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { GA4Summary, YouTubeWeeklyData, MetaSummary, DashboardSummary } from '@/lib/api';

type YTTotals = DashboardSummary['youtube'];

export interface MetricsReportProps {
  weekStr: string;
  dateRange: string;
  ga4: GA4Summary | null;
  yt: YouTubeWeeklyData | null;
  ytTotals: YTTotals | null;
  meta: MetaSummary | null;
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  navy:     '#0C2054',
  gold:     '#F79C31',
  white:    '#FFFFFF',
  bgCard:   '#F8FAFF',
  border:   '#E5E7EB',
  text:     '#111827',
  muted:    '#6B7280',
  green:    '#059669',
  greenBg:  '#ECFDF5',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
};

// ── Formato ───────────────────────────────────────────────────────────────────
function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtEngagementRate(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSec(v: number | null | undefined): string {
  if (v == null) return '—';
  const s = Math.round(v);
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function fmtWatchTime(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 60) return `${(v / 60).toFixed(1)}h`;
  return `${Math.round(v)} min`;
}

function fmtSubs(v: number | null | undefined): string {
  if (v == null) return '—';
  const n = Math.round(v);
  return n >= 0 ? `+${fmtNum(n)}` : fmtNum(n);
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    padding: 0,
  },

  // Header
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logoMark: {
    width: 28,
    height: 28,
    backgroundColor: C.gold,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoMarkText: {
    color: C.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  headerFirm: {
    color: C.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  headerDep: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 8,
    marginTop: 1,
  },
  headerTitle: {
    color: C.white,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 8.5,
  },
  goldStripe: {
    height: 3,
    backgroundColor: C.gold,
  },

  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // Highlights (totales)
  highlightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  hlCard: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
  },
  hlCardNavy:   { backgroundColor: C.navy },
  hlCardRed:    { backgroundColor: '#B91C1C' },
  hlCardBlue:   { backgroundColor: '#1D4ED8' },
  hlCardGold:   { backgroundColor: '#B45309' },
  hlLabel: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  hlValue: {
    color: C.white,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  hlSub: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 7,
    marginTop: 3,
  },

  // Section title
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 18,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Metric cards
  row: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 7,
  },
  card: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    minHeight: 64,
  },
  cardLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 4,
  },
  cardValueSm: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 3,
  },
  badgeGreen: { backgroundColor: C.greenBg },
  badgeRed:   { backgroundColor: C.redBg },
  badgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  badgeTextGreen: { color: C.green },
  badgeTextRed:   { color: C.red },
  cardPrev: {
    fontSize: 6.5,
    color: C.muted,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 7,
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
});

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionDot, { backgroundColor: color }]} />
      <Text style={s.sectionTitle}>{label}</Text>
    </View>
  );
}

function MetricCard({
  label, value, pct, prev, goodUp = true, small = false,
}: {
  label: string;
  value: string;
  pct: number | null | undefined;
  prev?: string;
  goodUp?: boolean;
  small?: boolean;
}) {
  const hasChange = pct != null;
  const isPos     = hasChange && (goodUp ? pct >= 0 : pct <= 0);

  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={small ? s.cardValueSm : s.cardValue}>{value}</Text>
      {hasChange && (
        <View style={[s.badge, isPos ? s.badgeGreen : s.badgeRed]}>
          <Text style={[s.badgeText, isPos ? s.badgeTextGreen : s.badgeTextRed]}>
            {isPos ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
          </Text>
        </View>
      )}
      {prev && <Text style={s.cardPrev}>Ant: {prev}</Text>}
    </View>
  );
}

function CardsRow({ items }: { items: React.ReactElement[] }) {
  const rows: React.ReactElement[][] = [];
  for (let i = 0; i < items.length; i += 4) rows.push(items.slice(i, i + 4));
  return (
    <>
      {rows.map((row, ri) => (
        <View key={ri} style={s.row}>
          {row}
          {/* Relleno para alinear fila incompleta */}
          {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, j) => (
            <View key={`fill-${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </>
  );
}

// ── Documento principal ───────────────────────────────────────────────────────

export function MetricsReportDocument({
  weekStr, dateRange, ga4, yt, ytTotals, meta,
}: MetricsReportProps) {
  const fbFans     = meta?.totals?.['meta-fb-fans']?.value ?? null;
  const igFollowers = meta?.totals?.['meta-ig-followers']?.value ?? null;
  const ytTotal    = ytTotals?.['youtube-subscribers-total']?.value ?? null;
  const ga4Sessions = ga4?.metrics['ga4-sessions']?.value ?? null;

  const ga4Cards = [
    { label: 'Sesiones',           value: fmtNum(ga4?.metrics['ga4-sessions']?.value),                          pct: ga4?.metrics['ga4-sessions']?.change_pct,             prev: fmtNum(ga4?.metrics['ga4-sessions']?.prev_value) },
    { label: 'Usuarios activos',   value: fmtNum(ga4?.metrics['ga4-active-users']?.value),                      pct: ga4?.metrics['ga4-active-users']?.change_pct,         prev: fmtNum(ga4?.metrics['ga4-active-users']?.prev_value) },
    { label: 'Usuarios nuevos',    value: fmtNum(ga4?.metrics['ga4-new-users']?.value),                         pct: ga4?.metrics['ga4-new-users']?.change_pct,            prev: fmtNum(ga4?.metrics['ga4-new-users']?.prev_value) },
    { label: 'Vistas de página',   value: fmtNum(ga4?.metrics['ga4-pageviews']?.value),                         pct: ga4?.metrics['ga4-pageviews']?.change_pct,            prev: fmtNum(ga4?.metrics['ga4-pageviews']?.prev_value) },
    { label: 'Tasa interacción',   value: fmtEngagementRate(ga4?.metrics['ga4-engagement-rate']?.value),        pct: ga4?.metrics['ga4-engagement-rate']?.change_pct,      prev: fmtEngagementRate(ga4?.metrics['ga4-engagement-rate']?.prev_value) },
    { label: 'Duración media',     value: fmtSec(ga4?.metrics['ga4-avg-session-duration']?.value),              pct: ga4?.metrics['ga4-avg-session-duration']?.change_pct, prev: fmtSec(ga4?.metrics['ga4-avg-session-duration']?.prev_value) },
    { label: 'Conversiones',       value: fmtNum(ga4?.metrics['ga4-conversions']?.value),                       pct: ga4?.metrics['ga4-conversions']?.change_pct,          prev: fmtNum(ga4?.metrics['ga4-conversions']?.prev_value) },
  ];

  const ytCards = [
    { label: 'Reproducciones',         value: fmtNum(yt?.metrics['youtube-views']?.value),          pct: yt?.metrics['youtube-views']?.change_pct,          prev: fmtNum(yt?.metrics['youtube-views']?.prev_value) },
    { label: 'Tiempo reproducción',    value: fmtWatchTime(yt?.metrics['youtube-watch-time']?.value), pct: yt?.metrics['youtube-watch-time']?.change_pct,    prev: fmtWatchTime(yt?.metrics['youtube-watch-time']?.prev_value) },
    { label: 'Suscriptores netos',     value: fmtSubs(yt?.metrics['youtube-net-subscribers']?.value), pct: yt?.metrics['youtube-net-subscribers']?.change_pct, prev: fmtSubs(yt?.metrics['youtube-net-subscribers']?.prev_value) },
    { label: 'Me gusta',               value: fmtNum(yt?.metrics['youtube-likes']?.value),          pct: yt?.metrics['youtube-likes']?.change_pct,          prev: fmtNum(yt?.metrics['youtube-likes']?.prev_value) },
    { label: 'Comentarios',            value: fmtNum(yt?.metrics['youtube-comments']?.value),       pct: yt?.metrics['youtube-comments']?.change_pct,       prev: fmtNum(yt?.metrics['youtube-comments']?.prev_value) },
    { label: 'Compartidos',            value: fmtNum(yt?.metrics['youtube-shares']?.value),         pct: yt?.metrics['youtube-shares']?.change_pct,         prev: fmtNum(yt?.metrics['youtube-shares']?.prev_value) },
  ];

  const fbCards = [
    { label: 'Impresiones',  value: fmtNum(meta?.metrics['meta-fb-impressions']?.value), pct: meta?.metrics['meta-fb-impressions']?.change_pct, prev: fmtNum(meta?.metrics['meta-fb-impressions']?.prev_value) },
    { label: 'Alcance',      value: fmtNum(meta?.metrics['meta-fb-reach']?.value),       pct: meta?.metrics['meta-fb-reach']?.change_pct,       prev: fmtNum(meta?.metrics['meta-fb-reach']?.prev_value) },
    { label: 'Engagement',   value: fmtNum(meta?.metrics['meta-fb-engagement']?.value),  pct: meta?.metrics['meta-fb-engagement']?.change_pct,  prev: fmtNum(meta?.metrics['meta-fb-engagement']?.prev_value) },
  ];

  const igCards = [
    { label: 'Impresiones',      value: fmtNum(meta?.metrics['meta-ig-impressions']?.value),   pct: meta?.metrics['meta-ig-impressions']?.change_pct,   prev: fmtNum(meta?.metrics['meta-ig-impressions']?.prev_value) },
    { label: 'Alcance',          value: fmtNum(meta?.metrics['meta-ig-reach']?.value),          pct: meta?.metrics['meta-ig-reach']?.change_pct,          prev: fmtNum(meta?.metrics['meta-ig-reach']?.prev_value) },
    { label: 'Visitas al perfil', value: fmtNum(meta?.metrics['meta-ig-profile-views']?.value), pct: meta?.metrics['meta-ig-profile-views']?.change_pct,  prev: fmtNum(meta?.metrics['meta-ig-profile-views']?.prev_value) },
  ];

  const adsCards = [
    { label: 'Inversión',    value: fmtCurrency(meta?.metrics['meta-ads-spend']?.value),       pct: meta?.metrics['meta-ads-spend']?.change_pct,       prev: fmtCurrency(meta?.metrics['meta-ads-spend']?.prev_value),       goodUp: false, small: true },
    { label: 'Impresiones',  value: fmtNum(meta?.metrics['meta-ads-impressions']?.value),      pct: meta?.metrics['meta-ads-impressions']?.change_pct, prev: fmtNum(meta?.metrics['meta-ads-impressions']?.prev_value) },
    { label: 'Alcance',      value: fmtNum(meta?.metrics['meta-ads-reach']?.value),            pct: meta?.metrics['meta-ads-reach']?.change_pct,       prev: fmtNum(meta?.metrics['meta-ads-reach']?.prev_value) },
    { label: 'Clics',        value: fmtNum(meta?.metrics['meta-ads-clicks']?.value),           pct: meta?.metrics['meta-ads-clicks']?.change_pct,      prev: fmtNum(meta?.metrics['meta-ads-clicks']?.prev_value) },
  ];

  return (
    <Document title={`Métricas Mangone — ${weekStr}`} author="Marketing Hub">
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={s.logoMark}>
                <Text style={s.logoMarkText}>M</Text>
              </View>
              <View>
                <Text style={s.headerFirm}>Mangone Law Firm</Text>
                <Text style={s.headerDep}>Departamento de Marketing</Text>
              </View>
            </View>
            <Text style={s.headerMeta}>{weekStr}</Text>
          </View>
          <Text style={s.headerTitle}>Reporte Semanal de Métricas</Text>
          <Text style={s.headerMeta}>{dateRange}</Text>
        </View>
        <View style={s.goldStripe} />

        {/* ── Body ───────────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Totales destacados */}
          <View style={s.highlightsRow}>
            <View style={[s.hlCard, s.hlCardNavy]}>
              <Text style={s.hlLabel}>Fans Facebook</Text>
              <Text style={s.hlValue}>{fmtNum(fbFans)}</Text>
              <Text style={s.hlSub}>Total acumulado</Text>
            </View>
            <View style={[s.hlCard, { backgroundColor: '#9D174D' }]}>
              <Text style={s.hlLabel}>Seguidores IG</Text>
              <Text style={s.hlValue}>{fmtNum(igFollowers)}</Text>
              <Text style={s.hlSub}>Total acumulado</Text>
            </View>
            <View style={[s.hlCard, s.hlCardRed]}>
              <Text style={s.hlLabel}>Suscriptores YT</Text>
              <Text style={s.hlValue}>{fmtNum(ytTotal)}</Text>
              <Text style={s.hlSub}>Total acumulado</Text>
            </View>
            <View style={[s.hlCard, s.hlCardBlue]}>
              <Text style={s.hlLabel}>Sesiones GA4</Text>
              <Text style={s.hlValue}>{fmtNum(ga4Sessions)}</Text>
              <Text style={s.hlSub}>Últimos 28 días</Text>
            </View>
          </View>

          {/* Google Analytics 4 */}
          <SectionDivider label="Google Analytics 4" color="#1D4ED8" />
          <CardsRow items={ga4Cards.map((c, i) => (
            <MetricCard key={i} label={c.label} value={c.value} pct={c.pct} prev={c.prev} />
          ))} />

          {/* YouTube */}
          <SectionDivider label="YouTube" color="#DC2626" />
          <CardsRow items={ytCards.map((c, i) => (
            <MetricCard key={i} label={c.label} value={c.value} pct={c.pct} prev={c.prev} />
          ))} />

          {/* Facebook */}
          <SectionDivider label="Facebook — orgánico" color="#1877F2" />
          <CardsRow items={fbCards.map((c, i) => (
            <MetricCard key={i} label={c.label} value={c.value} pct={c.pct} prev={c.prev} />
          ))} />

          {/* Instagram */}
          <SectionDivider label="Instagram — orgánico" color="#E1306C" />
          <CardsRow items={igCards.map((c, i) => (
            <MetricCard key={i} label={c.label} value={c.value} pct={c.pct} prev={c.prev} />
          ))} />

          {/* Meta Ads */}
          <SectionDivider label="Meta Ads — pagado" color="#7C3AED" />
          <CardsRow items={adsCards.map((c, i) => (
            <MetricCard key={i} label={c.label} value={c.value} pct={c.pct} prev={c.prev}
              goodUp={c.goodUp ?? true} small={c.small ?? false} />
          ))} />

        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Mangone Marketing Hub · Confidencial</Text>
          <Text style={s.footerText}>{dateRange}</Text>
        </View>

      </Page>
    </Document>
  );
}
