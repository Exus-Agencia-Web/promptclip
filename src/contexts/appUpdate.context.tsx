import React, {
  createContext, useCallback, useEffect, useMemo, useState,
} from 'react';
import { checkForUpdate, UpdateStatus } from '../utils/updateChecker';

type CheckState = 'idle' | 'checking' | 'ok' | 'error';

export interface IAppUpdateContext {
  status: UpdateStatus | null;
  checkState: CheckState;
  errorMessage: string | null;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
}

export const AppUpdateContext = createContext<IAppUpdateContext>({
  status: null,
  checkState: 'idle',
  errorMessage: null,
  lastCheckedAt: null,
  refresh: async () => {},
});

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setCheckState('checking');
    setErrorMessage(null);
    try {
      const result = await checkForUpdate();
      setStatus(result);
      setCheckState('ok');
      setLastCheckedAt(Date.now());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('checkForUpdate failed', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      setCheckState('error');
      setLastCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status, checkState, errorMessage, lastCheckedAt, refresh,
    }),
    [status, checkState, errorMessage, lastCheckedAt, refresh],
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
    </AppUpdateContext.Provider>
  );
}
