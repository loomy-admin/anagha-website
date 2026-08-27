'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, updateMe, type WebsiteCustomer } from '@/lib/auth';

export default function AccountProfile() {
  const router = useRouter();
  const [customer, setCustomer] = useState<WebsiteCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace(`/account/login?next=${encodeURIComponent('/account/profile')}`);
          return;
        }
        setCustomer(me);
        setName(me.name || '');
        setMobile(me.mobile || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const updated = await updateMe({ name, mobile });
        setCustomer(updated);
        setSuccess('Profile updated successfully.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update profile');
      }
    });
  }

  if (loading) {
    return <div className="py-16 text-sm text-gray-500">Loading your profile…</div>;
  }

  if (!customer) return null;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="font-domine text-xl text-[#032C5E] font-bold">My Profile</h2>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-6">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-3 py-2 mb-6">
          {success}
        </p>
      ) : null}

      <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={customer.email}
              disabled
              className="w-full border border-gray-200 rounded-md px-4 py-2 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
            />
          </div>

          <div>
            <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +91
              </span>
              <input
                type="tel"
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                pattern="[0-9]{10}"
                className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-md border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending || (name === customer.name && mobile === customer.mobile)}
              className="bg-[#032C5E] text-white font-semibold uppercase tracking-wide text-sm px-6 py-2.5 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
