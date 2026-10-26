'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { api, clearToken } from '@/lib/api-client';
import { AppSidebar, BrandMark, SidebarBody } from '@/components/aura/app-sidebar';
import { DemoBanner } from './demo-banner';
import { AiStatusBanner } from './ai-status-banner';

/**
 * 全体の枠。特徴的な左サイドナビ（AppSidebar）と、余白の大きいメイン。
 * 背景は warm white に、mint と cyan のごく淡い光を二つだけ置く（画面を埋めない）。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    void api
      .me()
      .then((user) => setUserName(user.name))
      .catch(() => setUserName(''));
  }, []);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="relative min-h-screen bg-aura-paper">
      <DemoBanner />
      <AiStatusBanner />
      <div className="relative flex">
        <AppSidebar userName={userName} onLogout={logout} />

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {/* 背景の光。内容の後ろで、ゆっくりだけ動く */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 print:hidden">
            <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] animate-orb-drift rounded-full bg-aura-cyan-200/40 blur-3xl" />
            <div className="absolute -bottom-52 left-1/4 h-[30rem] w-[30rem] animate-orb-drift rounded-full bg-aura-mint-200/35 blur-3xl [animation-delay:-7s]" />
          </div>

          <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-aura-line bg-aura-paper/90 px-4 py-3 backdrop-blur md:hidden">
            <BrandMark />
            <button
              type="button"
              aria-label="メニューを開く"
              onClick={() => setDrawerOpen(true)}
              className="rounded-full p-2 text-aura-ink-soft hover:bg-aura-mist"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {drawerOpen && (
            <div className="no-print fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-aura-ink/30 backdrop-blur-sm"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-72 animate-fade-in bg-aura-paper p-4 shadow-float-lg">
                <button
                  type="button"
                  aria-label="メニューを閉じる"
                  onClick={() => setDrawerOpen(false)}
                  className="absolute right-3 top-3 rounded-full p-2 text-aura-ink-muted hover:bg-aura-mist"
                >
                  <X className="h-5 w-5" />
                </button>
                <SidebarBody userName={userName} onLogout={logout} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          )}

          <main className="relative z-10 px-4 py-6 md:px-10 md:py-10 min-[1280px]:px-16">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
