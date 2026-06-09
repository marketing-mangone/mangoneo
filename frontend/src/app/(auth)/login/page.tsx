'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, ArrowRight, Shield } from 'lucide-react';
import NextImage from 'next/image';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return;
      const { innerWidth, innerHeight } = window;
      // -0.5..0.5 range, max desplazamiento ±20px
      const x = (e.clientX / innerWidth - 0.5) * -40;
      const y = (e.clientY / innerHeight - 0.5) * -40;
      parallaxRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.login(username, password);
      router.push('/dashboard');
    } catch {
      setError('Credenciales incorrectas. Verifica tu usuario y contraseña.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-[var(--s-0c2054)]">

      {/* ── LEFT PANEL: equipo con parallax ── */}
      <div className="hidden lg:block relative w-[58%] overflow-hidden">

        {/* Imagen con parallax — sobredimensionada para absorber el desplazamiento */}
        <div
          ref={parallaxRef}
          className="absolute"
          style={{
            inset: '-30px',
            transition: 'transform 0.12s ease-out',
            willChange: 'transform',
          }}
        >
          <NextImage
            src="/brand/team-photo.jpg"
            alt="Equipo Mangone Law Firm"
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
        </div>

        {/* Gradientes superpuestos */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C2054]/85 via-[#0C2054]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C2054]/95 via-[#0C2054]/10 to-[#0C2054]/40" />

        {/* Contenido encima de la foto */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">

          {/* Logo */}
          <div>
            <NextImage
              src="/brand/logo-blanco.png"
              alt="Mangone Law Firm"
              width={200}
              height={97}
              className="object-contain"
              priority
            />
            <p className="text-white/35 text-[10px] mt-2 tracking-[0.3em] uppercase font-semibold">
              Marketing Hub
            </p>
          </div>

          {/* Copy inferior */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F79C31]/15 border border-[#F79C31]/25 text-[var(--t-f79c31)] text-[11px] font-semibold tracking-wider uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--s-f79c31)] animate-pulse" />
              Equipo de Marketing
            </span>

            <h2
              className="leading-none mb-4 tracking-wide"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(48px, 5vw, 68px)',
                color: '#ffffff',
              }}
            >
              TU CENTRO<br />
              DE{' '}
              <span style={{ color: 'var(--t-f79c31)' }}>OPERACIONES</span>
            </h2>

            <p className="text-white/55 text-sm max-w-[280px] leading-relaxed">
              Métricas, recursos, equipo y estrategia en un solo lugar.
            </p>

            {/* Stats decorativas */}
            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-white/10">
              {[
                { label: 'Integraciones', value: '6+' },
                { label: 'Módulos', value: '8' },
                { label: 'Equipo', value: '6 personas' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-white font-bold text-lg leading-none">{stat.value}</p>
                  <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: formulario ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-[var(--s-f0f2f8)] relative overflow-hidden">

        {/* Pattern de fondo sutil */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1.5px 1.5px, #0C2054 1.5px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Blob decorativo */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#0C2054]/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full bg-[#F79C31]/6 blur-3xl pointer-events-none" />

        <div
          className="w-full max-w-[400px] relative"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <NextImage
              src="/brand/logo-negro.png"
              alt="Mangone Law Firm"
              width={160}
              height={78}
              className="object-contain"
              priority
            />
          </div>

          {/* Card principal */}
          <div
            className="bg-[var(--surface)] rounded-2xl border border-[#e5e7eb]/80 p-8"
            style={{ boxShadow: '0 24px 64px rgba(12,32,84,0.11), 0 4px 16px rgba(12,32,84,0.06)' }}
          >
            {/* Header */}
            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center mb-5 shadow-sm">
                <Shield className="w-5 h-5 text-[var(--t-f79c31)]" />
              </div>
              <h1 className="text-[22px] font-bold text-[var(--t-0c2054)] leading-tight mb-1.5">
                Bienvenido de vuelta
              </h1>
              <p className="text-[var(--t-9ca3af)] text-sm leading-relaxed">
                Ingresa con tus credenciales del Marketing Hub
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Usuario */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-2">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-9ca3af)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="tu.usuario"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] placeholder-[var(--t-c4c8d4)] outline-none transition-all"
                    style={{ '--tw-ring-color': 'rgba(12,32,84,0.12)' } as React.CSSProperties}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#0C2054';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,32,84,0.08)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-semibold text-[var(--t-6b7280)] uppercase tracking-widest">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-[var(--t-f79c31)] hover:text-[var(--t-e08a20)] font-medium transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-9ca3af)]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] outline-none transition-all"
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#0C2054';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,32,84,0.08)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--t-9ca3af)] hover:text-[var(--t-374151)] transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0C2054 0%, #1a3a7a 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(12,32,84,0.3)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(12,32,84,0.4)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(12,32,84,0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Ingresar al Hub
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer del card */}
            <div className="mt-6 pt-5 border-t border-[var(--s-f0f2f8)] flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-[var(--t-9ca3af)]">
                Todos los sistemas operativos
              </p>
            </div>
          </div>

          {/* Texto bajo la card */}
          <p className="text-center text-xs text-[var(--t-9ca3af)] mt-5">
            Uso exclusivo del equipo de Marketing · Mangone Law Firm, LLC
          </p>
        </div>
      </div>
      {/* ── MODAL: olvidé contraseña ── */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(12,32,84,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setForgotOpen(false)}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl p-8 w-full max-w-sm shadow-2xl"
            style={{ boxShadow: '0 32px 80px rgba(12,32,84,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--s-fef6e7)] flex items-center justify-center mb-5">
              <Lock className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--t-0c2054)] mb-1.5">¿Olvidaste tu contraseña?</h3>
            <p className="text-sm text-[var(--t-6b7280)] leading-relaxed mb-6">
              Contacta con el administrador del sistema para restablecer tu acceso.
            </p>
            <div className="flex items-center gap-3 p-4 bg-[var(--s-f0f2f8)] rounded-xl mb-6">
              <div className="w-10 h-10 rounded-full bg-[var(--s-0c2054)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                SQ
              </div>
              <div>
                <p className="font-semibold text-[var(--t-0c2054)] text-sm">Sebastian Quijada</p>
                <p className="text-xs text-[var(--t-9ca3af)]">Director de Marketing</p>
              </div>
            </div>
            <button
              onClick={() => setForgotOpen(false)}
              className="w-full py-3 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
