'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Expand, History, LogOut, PanelBottom, Settings, Stethoscope } from 'lucide-react';
import { api, clearToken } from '@/lib/api-client';
import { expandToFullWindow, openAsPanelWindow, snapToPanelWindow } from '@/lib/panel-window';
import { useUiMode } from './ui-mode-provider';
import { DemoBanner } from './demo-banner';
import { AiStatusBanner } from './ai-status-banner';

export function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setMode } = useUiMode();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    void api
      .me()
      .then((user) => setUserName(user.name))
      .catch(() => setUserName(''));
  }, []);

  useEffect(() => {
    snapToPanelWindow();
  }, []);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  function expandToFull() {
    setMode('full');
    expandToFullWindow();
    router.push('/history');
  }

  function resnapPanel() {
    setMode('compact');
    const stay = openAsPanelWindow(window.location.pathname + window.location.search);
    if (stay) snapToPanelWindow();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DemoBanner />
      <AiStatusBanner />
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-slate-900">Medical OS</p>
            <p className="truncate text-[11px] text-slate-500">{userName || 'くしま内科'}</p>
          </div>
          <button
            type="button"
            onClick={resnapPanel}
            className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-700"
            aria-label="右下パネルに固定"
            title="右下 1/4 に固定"
          >
            <PanelBottom className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={expandToFull}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="フル画面に拡大"
            title="フル画面（履歴・設定）"
          >
            <Expand className="h-4 w-4" />
          </button>
          <Link
            href="/history"
            onClick={() => setMode('full')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="履歴"
            title="履歴"
          >
            <History className="h-4 w-4" />
          </Link>
          <Link
            href="/settings"
            onClick={() => setMode('full')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="設定"
            title="設定"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
            aria-label="ログアウト"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 px-3 py-3 pb-6">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
