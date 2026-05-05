import { create } from 'zustand';
import type {
  AppConfig,
  ServiceStatus,
  StatsSnapshot,
  QueryRecord,
  UpstreamDns,
} from '../types';
import * as api from '../hooks/useTauri';

type Theme = 'dark' | 'light';

interface AppState {
  // 配置
  config: AppConfig | null;
  serviceStatus: ServiceStatus | null;
  stats: StatsSnapshot | null;
  queryLog: QueryRecord[];
  loading: boolean;
  error: string | null;
  theme: Theme;

  // 仪表盘持久化数据
  qpsData: number[];
  appendQps: (totalQueries: number) => void;

  // 操作
  loadConfig: () => Promise<void>;
  loadServiceStatus: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadQueryLog: () => Promise<void>;
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  addUpstream: (upstream: UpstreamDns) => Promise<void>;
  updateUpstream: (upstream: UpstreamDns) => Promise<void>;
  deleteUpstream: (id: string) => Promise<void>;
  setWorkMode: (mode: 'Weighted' | 'Racing') => Promise<void>;
  clearQueryLog: () => Promise<void>;
  clearCache: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  serviceStatus: null,
  stats: null,
  queryLog: [],
  loading: false,
  error: null,
  qpsData: [],
  appendQps: (totalQueries: number) => {
    set((state) => {
      const newData = [...state.qpsData, totalQueries];
      if (newData.length > 60) newData.shift();
      return { qpsData: newData };
    });
  },
  theme: ((): Theme => {
    const saved = localStorage.getItem('rustdns-theme');
    const t: Theme = (saved === 'light' || saved === 'dark')
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    return t;
  })(),

  loadConfig: async () => {
    try {
      set({ loading: true });
      const config = await api.getSettings();
      const rawTheme = config?.ui?.theme;
      let theme: Theme = get().theme;
      if (rawTheme === 'dark' || rawTheme === 'light') {
        theme = rawTheme;
      } else if (rawTheme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('rustdns-theme', theme);
      set({ config, loading: false, theme });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadServiceStatus: async () => {
    try {
      const status = await api.getServiceStatus();
      set({ serviceStatus: status });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadStats: async () => {
    try {
      const stats = await api.getStatsSnapshot();
      set({ stats });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  loadQueryLog: async () => {
    try {
      const log = await api.getQueryLog({});
      set({ queryLog: log });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  startService: async () => {
    try {
      set({ loading: true });
      await api.startDnsService();
      await get().loadServiceStatus();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  stopService: async () => {
    try {
      set({ loading: true });
      await api.stopDnsService();
      await get().loadServiceStatus();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  addUpstream: async (upstream) => {
    try {
      set({ loading: true });
      await api.addUpstream(upstream);
      await get().loadConfig();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateUpstream: async (upstream) => {
    try {
      set({ loading: true });
      await api.updateUpstream(upstream);
      await get().loadConfig();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  deleteUpstream: async (id) => {
    try {
      set({ loading: true });
      await api.deleteUpstream(id);
      await get().loadConfig();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setWorkMode: async (mode) => {
    try {
      set({ loading: true });
      await api.setWorkMode(mode);
      await get().loadConfig();
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  clearQueryLog: async () => {
    try {
      await api.clearQueryLog();
      set({ queryLog: [] });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearCache: async () => {
    try {
      await api.clearCache();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setTheme: async (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rustdns-theme', theme);
    set({ theme });
    const config = get().config;
    if (config) {
      const updated = { ...config, ui: { ...config.ui, theme } };
      try {
        await api.saveSettings(updated);
        set({ config: updated });
      } catch (error) {
        set({ error: String(error) });
      }
    }
  },
}));
