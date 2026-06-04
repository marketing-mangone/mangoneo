'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import NextImage from 'next/image';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#0C2054] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0">
          <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-[#F79C31]/8" />
          <div className="absolute bottom-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-[#F79C31]/5" />
        </div>
        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <NextImage
              src="/brand/logo-blanco.png"
              alt="Mangone Law Firm"
              width={240}
              height={117}
              className="object-contain"
              priority
            />
            <p className="text-white/40 text-xs mt-3 tracking-widest uppercase">Marketing Hub</p>
          </div>

          <h2 className="font-display text-5xl text-white leading-tight mb-4">
            TU CENTRO<br />DE <span className="text-[#F79C31]">OPERACIONES</span>
          </h2>
          <p className="text-white/60 text-base max-w-sm leading-relaxed">
            Métricas, recursos, equipo y estrategia en un solo lugar. La plataforma interna del equipo de marketing.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-6 pt-8 border-t border-white/10">
            {[['284', 'Leads / mes'], ['18.4K', 'Sesiones web'], ['5.2%', 'Engagement']].map(([val, label]) => (
              <div key={label}>
                <p className="text-[#F79C31] font-display text-2xl">{val}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-[#f7f8fc]">
        <div className="w-full max-w-md">
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

          <div className="bg-white rounded-2xl border border-[#e8e8f0] shadow-[0_8px_32px_rgba(12,32,84,0.1)] p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Bienvenido de vuelta</h1>
              <p className="text-[#8888a8] text-sm">Ingresa con tus credenciales de Mangone Law Firm</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-2">Usuario</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="tu usuario"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e8e8f0] bg-[#f7f8fc] text-sm text-[#1a1a2e] placeholder-[#8888a8] outline-none focus:border-[#F79C31] focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-[#1a1a2e]">Contraseña</label>
                  <button type="button" className="text-xs text-[#F79C31] hover:underline font-medium">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#e8e8f0] bg-[#f7f8fc] text-sm text-[#1a1a2e] outline-none focus:border-[#F79C31] focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8888a8] hover:text-[#4a4a6a]"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <span>⚠</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#F79C31] hover:bg-[#e08a20] text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Ingresar al Hub <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#e8e8f0]">
              <p className="text-center text-xs text-[#8888a8]">
                ¿Problemas para ingresar? Contacta al administrador del sistema.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[#8888a8] mt-6">
            Uso exclusivo del equipo de Marketing · Mangone Law Firm, LLC
          </p>
        </div>
      </div>
    </div>
  );
}
