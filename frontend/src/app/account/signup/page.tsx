'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { signupAccount, googleLogin } from '@/lib/auth';
import { GoogleLogin } from '@react-oauth/google';

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
      router.replace(next.startsWith('/') ? next : '/jewellery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f1592a] mb-2">
        Account
      </p>
      <h1 className="font-domine text-3xl font-bold text-[#032C5E] mb-8">Create account</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-[12px] text-gray-600">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#032C5E]"
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
            className="mt-1 w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#032C5E]"
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
            className="mt-1 w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#032C5E]"
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
            className="mt-1 w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#032C5E]"
            autoComplete="new-password"
          />
          <span className="mt-1 block text-[11px] text-gray-400">At least 8 characters</span>
        </label>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#032C5E] hover:bg-[#021f42] disabled:opacity-60 text-white font-bold text-[12px] uppercase tracking-widest py-3.5 transition-colors"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 flex items-center">
        <div className="flex-1 border-t border-gray-200"></div>
        <div className="px-3 text-xs text-gray-400 uppercase tracking-widest">Or continue with</div>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>

      <div className="mt-6 flex justify-center">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            if (submitting || !credentialResponse.credential) return;
            setSubmitting(true);
            setError(null);
            try {
              await googleLogin(credentialResponse.credential);
              router.replace(next.startsWith('/') ? next : '/jewellery');
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Google Sign Up failed');
              setSubmitting(false);
            }
          }}
          onError={() => {
            setError('Google Sign Up failed');
          }}
          shape="pill"
        />
      </div>

      <p className="mt-6 text-sm text-gray-500 text-center">
        Already have an account?{' '}
        <Link
          href={`/account/login${next !== '/jewellery' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-[#032C5E] underline"
        >
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
      <main className="min-h-[70vh] bg-[#fffbfa] px-4 py-12">
        <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading…</div>}>
          <SignupForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
