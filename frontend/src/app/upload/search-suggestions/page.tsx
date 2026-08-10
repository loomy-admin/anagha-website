'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { fetchCatalogFilters } from '@/lib/erpCatalog';

export default function SearchSuggestionsAdmin() {
  const [allCategories, setAllCategories] = useState<{name: string, slug: string}[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<string[]>([]);
  const [whatsNewTags, setWhatsNewTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch available categories
        const filtersData = await fetchCatalogFilters();
        const groups = filtersData?.filters?.group;
        if (Array.isArray(groups)) {
          const cats = groups.map((g: any) => ({
            name: g.name,
            slug: g.slug || g.name.replace(/[^a-z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '')
          }));
          setAllCategories(cats);
        }

        // Fetch current config
        const res = await fetch('/api/site/search-suggestions');
        if (res.ok) {
          const data = await res.json();
          setTrendingCategories(data.trendingCategories || []);
          setWhatsNewTags((data.whatsNewTags || []).join(', '));
        }
      } catch (err) {
        console.error('Error loading search suggestions config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleCategory = (slug: string) => {
    setTrendingCategories(prev => 
      prev.includes(slug) ? prev.filter(c => c !== slug) : [...prev, slug]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const tagsArray = whatsNewTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/upload/search-suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendingCategories,
          whatsNewTags: tagsArray,
        }),
      });

      if (res.ok) {
        setMessage('Search suggestions saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setMessage('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col font-sans">
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
            Search Suggestions
          </h1>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          {loading ? (
            <div className="py-20 flex justify-center">
              <span className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-8">
              
              {/* Trending Categories */}
              <div>
                <h2 className="text-lg font-bold text-navy mb-4 border-b border-gray-100 pb-2">Trending Categories</h2>
                <p className="text-sm text-gray-500 mb-4">Select up to 4 categories to display when the user opens the search bar. If none are selected, it defaults to the first 4 available.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allCategories.map(cat => (
                    <label key={cat.slug} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        checked={trendingCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="w-4 h-4 text-rose-500 rounded border-gray-300 focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* What's New Items */}
              <div>
                <h2 className="text-lg font-bold text-navy mb-4 border-b border-gray-100 pb-2">What's New Items</h2>
                <p className="text-sm text-gray-500 mb-4">Enter a comma-separated list of Item Tag Numbers (e.g. <code>TAG123, TAG456, TAG789</code>) to feature 3 items in the search dropdown.</p>
                <textarea
                  rows={3}
                  value={whatsNewTags}
                  onChange={(e) => setWhatsNewTags(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm"
                  placeholder="TAG1, TAG2, TAG3"
                />
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
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
