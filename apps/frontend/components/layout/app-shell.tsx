'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  History,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, clearToken, SINGLE_CLINIC_MODE } from '@/lib/api-client';
import { DemoBanner } from './demo-banner';
import { AiStatusBanner } from './ai-status-banner';

const NAV = [
  { href: '/home', label: '診療', icon: Stethoscope },
  { href: '/patients', label: '患者', icon: Users },
  { href: '/history', label: '履歴', icon: History },
  { href: '/knowledge', label: '医療ナレッジ', icon: BookOpen },
  { href: '/settings', label: '設定', icon: Settings },
] as const;

function BrandLogo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e8c98a] text-[#0c2f2c] shadow-sm">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className={cn('text-[10px] font-semibold tracking-[0.22em]', inverted ? 'text-[#c9ddd8]' : 'text-[#6f8f88]')}>
          KUSHIMA INTERNAL MEDICINE
        </p>
        <h1 className={cn('text-base font-semibold tracking-tight', inverted ? 'text-[#f3efe4]' : 'text-[#0c2f2c]')}>
          Medical OS
        </h1>
      </div>
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  onLogout,
  userName,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  userName: string;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-[#eef8f5] text-[#0c2f2c]'
                : 'text-slate-600 hover:bg-white hover:text-slate-900',
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-[#0f766e]' : 'text-slate-400')} />
            {label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0c2f2c]" />}
          </Link>
        );
      })}
      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-slate-400">ログイン中</p>
          <p className="truncate text-sm font-medium text-slate-700">{userName}</p>
        </div>
        {!SINGLE_CLINIC_MODE && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            ログアウト
          </button>
        )}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
    <div className="min-h-screen bg-[#eef3f0]">
      <DemoBanner />
      <AiStatusBanner />
      <div className="mx-auto flex max-w-7xl">
        <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#d7e2dd] bg-[#0c2f2c] p-4 md:flex">
          <div className="mb-8 px-1 pt-1">
            <BrandLogo inverted />
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-[#fbfaf6] p-2">
            <NavLinks pathname={pathname} onLogout={logout} userName={userName || '—'} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0c2f2c]/95 px-4 py-3 backdrop-blur md:hidden">
            <BrandLogo inverted />
            <button
              type="button"
              aria-label="メニューを開く"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-[#f3efe4] hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {drawerOpen && (
            <div className="no-print fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="absolute right-0 top-0 flex h-full w-72 animate-fade-in flex-col bg-white p-4 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <BrandLogo />
                  <button
                    type="button"
                    aria-label="メニューを閉じる"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <NavLinks
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                  onLogout={logout}
                  userName={userName || '—'}
                />
              </div>
            </div>
          )}

          <main className="p-4 md:p-8">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
