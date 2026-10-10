import Link from 'next/link';

/**
 * 管理画面の枠。診療の画面（AppShell）とは別の入口にして、診察の最中に開く画面へ数字が混ざらないようにする。
 * 診療のメニューからはリンクしない（URLを直接開く）。
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">管理</span>
            <span className="text-sm font-semibold text-slate-900">Medical OS 管理画面</span>
          </div>
          <Link href="/home" className="text-sm text-brand-700 underline-offset-2 hover:underline">
            診療画面へ戻る
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
