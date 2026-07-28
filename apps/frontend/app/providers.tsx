'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { UiModeProvider } from '@/components/layout/ui-mode-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <UiModeProvider>{children}</UiModeProvider>
    </QueryClientProvider>
  );
}
