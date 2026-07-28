import { PanelShell } from '@/components/layout/panel-shell';
import { MustChangePasswordGuard } from '@/components/layout/must-change-password-guard';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell>
      <MustChangePasswordGuard>{children}</MustChangePasswordGuard>
    </PanelShell>
  );
}
