'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleContinueButton from '@/components/GoogleContinueButton';
import { googleLogin, signupAccount } from '@/lib/auth';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/jewellery';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
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
      await signupAccount({
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        password,
      });
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
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
      setError(err instanceof Error ? err.message : 'Google Sign Up failed');
      setSubmitting(false);
    }
  }

  const loginHref = `/account/login${next !== '/jewellery' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-coral">
        Account
      </p>
      <h1 className="mt-2 font-domine text-[32px] sm:text-[36px] leading-tight font-bold text-navy">
        Create account
      </h1>

      <div className="mt-8">
        <GoogleContinueButton
          disabled={submitting}
          onSuccess={onGoogle}
          onError={() => setError('Google Sign Up failed')}
        />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-[12px] text-gray-600">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-gray-600">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-gray-600">Mobile</span>
          <input
            required
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            title="Enter a 10-digit mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="tel"
            placeholder="10-digit mobile"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-gray-600">Password</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition-colors focus:border-navy"
            autoComplete="new-password"
          />
          <span className="mt-1 block text-[11px] text-gray-400">At least 8 characters</span>
        </label>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-navy hover:bg-[#021f42] disabled:opacity-60 text-white font-bold text-[12px] uppercase tracking-widest py-3.5 transition-colors"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-7 text-sm text-gray-500 text-center">
        Already have an account?{' '}
        <Link href={loginHref} className="font-medium text-navy hover:text-coral transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-[#fffbfa] px-4 py-12">
        <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading…</div>}>
          <SignupForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
