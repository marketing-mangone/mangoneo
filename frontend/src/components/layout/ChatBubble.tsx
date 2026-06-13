'use client';
import { useState } from 'react';
import { X, Send } from 'lucide-react';

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Panel de chat (placeholder, no funcional) */}
      {open && (
        <div className="w-[360px] max-w-[calc(100vw-3rem)] h-[460px] bg-[var(--surface)] rounded-2xl shadow-[0_12px_40px_rgba(12,32,84,0.25)] border border-[var(--s-e5e7eb)] flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #0c2054 0%, #1a3a7a 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-lg">🥭</div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">Asistente Mangone</p>
                <p className="text-white/60 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En línea
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cuerpo */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[var(--s-f7f8fc)]">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-[#F79C31]/15 flex items-center justify-center text-sm flex-shrink-0">🥭</div>
              <div className="bg-[var(--surface)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm max-w-[80%]">
                <p className="text-sm text-[var(--t-374151)]">¡Hola! 👋 ¿Tienes alguna pregunta? Estoy aquí para ayudarte.</p>
              </div>
            </div>
          </div>

          {/* Input (deshabilitado — aún no funcional) */}
          <div className="px-3 py-3 border-t border-[var(--s-e5e7eb)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 bg-[var(--s-f3f4f6)] rounded-xl px-3 py-2 opacity-70">
              <input
                disabled
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-transparent text-sm text-[var(--t-374151)] placeholder:text-[var(--t-9ca3af)] outline-none cursor-not-allowed"
              />
              <button disabled className="text-[var(--t-9ca3af)] cursor-not-allowed">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--t-9ca3af)] text-center mt-1.5">Próximamente disponible</p>
          </div>
        </div>
      )}

      {/* Etiqueta "¿Tienes alguna pregunta?" */}
      {!open && showLabel && (
        <div className="flex items-center gap-2 bg-[var(--surface)] rounded-full shadow-[0_4px_16px_rgba(12,32,84,0.15)] border border-[var(--s-e5e7eb)] pl-4 pr-2 py-2 animate-fade-in">
          <span className="text-sm font-semibold text-[var(--t-0c2054)] whitespace-nowrap">¿Tienes alguna pregunta?</span>
          <button
            onClick={() => setShowLabel(false)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--t-9ca3af)] hover:bg-[var(--s-f0f2f8)] transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Burbuja flotante (botón) */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full shadow-[0_8px_24px_rgba(247,156,49,0.45)] flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform self-end"
        style={{ background: 'linear-gradient(135deg, #F79C31 0%, #e08a20 100%)' }}
        aria-label="Abrir chat"
      >
        {open ? <X className="w-6 h-6 text-white" /> : '🥭'}
      </button>
    </div>
  );
}
