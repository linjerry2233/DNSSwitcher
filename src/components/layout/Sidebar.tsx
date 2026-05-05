import { LayoutDashboard, Globe, ScrollText, Database, Settings } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

type Page = 'dashboard' | 'upstream' | 'logs' | 'cache' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, icon: LayoutDashboard, label: '仪表盘' },
  { id: 'upstream' as Page, icon: Globe, label: '上游 DNS' },
  { id: 'logs' as Page, icon: ScrollText, label: '查询日志' },
  { id: 'cache' as Page, icon: Database, label: '缓存' },
  { id: 'settings' as Page, icon: Settings, label: '设置' },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { serviceStatus } = useAppStore();

  return (
    <aside
      className="flex flex-col border-r"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sidebar-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25C17.17 23.15 21 18.25 21 13V7l-9-5z" fill="url(#sidebar-logo-grad)" opacity="0.9"/>
          <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">DNS</text>
        </svg>
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>RustDNS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm font-medium relative interactive btn-press ${
                isActive ? 'accent-line' : ''
              }`}
              style={{
                height: 44,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              }}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Service status */}
      <div className="px-5 py-4 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="status-dot relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: serviceStatus?.running ? 'var(--color-success)' : 'var(--text-muted)',
              }}
            />
            {serviceStatus?.running && (
              <div
                className="absolute inset-[-4px] rounded-full animate-pulse-ring"
                style={{ background: 'var(--color-success)', opacity: 0.4 }}
              />
            )}
          </div>
          <span className="text-xs font-medium" style={{ color: serviceStatus?.running ? 'var(--color-success)' : 'var(--text-muted)' }}>
            {serviceStatus?.running ? '服务运行中' : '服务已停止'}
          </span>
        </div>
        {serviceStatus?.listen_address && (
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {serviceStatus.listen_address}
          </p>
        )}
      </div>
    </aside>
  );
}
