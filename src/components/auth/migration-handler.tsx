'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { getUserDatabaseStatus, provisionUserDatabase, migrateLocalData } from '@/app/actions/user-db';

type MigrationStep = 'checking' | 'provisioning' | 'migrating' | 'done' | 'error' | null;

export function MigrationHandler() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<MigrationStep>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    if (hasRun.current) return;
    hasRun.current = true;

    async function runMigration() {
      try {
        setStep('checking');

        // Check if user already has a ready database
        const dbStatus = await getUserDatabaseStatus();
        if (dbStatus === 'ready') {
          setStep(null);
          return;
        }

        // Provision new database
        setStep('provisioning');
        await provisionUserDatabase();

        // Check if IndexedDB has data to migrate
        setStep('migrating');
        try {
          const { ClientDataLayer } = await import('@/lib/data-layer/client-data-layer');
          const clientDl = new ClientDataLayer();
          const localData = await clientDl.exportAllRawData();

          if (localData.jobs.length > 0 || localData.highlights.length > 0) {
            await migrateLocalData(localData);
            await clientDl.clearDatabase();
          }
        } catch {
          // IndexedDB might not be available or empty — that's fine
        }

        setStep('done');

        // Reload to pick up the new database
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('Migration failed:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Setup failed');
        setStep('error');
      }
    }

    runMigration();
  }, [status, session]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-sm mx-auto text-center space-y-4 p-8">
        {step === 'checking' && (
          <>
            <div className="h-8 w-8 mx-auto border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Checking your account...</p>
          </>
        )}

        {step === 'provisioning' && (
          <>
            <div className="h-8 w-8 mx-auto border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <p className="font-medium">Setting up your database...</p>
            <p className="text-sm text-muted-foreground">This only happens once.</p>
          </>
        )}

        {step === 'migrating' && (
          <>
            <div className="h-8 w-8 mx-auto border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <p className="font-medium">Migrating your data...</p>
            <p className="text-sm text-muted-foreground">Moving local data to your cloud database.</p>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="text-2xl">✓</div>
            <p className="font-medium">All set!</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="text-2xl text-destructive">!</div>
            <p className="font-medium text-destructive">Setup failed</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => {
                setStep(null);
                hasRun.current = false;
              }}
              className="text-sm underline text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
