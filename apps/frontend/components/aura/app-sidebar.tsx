'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Users, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrimarySOAPAction } from './primary-soap-action';

/**
 * 行き先は3つだけ。「SOAPをつくる」（診療をはじめる）がホームを兼ねるので、ホームの項目は置かない。
 *   患者 … 名簿。探す・登録する・過去の診療を見る
 *   SOAP … 作ったSOAPの一覧。開いて確認・修正する
 *   書類 … 書類の種類と患者を選んで、紹介状・意見書などを作る
 */
const MAIN = [
  { href: '/patients', label: '患者', icon: Users, no: '01', match: ['/patients'] },
  { href: '/history', label: 'SOAP', icon: ClipboardList, no: '02', match: ['/history', '/panel'] },
  { href: '/documents', label: '書類', icon: FileText, no: '03', match: ['/documents'] },
] as const;

export function BrandMark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/home" aria-label="ホームへ" className={cn('flex items-center gap-2.5', className)}>
      {/* 小さなオーブ。録音画面の主役と同じ形で、ブランドの印にする */}
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-aura-cyan-300 via-aura-mint-300 to-aura-teal-400 opacity-90" />
        <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-white/70 to-transparent" />
        <span className="relative h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-aura-ink">Medical OS</p>
          <p className="text-[10px] tracking-[0.18em] text-aura-ink-muted">KUSHIMA CLINIC</p>
        </div>
      )}
    </Link>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  no,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Users;
  no?: string;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-11 items-center rounded-2xl text-[14px] font-medium',
        'transition duration-200 ease-out',
        collapsed ? 'mx-auto w-11 justify-center' : 'gap-3 px-3.5',
        active
          ? 'bg-aura-mint-50 text-aura-ink shadow-[0_1px_2px_rgb(36_48_46/0.06),0_4px_14px_-6px_rgb(31_138_133/0.35)] ring-1 ring-aura-mint-200/70'
          : 'text-aura-ink-soft hover:-translate-y-px hover:bg-white hover:text-aura-ink hover:shadow-[0_1px_2px_rgb(36_48_46/0.05),0_6px_16px_-8px_rgb(36_48_46/0.18)]',
      )}
    >
      {/* 今いる場所の印 */}
      {!collapsed && (
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-aura-teal-500 transition-all duration-200',
            active ? 'opacity-100' : 'h-2 opacity-0',
          )}
        />
      )}
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition duration-200',
          active ? 'scale-110 text-aura-teal-500' : 'text-aura-ink-muted group-hover:text-aura-teal-500',
        )}
      />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && no && (
        <span
          className={cn(
            'font-mono text-[10px] tabular-nums transition-colors',
            active ? 'text-aura-teal-500' : 'text-aura-ink-muted/60',
          )}
        >
          {no}
        </span>
      )}
    </Link>
  );
}

export function SidebarBody({
  userName,
  onLogout,
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  userName: string;
  onLogout: () => void;
  onNavigate?: () => void;
  collapsed?: boolean;
  /** 渡すと、閉じる／開くボタンを出す（スマホの引き出しでは渡さない） */
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (match: readonly string[]) =>
    match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
  // 診療の画面（録音・作成中・確認）も「SOAPをつくる」の続きなので、ここを今いる場所にする
  const startActive = pathname === '/home' || pathname.startsWith('/consultation');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex items-center pb-5 pt-1', collapsed ? 'flex-col gap-3' : 'justify-between px-2')}>
        <BrandMark compact={collapsed} />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
            title={collapsed ? 'サイドバーを開く（⌘B）' : 'サイドバーを閉じる（⌘B）'}
            className="rounded-full p-2 text-aura-ink-muted transition hover:bg-white hover:text-aura-ink hover:shadow-float"
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      <div className={collapsed ? 'flex justify-center' : 'px-1'} onClick={onNavigate}>
        <PrimarySOAPAction collapsed={collapsed} active={startActive} />
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label="メイン">
        {MAIN.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.match)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto space-y-1.5 pt-6">
        <NavItem
          href="/settings"
          label="設定"
          icon={Settings}
          active={isActive(['/settings', '/knowledge'])}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pb-1">
            <span
              title={userName || undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-aura-cyan-100 text-[12px] font-semibold text-aura-teal-600"
            >
              {(userName || '—').slice(0, 1)}
            </span>
            <button
              type="button"
              onClick={onLogout}
              aria-label="ログアウト"
              title="ログアウト"
              className="rounded-full p-2 text-aura-ink-muted transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aura-cyan-100 text-[12px] font-semibold text-aura-teal-600">
              {(userName || '—').slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium text-aura-ink">{userName || '—'}</p>
              <p className="text-[10px] text-aura-ink-muted">ログイン中</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="ログアウト"
              className="rounded-full p-2 text-aura-ink-muted transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({
  userName,
  onLogout,
  collapsed,
  onToggle,
}: {
  userName: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        'no-print sticky top-0 hidden h-dvh shrink-0 border-r border-aura-line bg-gradient-to-b from-aura-paper via-aura-paper to-aura-mist/60 p-4 transition-[width] duration-300 ease-out md:block',
        collapsed ? 'w-[4.75rem]' : 'w-[17rem]',
      )}
    >
      <SidebarBody userName={userName} onLogout={onLogout} collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}
