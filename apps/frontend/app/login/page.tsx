'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogIn, Mail, Stethoscope } from 'lucide-react';
import { api, setToken } from '@/lib/api-client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('doctor@demo.clinic');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-50 to-transparent"
      />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Medical OS</h1>
            <p className="mt-1 text-sm text-slate-500">AI メディカルスクライブ — くしま内科</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-card"
        >
          <h2 className="text-lg font-semibold text-slate-900">ログイン</h2>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              メールアドレス
            </label>
            <Input
              id="email"
              type="email"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@demo.clinic"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              パスワード
            </label>
            <Input
              id="password"
              type="password"
              icon={<KeyRound />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
            icon={loading ? <Spinner className="text-white" /> : <LogIn />}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>

          <div className="rounded-lg bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
            デモ用アカウント: <span className="font-mono">doctor@demo.clinic</span> /{' '}
            <span className="font-mono">password123</span>
          </div>
        </form>
      </div>
    </main>
  );
}
