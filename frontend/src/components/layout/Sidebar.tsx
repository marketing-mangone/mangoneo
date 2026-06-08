'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BarChart3, FolderOpen, Users,
  CheckSquare, Calendar, ChevronLeft, ChevronRight,
  LogOut, Target, Wrench,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/api';

type SubNavItem = { href: string; label: string; exact?: boolean };
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
          { href: '/metricas/individuales', label: 'Individuales' },
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
        ],
      },
    ],
  },
];

export function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Sub-menus collapsed by default; auto-expand only the active parent route
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpenMenus(prev => {
      const next = new Set(prev);
      for (const group of NAV_MAIN) {
        for (const item of group.items) {
          if (item.subItems?.some(s => pathname === s.href || pathname.startsWith(s.href + '/'))) {
            next.add(item.href);
          }
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleMenu = (href: string) =>
    setOpenMenus(prev => {
      const next = new Set(prev);
      next.has(href) ? next.delete(href) : next.add(href);
      return next;
    });
  const currentUser = auth.getCurrentUser();
  const displayName = currentUser?.name || currentUser?.username || 'Usuario';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = currentUser?.role === 'admin' ? 'Admin' : currentUser?.role || '';

  return (
    <aside
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
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-30 w-6 h-6 rounded-full bg-white border border-[#e5e7eb] shadow-md flex items-center justify-center text-[#6b7280] hover:text-[#0C2054] hover:border-[#0C2054] transition-all"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>

      {/* ── LOGO ── */}
      <div className={cn(
        'relative z-10 flex items-center border-b border-white/8',
        collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-5 py-4'
      )}>
        {collapsed ? (
          <div className="w-9 h-9 relative flex-shrink-0">
            <Image
              src="/brand/logo-blanco.png"
              alt="Mangone Law Firm"
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1 overflow-hidden">
            <div className="relative h-9 w-36 flex-shrink-0">
              <Image
                src="/brand/logo-blanco.png"
                alt="Mangone Law Firm"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.12em] truncate">
              Marketing Hub
            </p>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav className="relative z-10 flex-1 px-3 py-5 overflow-y-auto space-y-6">
        {NAV_MAIN.map(group => (
          <div key={group.label}>
              <ul className="space-y-1">
              {group.items.map(({ href, icon: Icon, label, desc, subItems }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                const isOpen = openMenus.has(href);
                const itemClass = cn(
                  'group flex items-center rounded-xl transition-all duration-150 relative overflow-hidden',
                  collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-white/12 text-white'
                    : 'text-white/50 hover:bg-white/6 hover:text-white/80'
                );
                const iconClass = cn(
                  'flex items-center justify-center rounded-lg flex-shrink-0 transition-all',
                  collapsed ? 'w-9 h-9' : 'w-8 h-8',
                  active
                    ? 'bg-[#F79C31] text-[#0C2054] shadow-[0_2px_8px_rgba(247,156,49,0.4)]'
                    : 'bg-white/6 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                );
                const innerContent = (
                  <>
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#F79C31]" />
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
                    {/* Chevron for items with sub-menus */}
                    {subItems && !collapsed && (
                      <ChevronRight className={cn(
                        'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 text-white/30',
                        isOpen && 'rotate-90'
                      )} />
                    )}
                  </>
                );

                return (
                  <li key={href}>
                    {/* Items with subItems toggle the menu; otherwise navigate directly */}
                    {subItems && !collapsed ? (
                      <button
                        onClick={() => toggleMenu(href)}
                        title={collapsed ? label : undefined}
                        className={cn(itemClass, 'w-full text-left')}
                      >
                        {innerContent}
                      </button>
                    ) : (
                      <Link href={href} title={collapsed ? label : undefined} className={itemClass}>
                        {innerContent}
                      </Link>
                    )}

                    {/* Sub-items — shown only when open */}
                    {subItems && !collapsed && isOpen && (
                      <ul className="mt-0.5 mb-1 space-y-0.5 pl-[44px] pr-1">
                        {subItems.map(sub => {
                          const subActive = sub.exact
                            ? pathname === sub.href
                            : pathname.startsWith(sub.href);
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={cn(
                                  'flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all',
                                  subActive
                                    ? 'text-white bg-white/10'
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                )}
                              >
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                  subActive ? 'bg-[#F79C31]' : 'bg-white/20'
                                )} />
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>


      {/* ── BOTTOM ── */}
      <div className={cn(
        'relative z-10 border-t border-white/8',
        collapsed ? 'px-0 py-3' : 'px-3 py-3'
      )}>
        {/* User profile + logout */}
        <div className={cn(
          'flex items-center rounded-xl transition-all',
          collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5'
        )}>
          <div className={cn(
            'rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[#0C2054] shadow-md',
            collapsed ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-[13px]'
          )}
            style={{ background: 'linear-gradient(135deg, #F79C31 0%, #f0a94a 100%)' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-semibold truncate leading-tight">{displayName}</p>
                <p className="text-white/35 text-[11px] truncate">{currentUser?.position || roleLabel}</p>
              </div>
              <button
                onClick={() => auth.logout()}
                title="Cerrar sesión"
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/6 transition-all"
              >
                <LogOut style={{ width: '14px', height: '14px' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

