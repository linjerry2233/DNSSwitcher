import { useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import { StatCard } from "./StatCard";
import { QpsChart } from "./QpsChart";
import { UpstreamStatusCard } from "./UpstreamStatusCard";
import { Activity, Target, Clock, Globe } from "lucide-react";

export function Dashboard() {
  const { stats, qpsData, appendQps } = useAppStore();

  useEffect(() => {
    const interval = setInterval(() => {
      const s = useAppStore.getState().stats;
      if (s) {
        appendQps(s.total_queries);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [appendQps]);

  const displayStats = stats;
  const currentQps = qpsData.length >= 2 ? qpsData[qpsData.length - 1] - qpsData[qpsData.length - 2] : 0;
  const peakQps = qpsData.length >= 2
    ? Math.max(...qpsData.slice(1).map((v, i) => v - qpsData[i]))
    : 0;

  const latency = displayStats?.avg_latency_ms || 0;
  const latencyColor = latency < 50 ? 'var(--color-success)' : latency < 100 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>仪表盘</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>DNS 服务实时状态概览</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="总查询数"
          value={displayStats?.total_queries?.toLocaleString() || '0'}
          subtitle="累计查询"
          icon={<Activity size={18} />}
        />
        <StatCard
          title="缓存命中率"
          value={`${(displayStats?.cache_hit_rate || 0).toFixed(1)}%`}
          subtitle={`${Math.round((displayStats?.cache_hit_rate || 0) * (displayStats?.total_queries || 0) / 100)} 命中`}
          icon={<Target size={18} />}
        />
        <StatCard
          title="平均延迟"
          value={`${displayStats?.avg_latency_ms || 0}ms`}
          subtitle="当前延迟"
          icon={<Clock size={18} />}
          color={latencyColor}
        />
        <StatCard
          title="活跃上游"
          value={`${displayStats?.active_upstreams || 0}`}
          subtitle={`共 ${displayStats?.upstreams?.length || 0} 个`}
          icon={<Globe size={18} />}
        />
      </div>

      {/* QPS Chart */}
      <QpsChart data={qpsData} peakQps={peakQps} currentQps={currentQps} />

      {/* Upstream status cards */}
      {displayStats?.upstreams && displayStats.upstreams.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            上游服务器状态
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {displayStats.upstreams.map(([id, upstreamStats]) => (
              <UpstreamStatusCard key={id} id={id} stats={upstreamStats} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
