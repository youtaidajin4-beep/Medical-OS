import { FlaskConical } from 'lucide-react';

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  return (
    <div className="no-print flex items-center justify-center gap-2 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 px-4 py-1.5 text-xs font-medium text-white">
      <FlaskConical className="h-3.5 w-3.5" />
      デモモード — AI出力はサンプルデータです。実際の診療音声とは連動しません。
    </div>
  );
}
