import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./components/layout/Sidebar";
import { TitleBar } from "./components/layout/TitleBar";
import { Dashboard } from "./components/dashboard/Dashboard";
import { UpstreamManager } from "./components/upstream/UpstreamManager";
import { QueryLog } from "./components/logs/QueryLog";
import { CacheManager } from "./components/cache/CacheManager";
import { Settings } from "./components/settings/Settings";
import { useAppStore } from "./store/appStore";
import type { StatsSnapshot } from "./types";

type Page = 'dashboard' | 'upstream' | 'logs' | 'cache' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { loadConfig, loadServiceStatus, loadStats } = useAppStore();

  useEffect(() => {
    loadConfig();
    loadServiceStatus();
    loadStats();

    // 全局监听统计更新，持久化到 store
    const unlisten = listen<StatsSnapshot>('dns://stats-update', (event) => {
      useAppStore.setState({ stats: event.payload });
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'upstream':
        return <UpstreamManager />;
      case 'logs':
        return <QueryLog />;
      case 'cache':
        return <CacheManager />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-base)' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-auto scrollbar-thin p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
