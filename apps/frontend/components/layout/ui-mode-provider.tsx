'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readUiMode, writeUiMode, type UiMode } from '@/lib/ui-mode';

type UiModeContextValue = {
  mode: UiMode;
  setMode: (mode: UiMode) => void;
  ready: boolean;
};

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UiMode>('compact');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setModeState(readUiMode());
    setReady(true);
  }, []);

  const setMode = useCallback((next: UiMode) => {
    writeUiMode(next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode, ready }), [mode, setMode, ready]);

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

export function useUiMode() {
  const ctx = useContext(UiModeContext);
  if (!ctx) {
    throw new Error('useUiMode must be used within UiModeProvider');
  }
  return ctx;
}
