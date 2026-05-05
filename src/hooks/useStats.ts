import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { StatsSnapshot, QueryRecord } from '../types';

export function useStats() {
  const [stats, setStats] = useState<StatsSnapshot | null>(null);

  useEffect(() => {
    const unlisten = listen<StatsSnapshot>('dns://stats-update', (event) => {
      setStats(event.payload);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  return stats;
}

export function useQueryLog() {
  const [records, setRecords] = useState<QueryRecord[]>([]);

  useEffect(() => {
    const unlisten = listen<QueryRecord>('dns://query-record', (event) => {
      setRecords(prev => [event.payload, ...prev].slice(0, 5000));
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  return records;
}
