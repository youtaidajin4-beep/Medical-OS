import { AppShell } from '@/components/layout/app-shell';
import { MustChangePasswordGuard } from '@/components/layout/must-change-password-guard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <MustChangePasswordGuard>{children}</MustChangePasswordGuard>
    </AppShell>
  );
}
