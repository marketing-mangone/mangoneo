'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BarChart3, FolderOpen, Users,
  CheckSquare, Calendar, ChevronLeft, ChevronRight,
  LogOut, Target, Wrench, Link2, Sun, Moon, Handshake,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/lib/api';
import { useTheme } from '@/components/theme/ThemeProvider';

type SubNavItem = { href: string; label: string; exact?: boolean; adminOnly?: boolean };
type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  subItems?: SubNavItem[];
};

const NAV_MAIN: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Vista general' },
      {
        href: '/metricas',
        icon: BarChart3,
        label: 'Métricas',
        desc: 'KPIs y datos',
        subItems: [
          { href: '/metricas', label: 'Departamentales', exact: true },
          { href: '/metricas/individuales', label: 'Individuales', adminOnly: true },
          { href: '/metricas/integraciones', label: 'Integraciones' },
        ],
      },
    ],
  },
  {
    label: 'Ventas',
    items: [
      {
        href: '/ventas',
        icon: Handshake,
        label: 'Ventas',
        desc: 'Leads y pipeline',
        subItems: [
          { href: '/ventas', label: 'Pipeline', exact: true },
          { href: '/ventas/leads', label: 'Leads' },
        ],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/recursos', icon: FolderOpen, label: 'Recursos', desc: 'Docs y brand' },
      { href: '/equipo', icon: Users, label: 'Equipo', desc: 'Directorio' },
      { href: '/tareas', icon: CheckSquare, label: 'Tareas', desc: 'Kanban' },
      { href: '/calendario', icon: Calendar, label: 'Calendario', desc: 'Contenido' },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { href: '/competencia', icon: Target, label: 'Competencia', desc: 'Radar competitivo' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      {
        href: '/herramientas',
        icon: Wrench,
        label: 'Herramientas',
        desc: 'Utilidades de marketing',
        subItems: [
          { href: '/herramientas', label: 'Auditor de Contenido', exact: true },
          { href: '/herramientas/grillas', label: 'Generador de Grillas' },
          { href: '/herramientas/publicaciones', label: 'Publicaciones' },
        ],
      },
    ],
  },
];

// ── Flyout card ───────────────────────────────────────────────────────────────

function FlyoutCard({
  item,
  anchorY,
  sidebarWidth,
  pathname,
  onClose,
}: {
  item: NavItem;
  anchorY: number;
  sidebarWidth: number;
  pathname: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Keep card within viewport vertically
  const CARD_ESTIMATE = 44 + (item.subItems?.length ?? 0) * 40 + 16;
  const top = Math.min(anchorY, window.innerHeight - CARD_ESTIMATE - 16);

  return (
    <div
      ref={cardRef}
      className="fixed z-[200] pointer-events-auto"
      style={{ left: sidebarWidth + 8, top }}
      onMouseLeave={onClose}
    >
      {/* Arrow pointing left */}
      <div
        className="absolute left-[-6px] top-5 w-3 h-3 rotate-45 rounded-sm"
        style={{ background: '#ffffff', boxShadow: '-2px 2px 4px rgba(0,0,0,0.06)' }}
      />

      {/* Card */}
      <div
        className="bg-[var(--surface)] rounded-2xl overflow-hidden"
        style={{
          minWidth: 200,
          boxShadow: '0 8px 32px rgba(12,32,84,0.14), 0 2px 8px rgba(12,32,84,0.08)',
          border: '1px solid rgba(229,231,235,0.8)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--s-f0f2f8)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--s-0c2054)] flex items-center justify-center flex-shrink-0">
            <item.icon style={{ width: 13, height: 13, color: '#F79C31' }} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[var(--t-0c2054)] leading-tight">{item.label}</p>
            <p className="text-[11px] text-[var(--t-9ca3af)] leading-tight">{item.desc}</p>
          </div>
        </div>

        {/* Sub-items */}
        <div className="py-1.5">
          {item.subItems?.map(sub => {
            const active = sub.exact
              ? pathname === sub.href
              : pathname.startsWith(sub.href);
            return (
              <button
                key={sub.href}
                onClick={() => { router.push(sub.href); onClose(); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all group',
                  active
                    ? 'bg-[var(--s-f0f2f8)] text-[var(--t-0c2054)]'
                    : 'text-[var(--t-374151)] hover:bg-[var(--s-f7f8fc)] hover:text-[var(--t-0c2054)]'
                )}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                  active ? 'bg-[var(--s-f79c31)]' : 'bg-[var(--s-d1d5db)] group-hover:bg-[var(--s-f79c31)]'
                )} />
                <span className={cn('text-[13px] font-medium', active && 'font-semibold')}>
                  {sub.label}
                </span>
                {active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-[var(--t-f79c31)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [flyout, setFlyout] = useState<{ item: NavItem; anchorY: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Read session only after mount to avoid SSR/client hydration mismatch
  // (localStorage is unavailable during server render).
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof auth.getCurrentUser>>(null);
  useEffect(() => { setCurrentUser(auth.getCurrentUser()); }, []);

  const displayName = currentUser?.name || currentUser?.username || 'Usuario';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const isAdmin = currentUser?.role === 'admin';
  const roleLabel = isAdmin ? 'Admin' : currentUser?.role || '';

  // NAV filtrado por rol: oculta sub-items adminOnly a quienes no son admin
  const navMain = NAV_MAIN.map(group => ({
    ...group,
    items: group.items.map(item =>
      item.subItems
        ? { ...item, subItems: item.subItems.filter(s => !s.adminOnly || isAdmin) }
        : item
    ),
  }));

  // Close flyout on route change
  useEffect(() => { setFlyout(null); }, [pathname]);

  const sidebarWidth = collapsed ? 72 : 264;

  const scheduledClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setFlyout(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openFlyout = useCallback((item: NavItem, e: React.MouseEvent) => {
    cancelClose();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyout({ item, anchorY: rect.top });
  }, [cancelClose]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          'relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[264px]'
        )}
        style={{
          background: 'linear-gradient(180deg, #0c2054 0%, #0f2860 60%, #091840 100%)',
          boxShadow: '1px 0 0 rgba(255,255,255,0.06), 4px 0 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 80% 0%, rgba(247,156,49,0.08) 0%, transparent 60%)',
          }}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => { setCollapsed(v => !v); setFlyout(null); }}
          className="absolute -right-3 top-[72px] z-30 w-6 h-6 rounded-full bg-[var(--surface)] border border-[var(--s-e5e7eb)] shadow-md flex items-center justify-center text-[var(--t-6b7280)] hover:text-[var(--t-0c2054)] hover:border-[var(--s-0c2054)] transition-all"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* ── LOGO ── */}
        <div className={cn(
          'relative z-10 flex items-center border-b border-white/8',
          collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'
        )}>
          {collapsed ? (
            <div className="w-9 h-9 relative flex-shrink-0">
              <Image src="/brand/logo-blanco.png" alt="Mangone Law Firm" fill className="object-contain" />
            </div>
          ) : (
            <div className="flex flex-col gap-1 overflow-hidden">
              <div className="relative h-9 w-36 flex-shrink-0">
                <Image src="/brand/logo-blanco.png" alt="Mangone Law Firm" fill className="object-contain object-left" />
              </div>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.12em] truncate">
                Marketing Hub
              </p>
            </div>
          )}
        </div>

        {/* ── NAV ── */}
        <nav className="relative z-10 flex-1 px-3 py-5 overflow-y-auto">
          <ul className="space-y-1">
            {navMain.flatMap(group => group.items).map(item => {
              const { href, icon: Icon, label, desc, subItems } = item;
              const active = pathname === href || pathname.startsWith(href + '/');
              const hasFlyout = !!subItems;

              const itemClass = cn(
                'group flex items-center rounded-xl transition-all duration-150 relative overflow-hidden w-full text-left',
                collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-white/12 text-white'
                  : 'text-white/50 hover:bg-white/6 hover:text-white/80'
              );
              const iconClass = cn(
                'flex items-center justify-center rounded-lg flex-shrink-0 transition-all',
                collapsed ? 'w-9 h-9' : 'w-8 h-8',
                active
                  ? 'bg-[var(--s-f79c31)] text-[var(--t-0c2054)] shadow-[0_2px_8px_rgba(247,156,49,0.4)]'
                  : 'bg-white/6 text-white/60 group-hover:bg-white/10 group-hover:text-white'
              );

              const innerContent = (
                <>
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--s-f79c31)]" />
                  )}
                  <div className={iconClass}>
                    <Icon style={{ width: '16px', height: '16px' }} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-semibold leading-tight truncate',
                        active ? 'text-white' : 'text-white/70 group-hover:text-white/90'
                      )}>
                        {label}
                      </p>
                      <p className="text-[11px] text-white/30 group-hover:text-white/40 truncate mt-0.5">
                        {desc}
                      </p>
                    </div>
                  )}
                  {/* Flyout indicator */}
                  {hasFlyout && !collapsed && (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-white/25 group-hover:text-white/50 transition-colors" />
                  )}
                </>
              );

              return (
                <li key={href}>
                  {hasFlyout ? (
                    <button
                      className={itemClass}
                      onMouseEnter={e => openFlyout(item, e)}
                      onMouseLeave={scheduledClose}
                      onClick={e => openFlyout(item, e)}
                    >
                      {innerContent}
                    </button>
                  ) : (
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      className={itemClass}
                      onMouseEnter={() => { cancelClose(); setFlyout(null); }}
                    >
                      {innerContent}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── BOTTOM ── */}
        <div className={cn(
          'relative z-10 border-t border-white/8 space-y-1',
          collapsed ? 'px-0 py-3' : 'px-3 py-3'
        )}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={cn(
              'group flex items-center rounded-xl transition-all text-white/55 hover:bg-white/6 hover:text-white w-full',
              collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5'
            )}
          >
            <span className={cn(
              'flex items-center justify-center rounded-lg flex-shrink-0 bg-white/6 group-hover:bg-white/10 transition-all',
              collapsed ? 'w-9 h-9' : 'w-8 h-8'
            )}>
              {isDark
                ? <Sun style={{ width: 16, height: 16 }} className="text-[#F79C31]" />
                : <Moon style={{ width: 16, height: 16 }} />}
            </span>
            {!collapsed && (
              <span className="flex-1 text-left text-[13px] font-semibold text-white/70 group-hover:text-white/90">
                {isDark ? 'Modo claro' : 'Modo oscuro'}
              </span>
            )}
          </button>

          {/* User → perfil + logout */}
          <div className={cn(
            'flex items-center rounded-xl transition-all',
            collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-2'
          )}>
            <Link
              href="/perfil"
              title="Mi perfil"
              className={cn(
                'group flex items-center rounded-xl transition-all hover:bg-white/6',
                collapsed ? 'justify-center w-12 h-12 mx-auto' : 'flex-1 min-w-0 gap-3 px-3 py-2'
              )}
            >
              <div
                className={cn(
                  'rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[#0C2054] shadow-md',
                  collapsed ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-[13px]'
                )}
                style={{ background: 'linear-gradient(135deg, #F79C31 0%, #f0a94a 100%)' }}
              >
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold truncate leading-tight group-hover:text-white">{displayName}</p>
                  <p className="text-white/35 text-[11px] truncate">{currentUser?.position || roleLabel}</p>
                </div>
              )}
            </Link>
            {!collapsed && (
              <button
                onClick={() => auth.logout()}
                title="Cerrar sesión"
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/6 transition-all"
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── FLYOUT PORTAL (rendered outside aside to escape overflow:hidden) ── */}
      {flyout && (
        <div
          className="fixed inset-0 z-[199] pointer-events-none"
          onMouseEnter={cancelClose}
        >
          <FlyoutCard
            item={flyout.item}
            anchorY={flyout.anchorY}
            sidebarWidth={sidebarWidth}
            pathname={pathname}
            onClose={() => setFlyout(null)}
          />
        </div>
      )}
    </>
  );
}
