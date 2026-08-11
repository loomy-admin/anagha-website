'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';

export default function AdminContactInfo() {
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [corporateEmail, setCorporateEmail] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/site/contact')
      .then((res) => res.json())
      .then((data) => {
        setWhatsapp(data.whatsapp || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setCorporateEmail(data.corporateEmail || '');
        setSalesEmail(data.salesEmail || '');
        setInstagram(data.instagram || '');
        setYoutube(data.youtube || '');
        setAddresses(data.addresses || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/upload/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, email, phone, corporateEmail, salesEmail, instagram, youtube, addresses }),
      });
      if (res.ok) {
        setMessage('Contact info saved successfully!');
      } else {
        setMessage('Failed to save.');
      }
    } catch (err) {
      console.error(err);
      setMessage('An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[800px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/upload"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-display font-bold text-navy uppercase tracking-widest">
            Contact Info
          </h1>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          {loading ? (
            <div className="py-20 flex justify-center">
              <span className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-navy mb-2">Support Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. an@anagha.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-2">WhatsApp Number (with country code)</label>
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. +918074811800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-2">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. 18004190066"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-2">Corporate Sales Email</label>
                <input
                  type="email"
                  required
                  value={corporateEmail}
                  onChange={(e) => setCorporateEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. corporate.sales@anagha.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy mb-2">Bulk Enquiries Email</label>
                <input
                  type="email"
                  required
                  value={salesEmail}
                  onChange={(e) => setSalesEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. sales@anagha.com"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4">Social Media Links</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-navy mb-2">Instagram URL</label>
                    <input
                      type="url"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="e.g. https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-navy mb-2">YouTube URL</label>
                    <input
                      type="url"
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="e.g. https://youtube.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-navy">Office Addresses</h3>
                  <button
                    type="button"
                    onClick={() => setAddresses([...addresses, ''])}
                    className="text-sm font-bold text-rose-600 hover:text-rose-700 uppercase tracking-widest border border-rose-200 hover:border-rose-300 rounded-full px-4 py-1.5 transition-colors"
                  >
                    + Add Address
                  </button>
                </div>
                
                <div className="space-y-6">
                  {addresses.map((addr, idx) => (
                    <div key={idx} className="relative bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between mb-2">
                        <label className="block text-sm font-bold text-navy">Address {idx + 1}</label>
                        <button
                          type="button"
                          onClick={() => setAddresses(addresses.filter((_, i) => i !== idx))}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        required
                        rows={4}
                        value={addr}
                        onChange={(e) => {
                          const newAddrs = [...addresses];
                          newAddrs[idx] = e.target.value;
                          setAddresses(newAddrs);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                        placeholder="Enter multi-line address"
                      />
                    </div>
                  ))}
                  {addresses.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No office addresses added yet.</p>
                  )}
                </div>
              </div>

              {message && (
                <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-rose-600'}`}>
                  {message}
                </p>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full md:w-auto px-8 py-3 bg-navy text-white font-bold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
