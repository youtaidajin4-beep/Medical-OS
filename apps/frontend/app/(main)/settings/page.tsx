'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCopy, LogOut, Settings2, UserCircle2 } from 'lucide-react';
import { api, clearToken, getToken } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const COPY_STEPS = [
  '診療後レビュー画面で内容を確認・修正する',
  '「確認済みにする」を押す',
  '「SOAP をコピー」または「通常診療記録をコピー」を押す',
  'MEDLEY CLINICS の該当画面に貼り付ける',
  '「全書類を生成」で紹介状・診断書等を作成',
] as const;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function SettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<{
    referralRules: Array<{ trigger: string; mustInclude: string[] }>;
    fixedPhrases: { closing?: string; greeting?: string };
  }>({
    referralRules: [{ trigger: '脳梗塞疑い', mustInclude: ['紹介理由', '依頼事項', '経過'] }],
    fixedPhrases: {
      greeting: 'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
      closing: 'ご高診のほどよろしくお願い申し上げます。',
    },
  });
  const [mustIncludeText, setMustIncludeText] = useState('紹介理由, 依頼事項, 経過');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void api.getPhysicianRules().then((data) => {
      setRules(data);
      if (data.referralRules[0]) {
        setMustIncludeText(data.referralRules[0].mustInclude.join(', '));
      }
    }).catch(() => {});
  }, [router]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  async function saveRules() {
    const payload = {
      ...rules,
      referralRules: [
        {
          trigger: rules.referralRules[0]?.trigger ?? '脳梗塞疑い',
          mustInclude: mustIncludeText.split(',').map((s) => s.trim()).filter(Boolean),
        },
      ],
    };
    await api.updatePhysicianRules(payload);
    setRules(payload);
    setSaveMsg('先生ルールを保存しました');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">設定</h1>
        <p className="mt-1 text-sm text-slate-500">先生独自の診療ルールと運用手順</p>
      </div>

      {DEMO_MODE && (
        <Alert variant="info">
          デモモードでは AI 出力がサンプルデータの場合があります。パイロットでは実音声・実AIを使用します。
        </Alert>
      )}

      {saveMsg && <Alert variant="success">{saveMsg}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-brand-600" />
            紹介状ルール（先生専用AI）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            特定の診断・所見が含まれるとき、紹介状に必ず記載する項目を設定します。生成時に自動反映されます。
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">トリガー（所見・診断）</label>
            <Input
              value={rules.referralRules[0]?.trigger ?? ''}
              onChange={(e) =>
                setRules({
                  ...rules,
                  referralRules: [{ ...rules.referralRules[0]!, trigger: e.target.value }],
                })
              }
              placeholder="例: 脳梗塞疑い"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">必須記載項目（カンマ区切り）</label>
            <Input
              value={mustIncludeText}
              onChange={(e) => setMustIncludeText(e.target.value)}
              placeholder="紹介理由, 依頼事項, 経過"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">挨拶文</label>
            <Textarea
              value={rules.fixedPhrases.greeting ?? ''}
              onChange={(e) =>
                setRules({
                  ...rules,
                  fixedPhrases: { ...rules.fixedPhrases, greeting: e.target.value },
                })
              }
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">結びの定型文</label>
            <Input
              value={rules.fixedPhrases.closing ?? ''}
              onChange={(e) =>
                setRules({
                  ...rules,
                  fixedPhrases: { ...rules.fixedPhrases, closing: e.target.value },
                })
              }
            />
          </div>
          <Button onClick={saveRules}>ルールを保存</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCopy className="h-4 w-4 text-brand-600" />
            MEDLEY CLINICS へのコピー手順
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {COPY_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle2 className="h-4 w-4 text-brand-600" />
            アカウント
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">くしま内科</p>
              <p className="text-xs text-slate-500">doctor@demo.clinic</p>
            </div>
          </div>
          <Button variant="secondary" icon={<LogOut />} onClick={logout}>
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
