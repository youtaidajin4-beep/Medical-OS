'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api-client';

export function MustChangePasswordGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) return;
    if (pathname.startsWith('/settings')) return;

    void api
      .me()
      .then((user) => {
        if (user.mustChangePassword) {
          router.replace('/settings?changePassword=1');
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return <>{children}</>;
}
