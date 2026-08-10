import { AppShell } from '@/components/layout/app-shell';

/** 旧パネルルート互換。UIは AppShell に統一。 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
