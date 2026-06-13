'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { chatApi, type ChatMessage } from '@/lib/api';

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: '¡Hola! 👋 Soy el asistente del Hub. ¿Tienes alguna pregunta? Puedo ayudarte a encontrar cosas en el Hub o contarte sobre la firma.',
};

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      // Enviamos sin el saludo inicial (es solo de UI)
      const payload = next.filter(m => m !== WELCOME);
      const { reply } = await chatApi.send(payload);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Ups, tuve un problema para responder. Intenta de nuevo en un momento.' }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Panel de chat */}
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
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[var(--s-f7f8fc)]">
            {messages.map((m, i) => (
              m.role === 'assistant' ? (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#F79C31]/15 flex items-center justify-center text-sm flex-shrink-0">🥭</div>
                  <div className="bg-[var(--surface)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm max-w-[80%]">
                    <p className="text-sm text-[var(--t-374151)] whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="bg-[var(--s-0c2054)] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              )
            ))}
            {sending && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-[#F79C31]/15 flex items-center justify-center text-sm flex-shrink-0">🥭</div>
                <div className="bg-[var(--surface)] rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-9ca3af)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-9ca3af)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-9ca3af)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[var(--s-e5e7eb)] bg-[var(--surface)]">
            <div className="flex items-end gap-2 bg-[var(--s-f3f4f6)] rounded-xl px-3 py-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-transparent text-sm text-[var(--t-374151)] placeholder:text-[var(--t-9ca3af)] outline-none resize-none max-h-24"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="text-[var(--t-f79c31)] hover:text-[var(--t-e08a20)] disabled:text-[var(--t-d1d5db)] disabled:cursor-not-allowed transition-colors flex-shrink-0 pb-0.5"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
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
