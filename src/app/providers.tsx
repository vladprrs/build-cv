'use client';

import { SessionProvider } from 'next-auth/react';
import { DataProvider } from '@/contexts/data-context';
import { MigrationHandler } from '@/components/auth/migration-handler';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DataProvider>
        <MigrationHandler />
        {children}
      </DataProvider>
    </SessionProvider>
  );
}
