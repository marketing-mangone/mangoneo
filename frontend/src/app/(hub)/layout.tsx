import { SidebarWithBadge } from '@/components/layout/SidebarWithBadge';
import { ChatBubble } from '@/components/layout/ChatBubble';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--s-eef0f6)' }}>
      <SidebarWithBadge />
      {/* Main scroll area — fondo ligeramente diferente al del sidebar para crear contraste.
          ml-3 crea un gutter consistente para que el contenido nunca quede pegado al sidebar
          (en estado colapsado o desplegado). */}
      <main
        className="flex-1 overflow-y-auto min-w-0 ml-3 rounded-tl-2xl"
        style={{ background: 'linear-gradient(180deg, var(--app-main-top) 0%, var(--app-main-bottom) 100%)' }}
      >
        {children}
      </main>
      <ChatBubble />
    </div>
  );
}
