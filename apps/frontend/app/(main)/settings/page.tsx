'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardCopy, LogOut, Settings2, UserCircle2 } from 'lucide-react';
import { api, clearToken, getToken, SINGLE_CLINIC_MODE } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isWeakPassword, WEAK_PASSWORD_MESSAGE } from '@/lib/password-policy';

const COPY_STEPS = [
  'メニュー「患者」で基本情報を登録する（その場開始でも可）',
  '「診療」で「診療を開始」→ 同意チェック → 録音',
  '診療終了後、SOAP を確認し、右下「チャット」で疑い・処方意図を書く',
  '確認済みにしたら「書類を全部作る」、またはチャットで「紹介状を作って」',
  '修正も右下チャットで指示（例: 紹介状の宛先を〇〇病院に）',
  '「SOAP をコピー」して CLINICS に貼り付ける',
] as const;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl p-8 text-sm text-slate-500">読み込み中...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mustChangePassword = searchParams.get('changePassword') === '1';
  const [rules, setRules] = useState<{
    referralRules: Array<{ trigger: string; mustInclude: string[] }>;
    fixedPhrases: { closing?: string; greeting?: string };
    medicalGlossary?: {
      drugNames: string[];
      diagnoses: string[];
      customReplacements: Array<{ wrong: string; correct: string }>;
    };
  }>({
    referralRules: [{ trigger: '脳梗塞疑い', mustInclude: ['紹介理由', '依頼事項', '経過'] }],
    fixedPhrases: {
      greeting: 'いつも大変お世話になっております。御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
      closing: 'ご高診のほどよろしくお願い申し上げます。',
    },
    medicalGlossary: {
      drugNames: [],
      diagnoses: [],
      customReplacements: [{ wrong: '', correct: '' }],
    },
  });
  const [drugNamesText, setDrugNamesText] = useState('');
  const [diagnosesText, setDiagnosesText] = useState('');
  const [mustIncludeText, setMustIncludeText] = useState('紹介理由, 依頼事項, 経過');
  const [saveMsg, setSaveMsg] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [suggestedReplacements, setSuggestedReplacements] = useState<
    Array<{ wrong: string; correct: string; count: number }>
  >([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void api.getPhysicianRules().then((data) => {
      setRules({
        ...data,
        medicalGlossary: data.medicalGlossary ?? {
          drugNames: [],
          diagnoses: [],
          customReplacements: [{ wrong: '', correct: '' }],
        },
      });
      setDrugNamesText((data.medicalGlossary?.drugNames ?? []).join(', '));
      setDiagnosesText((data.medicalGlossary?.diagnoses ?? []).join(', '));
      if (data.referralRules[0]) {
        setMustIncludeText(data.referralRules[0].mustInclude.join(', '));
      }
    }).catch(() => {});
    void api.me().then((user) => setUserEmail(user.email)).catch(() => {});
    void api.getSuggestedReplacements().then(setSuggestedReplacements).catch(() => {});
  }, [router]);

  async function addSuggestedReplacement(item: { wrong: string; correct: string }) {
    await api.addGlossaryReplacements([item]);
    const data = await api.getPhysicianRules();
    setRules({
      ...data,
      medicalGlossary: data.medicalGlossary ?? {
        drugNames: [],
        diagnoses: [],
        customReplacements: [{ wrong: '', correct: '' }],
      },
    });
    setSuggestedReplacements((prev) =>
      prev.filter((s) => !(s.wrong === item.wrong && s.correct === item.correct)),
    );
    setSaveMsg(`「${item.wrong}→${item.correct}」を語彙に追加しました`);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function saveRules() {
    const customReplacements = (rules.medicalGlossary?.customReplacements ?? [])
      .map((r) => ({ wrong: r.wrong.trim(), correct: r.correct.trim() }))
      .filter((r) => r.wrong && r.correct)
      .slice(0, 3);
    const payload = {
      ...rules,
      referralRules: [
        {
          trigger: rules.referralRules[0]?.trigger ?? '脳梗塞疑い',
          mustInclude: mustIncludeText.split(',').map((s) => s.trim()).filter(Boolean),
        },
      ],
      medicalGlossary: {
        drugNames: drugNamesText.split(',').map((s) => s.trim()).filter(Boolean),
        diagnoses: diagnosesText.split(',').map((s) => s.trim()).filter(Boolean),
        customReplacements,
      },
    };
    await api.updatePhysicianRules(payload);
    setRules(payload);
    setSaveMsg('先生ルールを保存しました');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function logout() {
    clearToken();
    router.replace('/login');
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordMsg('');
    if (newPassword.length < 8) {
      setPasswordError('新しいパスワードは8文字以上にしてください');
      return;
    }
    if (isWeakPassword(newPassword)) {
      setPasswordError(WEAK_PASSWORD_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('パスワードを変更しました');
      if (mustChangePassword) {
        router.replace('/home');
        return;
      }
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'パスワードの変更に失敗しました');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">設定</h1>
        <p className="mt-1 text-sm text-slate-500">先生独自の診療ルールと運用手順</p>
      </div>

      {mustChangePassword && !SINGLE_CLINIC_MODE && (
        <Alert variant="warning">
          初回ログインのため、安全なパスワードに変更してください。変更後、ダッシュボードへ進めます。
        </Alert>
      )}

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
            <Settings2 className="h-4 w-4 text-brand-600" />
            常用薬・診断名（音声認識精度向上）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            クリニックでよく使う薬剤名・診断名を登録すると、Whisper・辞書補正・AI校正の3段階で参照されます。
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">常用薬（カンマ区切り）</label>
            <Textarea
              value={drugNamesText}
              onChange={(e) => setDrugNamesText(e.target.value)}
              placeholder="ムコダイン, アムロジピン, メトホルミン"
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">常用診断名（カンマ区切り）</label>
            <Textarea
              value={diagnosesText}
              onChange={(e) => setDiagnosesText(e.target.value)}
              placeholder="気管支炎, 高血圧症, 2型糖尿病"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">誤認識 → 正しい表記（最大3件）</label>
            {(rules.medicalGlossary?.customReplacements ?? [{ wrong: '', correct: '' }]).map((pair, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <Input
                  value={pair.wrong}
                  onChange={(e) => {
                    const next = [...(rules.medicalGlossary?.customReplacements ?? [{ wrong: '', correct: '' }])];
                    next[index] = { ...next[index]!, wrong: e.target.value };
                    setRules({
                      ...rules,
                      medicalGlossary: {
                        drugNames: rules.medicalGlossary?.drugNames ?? [],
                        diagnoses: rules.medicalGlossary?.diagnoses ?? [],
                        customReplacements: next,
                      },
                    });
                  }}
                  placeholder="誤認識例: 無効団員"
                />
                <Input
                  value={pair.correct}
                  onChange={(e) => {
                    const next = [...(rules.medicalGlossary?.customReplacements ?? [{ wrong: '', correct: '' }])];
                    next[index] = { ...next[index]!, correct: e.target.value };
                    setRules({
                      ...rules,
                      medicalGlossary: {
                        drugNames: rules.medicalGlossary?.drugNames ?? [],
                        diagnoses: rules.medicalGlossary?.diagnoses ?? [],
                        customReplacements: next,
                      },
                    });
                  }}
                  placeholder="正しい表記: ムコダイン"
                />
              </div>
            ))}
            {(rules.medicalGlossary?.customReplacements?.length ?? 0) < 3 && (
              <Button
                variant="secondary"
                onClick={() =>
                  setRules({
                    ...rules,
                    medicalGlossary: {
                      drugNames: rules.medicalGlossary?.drugNames ?? [],
                      diagnoses: rules.medicalGlossary?.diagnoses ?? [],
                      customReplacements: [
                        ...(rules.medicalGlossary?.customReplacements ?? []),
                        { wrong: '', correct: '' },
                      ],
                    },
                  })
                }
              >
                置換ルールを追加
              </Button>
            )}
          </div>
          <Button onClick={saveRules}>語彙を保存</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-brand-600" />
            ログから提案された置換
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            音声認識パイプラインの辞書補正ログから、よく発生した誤認識ペアを提案します。
          </p>
          {suggestedReplacements.length === 0 ? (
            <p className="text-sm text-slate-500">現在、提案はありません。</p>
          ) : (
            suggestedReplacements.map((item) => (
              <div
                key={`${item.wrong}-${item.correct}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <span>
                  {item.wrong} → {item.correct}
                  <span className="ml-2 text-xs text-slate-400">({item.count}回)</span>
                </span>
                <Button variant="secondary" onClick={() => void addSuggestedReplacement(item)}>
                  語彙に追加
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCopy className="h-4 w-4 text-brand-600" />
            MEDLEY CLINICS 連携の使い方
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
              <p className="text-xs text-slate-500">
                {SINGLE_CLINIC_MODE ? '単一医院モード' : userEmail || 'doctor@demo.clinic'}
              </p>
            </div>
          </div>
          {!SINGLE_CLINIC_MODE && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className="text-sm font-medium text-slate-700">パスワード変更</p>
            {passwordMsg && <Alert variant="success">{passwordMsg}</Alert>}
            {passwordError && <Alert variant="error">{passwordError}</Alert>}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">現在のパスワード</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="8文字以上"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード（確認）</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? '変更中...' : 'パスワードを変更'}
            </Button>
            </div>
          )}
          {!SINGLE_CLINIC_MODE && (
            <Button variant="secondary" icon={<LogOut />} onClick={logout}>
              ログアウト
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
