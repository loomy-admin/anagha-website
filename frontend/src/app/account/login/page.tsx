'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleContinueButton from '@/components/GoogleContinueButton';
import { googleLogin, loginAccount } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/jewellery';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goNext() {
    router.replace(next.startsWith('/') ? next : '/jewellery');
    router.refresh();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await loginAccount({ email: email.trim(), password });
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setSubmitting(false);
    }
  }

  async function onGoogle(accessToken: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await googleLogin({ accessToken });
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign In failed');
      setSubmitting(false);
    }
  }

  const signupHref = `/account/signup${next !== '/jewellery' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-coral">
        Account
      </p>
      <h1 className="mt-2 font-domine text-[32px] sm:text-[36px] leading-tight font-bold text-navy">
        Sign in
      </h1>

      <div className="mt-8">
        <GoogleContinueButton
          disabled={submitting}
          onSuccess={onGoogle}
          onError={() => setError('Google Sign In failed')}
        />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-[12px] text-gray-600">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-gray-600">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-coral hover:bg-coralDark disabled:opacity-60 text-white font-bold text-[12px] uppercase tracking-widest py-3.5 transition-colors"
        >
          {submitting ? 'Signing in…' : 'Continue with email'}
        </button>
      </form>

      <p className="mt-7 text-sm text-gray-500 text-center">
        Don&apos;t have an account?{' '}
        <Link href={signupHref} className="font-medium text-navy hover:text-coral transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-[#fffbfa] px-4 py-12">
        <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
