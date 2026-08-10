'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'national', label: '全国共通' },
  { id: 'specialty', label: '内科' },
  { id: 'clinic', label: '医院' },
  { id: 'doctor', label: '医師' },
  { id: 'mis', label: '誤変換' },
  { id: 'learn', label: '学習候補' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function KnowledgePage() {
  const [tab, setTab] = useState<TabId>('specialty');
  const [q, setQ] = useState('');
  const [terms, setTerms] = useState<Awaited<ReturnType<typeof api.listMedicalTerms>>>([]);
  const [clinic, setClinic] = useState<Awaited<ReturnType<typeof api.listClinicDictionary>>>([]);
  const [doctor, setDoctor] = useState<Awaited<ReturnType<typeof api.listDoctorDictionary>>>([]);
  const [mis, setMis] = useState<Awaited<ReturnType<typeof api.listMisrecognitions>>>([]);
  const [learn, setLearn] = useState<Awaited<ReturnType<typeof api.listLearningCandidates>>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'national' || tab === 'specialty') {
        setTerms(await api.listMedicalTerms({ q: q || undefined }));
      } else if (tab === 'clinic') {
        setClinic(await api.listClinicDictionary());
      } else if (tab === 'doctor') {
        setDoctor(await api.listDoctorDictionary());
      } else if (tab === 'mis') {
        setMis(await api.listMisrecognitions());
      } else if (tab === 'learn') {
        setLearn(await api.listLearningCandidates());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900">医療ナレッジ</h1>
        </div>
        <p className="text-sm text-slate-600">
          音声認識補正・用語正規化用（診断AIではありません）。外部マスターコードは未検証時 NULL のままです。
        </p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm',
              tab === t.id ? 'bg-white font-medium shadow-sm' : 'text-slate-600',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'national' || tab === 'specialty') && (
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="用語・読み・略語・商品名で検索"
          />
          <Button icon={<Search />} onClick={() => void reload()} disabled={loading}>
            検索
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}

      {(tab === 'national' || tab === 'specialty') && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {terms.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-slate-900">{t.canonicalName}</p>
                <p className="text-xs text-slate-500">
                  {t.category} · risk:{t.riskLevel}
                </p>
              </div>
              {t.aliases?.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  alias: {t.aliases.map((a) => `${a.alias}(${a.aliasType})`).join(' / ')}
                </p>
              )}
            </li>
          ))}
          {!loading && terms.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">
              まだシードがありません。`pnpm db:seed` または API `POST /medical-knowledge/seed` を実行してください。
            </li>
          )}
        </ul>
      )}

      {tab === 'clinic' && (
        <ul className="divide-y rounded-xl border bg-white">
          {clinic.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              {t.canonicalName}{' '}
              <span className="text-xs text-slate-500">freq {t.frequency}</span>
            </li>
          ))}
          {clinic.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">医院辞書はまだ空です。</li>
          )}
        </ul>
      )}

      {tab === 'doctor' && (
        <ul className="divide-y rounded-xl border bg-white">
          {doctor.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              「{t.spokenForm}」→「{t.preferredWrittenForm}」
            </li>
          ))}
          {doctor.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">医師辞書はまだ空です。</li>
          )}
        </ul>
      )}

      {tab === 'mis' && (
        <ul className="divide-y rounded-xl border bg-white">
          {mis.map((m, i) => (
            <li key={`${m.originalTerm}-${i}`} className="flex justify-between px-4 py-3 text-sm">
              <span>
                {m.originalTerm} → {m.correctedTerm}
              </span>
              <span className="font-medium text-slate-700">{m.count}回</span>
            </li>
          ))}
          {mis.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">誤変換ログはまだありません。</li>
          )}
        </ul>
      )}

      {tab === 'learn' && (
        <ul className="divide-y rounded-xl border bg-white">
          {learn.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {c.originalTerm} → {c.correctedTerm}（{c.occurrenceCount}回）
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await api.approveLearningCandidate(c.id);
                  void reload();
                }}
              >
                医院辞書へ承認
              </Button>
            </li>
          ))}
          {learn.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500">学習候補はありません。</li>
          )}
        </ul>
      )}
    </div>
  );
}
