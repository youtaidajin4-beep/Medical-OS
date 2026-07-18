'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearToken } from '@/lib/api-client';
import { DemoBanner } from './demo-banner';
import { AiStatusBanner } from './ai-status-banner';

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/patients', label: '症例選択', icon: Users },
  { href: '/history', label: '履歴', icon: History },
  { href: '/settings', label: '設定', icon: Settings },
] as const;

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <h1 className="text-base font-bold tracking-tight text-slate-900">Medical OS</h1>
        <p className="text-xs text-slate-500">くしま内科</p>
      </div>
    </div>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
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
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-brand-600' : 'text-slate-400')} />
            {label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
          </Link>
        );
      })}
      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-slate-400">ログイン中</p>
          <p className="truncate text-sm font-medium text-slate-700">デモ医師</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          ログアウト
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />
      <AiStatusBanner />
      <div className="mx-auto flex max-w-7xl">
        <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
          <div className="mb-8 px-1 pt-1">
            <BrandLogo />
          </div>
          <NavLinks pathname={pathname} onLogout={logout} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
            <BrandLogo />
            <button
              type="button"
              aria-label="メニューを開く"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
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
