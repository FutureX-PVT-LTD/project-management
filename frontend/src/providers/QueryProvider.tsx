'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30s default
            gcTime: 10 * 60 * 1000, // 10 minutes cache retention
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Never retry client errors (400, 401, 403, 404)
              const status = error?.statusCode || error?.status || error?.response?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
