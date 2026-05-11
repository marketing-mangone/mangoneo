import { Sidebar } from '@/components/layout/Sidebar';

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#eef0f6' }}>
      <Sidebar unreadCount={2} />
      {/* Main scroll area — fondo ligeramente diferente al del sidebar para crear contraste */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        style={{ background: 'linear-gradient(180deg, #f4f6fb 0%, #eef0f6 100%)' }}
      >
        {children}
      </main>
    </div>
  );
}
