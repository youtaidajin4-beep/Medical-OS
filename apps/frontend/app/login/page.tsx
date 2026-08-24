'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogIn, Mail, Stethoscope } from 'lucide-react';
import { api, setToken, SINGLE_CLINIC_MODE } from '@/lib/api-client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const fieldClass =
  'border-[#d7e2dd] bg-white text-[#0c2f2c] shadow-none placeholder:text-[#9bb0aa] focus:border-[#0f766e] focus:ring-[#0f766e]/25';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (SINGLE_CLINIC_MODE) router.replace('/home');
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.accessToken);
      if (res.user.mustChangePassword) {
        router.push('/settings?changePassword=1');
      } else {
        router.push('/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#eef3f0] lg:flex-row">
      {/* Brand panel — desktop left / mobile top */}
      <section className="relative flex w-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#0c2f2c_0%,#164a45_48%,#0c2f2c_100%)] px-8 py-10 text-[#f3efe4] sm:px-12 sm:py-14 lg:w-[48%] lg:min-h-screen lg:px-14 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(232,201,138,0.18),transparent_48%),radial-gradient(ellipse_at_85%_80%,rgba(15,118,110,0.35),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full border border-[#e8c98a]/15 opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-36 h-48 w-48 rounded-full border border-[#e8c98a]/10 opacity-40"
        />

        <div className="relative animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8c98a] text-[#0c2f2c] shadow-[0_12px_30px_-12px_rgba(232,201,138,0.8)] animate-scale-in">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="mt-8 text-[11px] font-semibold tracking-[0.28em] text-[#e8c98a]">
            KUSHIMA INTERNAL MEDICINE
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Medical OS</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#d5e6e1] sm:text-base">
            診療の音声から、カルテと医療書類まで。
            <br />
            医師のための AI メディカルスクライブ。
          </p>
        </div>

        <p className="relative mt-10 hidden text-xs tracking-wide text-[#9bb8b1] lg:block">
          くしま内科 · Version 0.1
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(12,47,44,0.04),transparent_50%)]"
        />

        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-md animate-fade-in-up space-y-6 rounded-[2rem] border border-[#d7e2dd] bg-[#fbfaf6] p-8 shadow-[0_30px_70px_-40px_rgba(12,47,44,0.45)] sm:p-10"
        >
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#6f8f88]">SIGN IN</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0c2f2c]">ログイン</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6f8f88]">
              医師アカウントで診療ワークスペースへ
            </p>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#0c2f2c]">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                icon={<Mail className="text-[#6f8f88]" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@demo.clinic"
                autoComplete="email"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#0c2f2c]">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                icon={<KeyRound className="text-[#6f8f88]" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl bg-[#0c2f2c] text-[#f3efe4] shadow-[0_14px_28px_-16px_rgba(12,47,44,0.7)] hover:bg-[#164a45] hover:shadow-[0_16px_32px_-14px_rgba(12,47,44,0.75)]"
            disabled={loading}
            icon={loading ? <Spinner className="text-[#f3efe4]" /> : <LogIn className="text-[#e8c98a]" />}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </section>
    </main>
  );
}
