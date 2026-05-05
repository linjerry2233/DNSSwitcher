interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color?: string;
}

export function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="glass-card glow-card card-enter p-5 flex flex-col justify-between" style={{ minHeight: 120 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: color || 'var(--text-muted)' }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
