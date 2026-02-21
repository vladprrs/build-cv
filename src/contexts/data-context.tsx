'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import type { DataLayer } from '@/lib/data-layer/types';

type DataMode = 'anonymous' | 'authenticated';

interface DataContextValue {
  dataLayer: DataLayer;
  mode: DataMode;
  isReady: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [dataLayer, setDataLayer] = useState<DataLayer | null>(null);
  const [mode, setMode] = useState<DataMode>('anonymous');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      if (status === 'loading') return;

      if (status === 'authenticated' && session?.user) {
        // Authenticated user — proxy through server actions
        const { ServerActionProxy } = await import(
          '@/lib/data-layer/server-action-proxy'
        );
        setDataLayer(new ServerActionProxy());
        setMode('authenticated');
      } else {
        // Anonymous user — use IndexedDB
        const { ClientDataLayer } = await import(
          '@/lib/data-layer/client-data-layer'
        );
        setDataLayer(new ClientDataLayer());
        setMode('anonymous');
      }
      setIsReady(true);
    }

    init();
  }, [status, session]);

  if (!dataLayer || !isReady) {
    return <>{children}</>;
  }

  return (
    <DataContext.Provider value={{ dataLayer, mode, isReady }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataLayer(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useDataLayer must be used within a DataProvider');
  }
  return ctx;
}
