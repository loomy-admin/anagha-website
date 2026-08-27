'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import ErpGroupsPanel from '@/components/ErpGroupsPanel';
import HeaderNavPicker from '@/components/HeaderNavPicker';
import {
  TESTIMONIAL_REVIEWS,
  CURATED_STYLES_CARDS,
  DESIGN_LED_ITEMS,
  CATEGORY_DEFAULTS,
  PLAN_DEFAULTS,
  HERO_DEFAULT,
  OFFER_DEFAULTS,
  STANDALONE_BANNER_DEFAULT
} from '@/lib/data';
import { cmsSrc } from '@/lib/cmsAsset';

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm';
const ACCEPTED_IMG = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

/* ─── Category grid sub-component ──────────────────────────── */
function CategoryGrid({ type }: { type: 'gold' | 'silver' }) {
  const [files, setFiles] = useState<(File | null)[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch(`/api/upload/categories?type=${type}`)
      .then(r => r.json())
      .then(data => {
        const defs = CATEGORY_DEFAULTS[type];
        const len = Math.max(data.length, defs.length);
        setNames(new Array(len).fill('').map((_, i) => data[i]?.name || defs[i]?.name || ''));
        setPreviews(new Array(len).fill(null).map((_, i) =>
          data[i]?.url || data[i]?.filename ? cmsSrc(data[i]?.url || data[i]?.filename) : (defs[i]?.img || null)
        ));
        setFiles(new Array(len).fill(null));
      });
  }, [type]);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const save = async (i: number) => {
    setSaving(`${i}`);
    const fd = new FormData();
    if (files[i]) fd.append('file', files[i]!);
    fd.append('index', String(i));
    fd.append('name', names[i]);
    await fetch(`/api/upload/categories?type=${type}`, { method: 'POST', body: fd });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setSaving(null);
  };

  const reset = async (i: number) => {
    if (!confirm(`Reset slot ${i + 1}?`)) return;
    await fetch(`/api/upload/categories?type=${type}&index=${i}`, { method: 'DELETE' });
    const defs = CATEGORY_DEFAULTS[type];
    setPreviews(prev => { const n = [...prev]; n[i] = defs[i]?.img || null; return n; });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setNames(prev => { const n = [...prev]; n[i] = defs[i]?.name || ''; return n; });
  };

  const removeItem = async (i: number) => {
    if (!confirm('Remove this category entirely?')) return;
    await fetch(`/api/upload/categories?type=${type}&index=${i}&mode=delete`, { method: 'DELETE' });
    setNames(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const addSlot = () => {
    setNames(prev => [...prev, '']);
    setPreviews(prev => [...prev, null]);
    setFiles(prev => [...prev, null]);
  };

  const resetAll = async () => {
    if (!confirm(`Reset all ${type} categories to defaults?`)) return;
    await fetch(`/api/upload/categories?type=${type}`, { method: 'DELETE' });
    const defs = CATEGORY_DEFAULTS[type];
    setNames(defs.map(d => d.name));
    setPreviews(defs.map(d => d.img));
    setFiles(new Array(defs.length).fill(null));
  };

  const accent = type === 'gold'
    ? 'from-amber-400 to-yellow-500'
    : 'from-slate-400 to-gray-500';
  const cardBg = type === 'gold' ? 'bg-[#fff5f5]' : 'bg-[#f4f6f9]';

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${accent}`} />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">
            {type === 'gold' ? 'Lab Grown Diamonds' : 'Silver'} Categories
          </h2>
          <span className="text-xs text-gray-300 font-medium">({names.length} slots)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={addSlot} className="px-4 py-1.5 rounded-full border border-teal-200 text-[10px] font-black text-teal-500 uppercase hover:bg-teal-50">+ New</button>
          <button
            onClick={resetAll}
            className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-50 transition-all"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-x-5 gap-y-10">
        {names.map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 relative group/item">
            {/* Delete button (X) - Always Visible */}
            <button
              onClick={() => removeItem(i)}
              className="absolute -top-3 -right-3 w-6 h-6 bg-rose-400 border border-white rounded-full flex items-center justify-center text-[10px] text-white shadow-md z-10 hover:bg-rose-500 transition-all font-bold"
              title="Remove Item"
            >
              ✕
            </button>
            {/* Image slot */}
            <div
              onClick={() => inputRefs.current[i]?.click()}
              className={`relative w-full aspect-square rounded-[18px] cursor-pointer overflow-hidden ${cardBg}
                border border-white hover:border-gray-200 transition-all flex items-center justify-center group shadow-sm`}
            >
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="file" accept={ACCEPTED_IMG} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }}
              />
              {previews[i]
                ? <img src={previews[i]!} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-gray-200">NO IMAGE</span>
              }
              {/* hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
            </div>

            {/* Name input */}
            <input
              type="text"
              value={names[i] || ''}
              onChange={e => setNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
              placeholder="ENTER NAME"
              className="w-full text-center text-[11px] font-black text-navy border-b border-gray-200 focus:border-coral outline-none bg-transparent placeholder:text-gray-300 tracking-tight py-1"
            />

            {/* Actions */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => save(i)}
                className={`text-[10px] bg-gradient-to-r ${accent} text-white px-3 py-1.5 rounded-full font-black shadow-sm active:scale-90 transition-all`}
              >
                {saving === String(i) ? '…' : 'SAVE'}
              </button>
              <button
                onClick={() => reset(i)}
                className="text-[10px] text-gray-300 hover:text-red-400 font-black px-1.5 transition-colors"
              >
                RESET
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Section Visibility Panel ────────────────────────────── */
function SectionVisibility() {
  const [config, setConfig] = useState<Record<string, boolean> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/upload/landing/config')
      .then(r => r.json())
      .then(d => setConfig(d))
      .catch(console.error);
  }, []);

  const toggle = async (key: string) => {
    if (!config) return;
    const newConfig = { ...config, [key]: !config[key] };
    setConfig(newConfig);
    setSaving(true);
    await fetch('/api/upload/landing/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    setSaving(false);
  };

  if (!config) return null;

  const sections = [
    { key: 'hideHero', label: 'Hero Section' },
    { key: 'hideCategories', label: 'Silver Categories' },
    { key: 'hideOffers', label: 'Offers Carousel' },
    { key: 'hideCollections', label: 'Latest Collections' },
    { key: 'hideCurated', label: 'Curated Styles' },
    { key: 'hideDesignLed', label: 'Design Led' },
    { key: 'hideBanner', label: 'Standalone Banner' },
    { key: 'hideTestimonials', label: 'Testimonials' },
    { key: 'hideAbout', label: 'About Company' },
    { key: 'hidePromise', label: 'Anagha Promise' },
    { key: 'hideSilverPlan', label: 'Silver Offer Plan Banner' }
  ];

  return (
    <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-navy uppercase tracking-widest">Section Visibility</h2>
          <p className="text-sm text-gray-500 mt-1">Toggle sections ON or OFF on the public home page.</p>
        </div>
        {saving && <span className="text-xs text-navy font-bold animate-pulse">SAVING...</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {sections.map(s => (
          <div key={s.key} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">{s.label}</span>
            <button
              onClick={() => toggle(s.key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!config[s.key] ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!config[s.key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Brand Assets Panel ────────────────────────────────────── */
function BrandAssets() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/site/header').then(r => r.json()).then(d => {
      setLogoPreview(d.logoUrl || '/images/brand_logo.png');
      setIconPreview(d.logoIconUrl || '/images/logo_icon.png');
    }).catch(console.error);
  }, []);

  const uploadAsset = async (file: File, type: 'logo' | 'logo-icon') => {
    setMsg('Uploading...');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/upload/header?action=upload-${type}`, { method: 'POST', body: fd });
      const d = await res.json();
      if (d.success) {
        if (type === 'logo') setLogoPreview(d.image);
        else setIconPreview(d.image);
        setMsg('Uploaded!');
      } else {
        setMsg('Upload failed');
      }
    } catch {
      setMsg('Upload error');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-end justify-between border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Brand Assets (Logo)</h2>
        {msg && <span className="text-xs text-coral font-bold">{msg}</span>}
      </div>
      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Main Logo</label>
          <div 
            onClick={() => logoRef.current?.click()}
            className="w-[200px] h-[80px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-coral transition-all bg-gray-50 relative group"
          >
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logo'); }} />
            {logoPreview ? <img src={logoPreview} className="max-w-[80%] max-h-[80%] object-contain" /> : null}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-lg">
              <span className="text-[10px] font-bold text-navy bg-white/90 px-2 py-1 rounded">CHANGE</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Logo Icon (Small)</label>
          <div 
            onClick={() => iconRef.current?.click()}
            className="w-[80px] h-[80px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-coral transition-all bg-gray-50 relative group"
          >
            <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset(f, 'logo-icon'); }} />
            {iconPreview ? <img src={iconPreview} className="max-w-[80%] max-h-[80%] object-contain" /> : null}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-lg">
              <span className="text-[10px] font-bold text-navy bg-white/90 px-2 py-1 rounded">CHANGE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main upload page ─────────────────────────────────────── */
export default function UploadPage() {
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroIsVideo, setHeroIsVideo] = useState(false);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMsg, setHeroMsg] = useState('');
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [heroLoading, setHeroLoading] = useState(true);

  useEffect(() => {
    fetch('/api/upload/hero').then(r => r.json()).then(d => {
      if (d.url || d.filename) {
        setHeroPreview(cmsSrc(d.url || d.filename));
        setHeroIsVideo(d.type === 'video');
      } else {
        setHeroPreview(HERO_DEFAULT);
        setHeroIsVideo(false);
      }
      setHeroLoading(false);
    }).catch(() => setHeroLoading(false));
  }, []);

  const loadHero = (f: File) => {
    if (heroPreview) URL.revokeObjectURL(heroPreview);
    setHeroPreview(URL.createObjectURL(f));
    setHeroIsVideo(f.type.startsWith('video/'));
    setHeroFile(f);
  };

  const publishHero = async () => {
    if (!heroFile) return;
    setHeroSaving(true);
    const fd = new FormData();
    fd.append('file', heroFile);
    await fetch('/api/upload/hero', { method: 'POST', body: fd });
    setHeroFile(null);
    setHeroSaving(false);
    setHeroMsg('Hero published!');
  };

  const resetHero = async () => {
    if (!confirm('Reset hero to default?')) return;
    await fetch('/api/upload/hero', { method: 'DELETE' });
    setHeroPreview(HERO_DEFAULT);
    setHeroFile(null);
    setHeroIsVideo(false);
    setHeroMsg('Hero reset.');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-24">
      <Header />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 sm:space-y-20">

        <BrandAssets />

        <SectionVisibility />

        {/* ── HERO ── */}
        <section className="space-y-5">
          <div className="flex items-end justify-between border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-display font-bold text-navy uppercase tracking-widest">Hero Section</h2>
            <div className="flex items-center gap-3">
              {heroMsg && <span className="text-xs text-green-500 font-bold">{heroMsg}</span>}
              <button onClick={resetHero} className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all">Reset</button>
              {heroFile && (
                <button onClick={publishHero} disabled={heroSaving}
                  className="px-6 py-1.5 rounded-full bg-coral text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-coralDark transition-all">
                  {heroSaving ? '…' : 'Publish Hero'}
                </button>
              )}
            </div>
          </div>

          <div
            onClick={() => heroInputRef.current?.click()}
            className="relative w-full h-[360px] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-navy/30 bg-gray-50 flex items-center justify-center transition-all group"
          >
            <input ref={heroInputRef} type="file" accept={ACCEPTED} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadHero(f); }} />
            {heroPreview ? (
              <>
                {heroIsVideo
                  ? <video src={heroPreview} className="w-full h-full object-cover" autoPlay muted loop />
                  : <img src={heroPreview} alt="hero" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <span className="bg-white/90 text-navy px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">CLICK TO REPLACE</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-300 font-bold uppercase tracking-widest">No Image</span>
              </div>
            )}
          </div>
        </section>

        {/* ── SILVER / HOMEPAGE CATEGORIES (ERP groups) ── */}
        <ErpGroupsPanel
          title="Silver Categories"
          description="Homepage category grid uses live ERP inventory groups. Images are mapped on the storefront; manage stock in Octis ERP."
        />

        {/* ── SILVER OFFER PLAN ── */}
        <PlanEditor type="silver" />

        {/* ── OFFERS CAROUSEL ── */}
        <OffersEditor />

        {/* ── LATEST COLLECTIONS ── */}
        <CollectionsEditor />

        {/* ── CURATED STYLES ── */}
        <CuratedStylesEditor />

        {/* ── DESIGN LED ── */}
        <DesignLedEditor />

        {/* ── STANDALONE BANNER ── */}
        <StandaloneBannerEditor />

        {/* ── TESTIMONIALS ── */}
        <TestimonialsEditor />

        {/* ── ABOUT COMPANY ── */}
        <AboutEditor />

        {/* ── ANAGHA PROMISE ── */}
        <PromiseEditor />

        {/* ── HEADER NAV — pick up to 8 ERP groups for storefront tabs ── */}
        <HeaderNavPicker />

      </div>
    </div>
  );
}

/* ─── Offer Plan Editor ─────────────────────────────────────── */
function PlanEditor({ type }: { type: 'gold' | 'silver' }) {
  const [badge, setBadge] = useState(PLAN_DEFAULTS[type].badge);
  const [installment, setInstallment] = useState(PLAN_DEFAULTS[type].installment);
  const [suffix, setSuffix] = useState(PLAN_DEFAULTS[type].suffix);
  const [desc, setDesc] = useState(PLAN_DEFAULTS[type].desc);
  const [btnText, setBtnText] = useState(PLAN_DEFAULTS[type].btnText);
  const [btnLink, setBtnLink] = useState(PLAN_DEFAULTS[type].btnLink);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/upload/offer-plan?type=${type}`).then(r => r.json()).then(d => {
      if (d.badge) setBadge(d.badge);
      if (d.installment) setInstallment(d.installment);
      if (d.suffix) setSuffix(d.suffix);
      if (d.desc) setDesc(d.desc);
      if (d.btnText) setBtnText(d.btnText);
      if (d.btnLink) setBtnLink(d.btnLink);
    });
  }, [type]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/upload/offer-plan?type=${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge, installment, suffix, desc, btnText, btnLink }),
    });
    setSaving(false);
    setMsg('Saved!');
    setTimeout(() => setMsg(''), 2000);
  };

  const reset = async () => {
    if (!confirm('Reset to default?')) return;
    await fetch(`/api/upload/offer-plan?type=${type}`, { method: 'DELETE' });
    const def = PLAN_DEFAULTS[type];
    setBadge(def.badge);
    setInstallment(def.installment);
    setSuffix(def.suffix);
    setDesc(def.desc);
    setBtnText(def.btnText);
    setBtnLink(def.btnLink);
    setMsg('Reset!');
    setTimeout(() => setMsg(''), 2000);
  };

  const accent = type === 'gold' ? 'from-amber-400 to-yellow-500' : 'from-slate-400 to-gray-500';
  const bannerBg = type === 'gold' ? 'bg-[#fff0f3]' : 'bg-[#f0f3ff]';
  const highlight = type === 'gold' ? 'text-coral' : 'text-slate-400';
  const btnColor = type === 'gold' ? 'bg-coral' : 'bg-slate-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${accent}`} />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">
            {type === 'gold' ? 'Lab Grown Diamonds' : 'Silver'} Offer Plan Banner
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-green-500 font-bold">{msg}</span>}
          <button onClick={reset} className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50">Reset</button>
          <button onClick={save} disabled={saving} className={`px-5 py-1.5 rounded-full bg-gradient-to-r ${accent} text-white text-[10px] font-black uppercase shadow-md`}>
            {saving ? '…' : 'Save Plan'}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div
        style={type === 'gold' ? {
          backgroundImage: [
            'linear-gradient(to right, transparent 0%, rgba(180,110,140,0.25) 30%, rgba(180,110,140,0.25) 70%, transparent 100%)',
            'linear-gradient(to right, transparent 0%, rgba(180,110,140,0.25) 30%, rgba(180,110,140,0.25) 70%, transparent 100%)',
            'linear-gradient(to right, #ffffff 0%, #fffafa 20%, #fff5f5 50%, #fffafa 80%, #ffffff 100%)',
          ].join(','),
          backgroundSize: '100% 1px, 100% 1px, 100% 100%',
          backgroundPosition: 'top, bottom, center',
          backgroundRepeat: 'no-repeat',
        } : {
          backgroundImage: [
            'linear-gradient(to right, transparent 0%, rgba(100,120,155,0.2) 30%, rgba(100,120,155,0.2) 70%, transparent 100%)',
            'linear-gradient(to right, transparent 0%, rgba(100,120,155,0.2) 30%, rgba(100,120,155,0.2) 70%, transparent 100%)',
            'linear-gradient(to right, #f8fafc 0%, #f2f5f9 20%, #e8eef5 50%, #f2f5f9 80%, #f8fafc 100%)',
          ].join(','),
          backgroundSize: '100% 1px, 100% 1px, 100% 100%',
          backgroundPosition: 'top, bottom, center',
          backgroundRepeat: 'no-repeat',
        }}
        className="flex items-center justify-center gap-6 w-full py-3.5"
      >
        <p className="text-[13.5px] text-navy">
          <span className="font-bold">{badge} </span>
          <span className={`font-extrabold ${highlight}`}>{installment}</span>
          <span className="font-bold"> {suffix}</span>
          <span className="text-gray-400 font-normal text-[13px] ml-1.5">({desc})</span>
        </p>
        <span className={`shrink-0 px-6 py-2 rounded-lg text-[13px] font-bold text-white shadow-sm ${btnColor}`}>{btnText}</span>
      </div>

      {/* Fields — only editable parts */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Badge / Prefix</label>
            <input value={badge || ''} onChange={e => setBadge(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Highlight (Installment)</label>
            <input value={installment || ''} onChange={e => setInstallment(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Suffix</label>
            <input value={suffix || ''} onChange={e => setSuffix(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Description</label>
          <input value={desc || ''} onChange={e => setDesc(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Button Text</label>
            <input value={btnText || ''} onChange={e => setBtnText(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-semibold outline-none focus:border-coral bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Button Link</label>
            <input value={btnLink || ''} onChange={e => setBtnLink(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Offers Carousel Editor ─────────────────────────────────── */
const OFFER_FALLBACKS = OFFER_DEFAULTS;

function OffersEditor() {
  const [files, setFiles] = useState<(File | null)[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/upload/offers').then(r => r.json()).then((slotsRes: (string | null)[]) => {
      const slots = Array.isArray(slotsRes) ? slotsRes : [];
      const len = Math.max(slots.length, OFFER_FALLBACKS.length);
      setPreviews(new Array(len).fill(null).map((_, i) => slots[i] ? cmsSrc(slots[i]) : (OFFER_FALLBACKS[i] || null)));
      setFiles(new Array(len).fill(null));
    }).catch(() => {
      setPreviews(OFFER_FALLBACKS);
      setFiles(new Array(OFFER_FALLBACKS.length).fill(null));
    });
  }, []);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const save = async (i: number) => {
    if (!files[i]) return;
    setSaving(i);
    const fd = new FormData();
    fd.append('file', files[i]!);
    fd.append('index', String(i));
    await fetch('/api/upload/offers', { method: 'POST', body: fd });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setSaving(null);
  };

  const reset = async (i: number) => {
    if (!confirm(`Reset offer ${i + 1} to default?`)) return;
    await fetch(`/api/upload/offers?index=${i}`, { method: 'DELETE' });
    setPreviews(prev => { const n = [...prev]; n[i] = OFFER_FALLBACKS[i]; return n; });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
  };

  const removeSlide = async (i: number) => {
    if (!confirm('Remove this slide?')) return;
    await fetch(`/api/upload/offers?index=${i}&mode=delete`, { method: 'DELETE' });
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const addSlide = () => {
    setPreviews(prev => [...prev, null]);
    setFiles(prev => [...prev, null]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Offers Carousel</h2>
          <span className="text-xs text-gray-300 font-medium">({previews.length} slides)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={addSlide} className="px-4 py-1.5 rounded-full border border-rose-200 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50">+ New</button>
          <button
            onClick={async () => {
              if (!confirm('Reset all offer slides to defaults?')) return;
              await fetch(`/api/upload/offers`, { method: 'DELETE' });
              setPreviews([...OFFER_FALLBACKS]);
              setFiles(new Array(OFFER_FALLBACKS.length).fill(null));
            }}
            className="px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {previews.map((_, i) => (
          <div key={i} className="flex flex-col gap-2 relative group/item">
            {/* Delete button (X) - Always Visible */}
            <button
              onClick={() => removeSlide(i)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-rose-400 border-2 border-white rounded-full flex items-center justify-center text-xs text-white shadow-lg z-10 hover:bg-rose-500 transition-all font-bold"
              title="Remove Slide"
            >
              ✕
            </button>
            {/* Preview */}
            <div
              onClick={() => inputRefs.current[i]?.click()}
              className="relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer
                bg-gray-50 border-2 border-dashed border-gray-200 hover:border-navy/30 group transition-all flex items-center justify-center"
            >
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="file" accept={ACCEPTED_IMG} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }}
              />
              {previews[i]
                ? <img src={previews[i]!} alt="" className="w-full h-full object-cover" />
                : (
                  <div className="flex flex-col items-center gap-1 text-gray-300">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Drop image</p>
                  </div>
                )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/40 px-3 py-1 rounded-full">REPLACE</span>
              </div>
              <span className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                SLIDE {i + 1}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => save(i)}
                disabled={!files[i]}
                className="flex-1 text-[10px] bg-gradient-to-r from-rose-400 to-pink-500 text-white py-1.5 rounded-full font-black shadow-sm disabled:opacity-30 transition-all"
              >
                {saving === i ? '…' : 'SAVE'}
              </button>
              <button
                onClick={() => reset(i)}
                className="text-[10px] text-gray-300 hover:text-red-400 font-black px-2 transition-colors"
              >
                RESET
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Latest Collections Editor ─────────────────────────────── */
const COLLECTION_DEFAULTS = [
  '/images/collections/latest_1.webp',
  '/images/collections/latest_2.webp',
  '/images/collections/latest_3.webp',
];
const COLLECTION_LABELS = ['Left Card', 'Center Card (Featured)', 'Right Card'];

function CollectionsEditor() {
  const [files, setFiles] = useState<(File | null)[]>(new Array(3).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(new Array(3).fill(null).map((_, i) => COLLECTION_DEFAULTS[i]));
  const [btnLink, setBtnLink] = useState('#');
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/upload/collections').then(r => r.json()).then((d: { slots: (string | null)[], btnLink?: string }) => {
      if (d.slots) setPreviews(new Array(3).fill(null).map((_, i) => d.slots[i] ? cmsSrc(d.slots[i]) : COLLECTION_DEFAULTS[i]));
      if (d.btnLink) setBtnLink(d.btnLink);
    });
  }, []);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const save = async (i: number) => {
    if (!files[i]) return;
    setSaving(i);
    const fd = new FormData();
    fd.append('file', files[i]!);
    fd.append('index', String(i));
    fd.append('btnLink', btnLink);
    await fetch('/api/upload/collections', { method: 'POST', body: fd });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setSaving(null);
    setMsg('Saved!'); setTimeout(() => setMsg(''), 2000);
  };

  const reset = async (i: number) => {
    if (!confirm(`Reset ${COLLECTION_LABELS[i]} to default?`)) return;
    await fetch(`/api/upload/collections?index=${i}`, { method: 'DELETE' });
    setPreviews(prev => { const n = [...prev]; n[i] = COLLECTION_DEFAULTS[i]; return n; });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-coral to-pink-400" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Latest Collections</h2>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-green-500 font-bold">{msg}</span>}
          <button
            onClick={async () => {
              if (!confirm('Reset all collection slots to defaults?')) return;
              await Promise.all([0, 1, 2].map(i => fetch(`/api/upload/collections?index=${i}`, { method: 'DELETE' })));
              setPreviews(new Array(3).fill(null));
              setFiles(new Array(3).fill(null));
            }}
            className="px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Button link */}
      <div className="flex items-center gap-3">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0">Browse Button Link</label>
        <input value={btnLink || ''} onChange={e => setBtnLink(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy outline-none focus:border-coral bg-white flex-1" />
      </div>

      {/* 3 image slots */}
      <div className="grid grid-cols-3 gap-5 items-end">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{COLLECTION_LABELS[i]}</p>
            <div
              onClick={() => inputRefs.current[i]?.click()}
              className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-gray-50
                border-2 border-dashed border-gray-200 hover:border-coral/50 group transition-all
                flex items-center justify-center"
              style={{ aspectRatio: '16/10' }}
            >
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="file" accept={ACCEPTED_IMG} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }}
              />
              {previews[i]
                ? <img src={previews[i]!} alt="" className="w-full h-full object-cover" />
                : (
                  <div className="flex flex-col items-center gap-1 text-gray-300">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Drop image</p>
                  </div>
                )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-black/40 px-3 py-1 rounded-full">REPLACE</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => save(i)} disabled={!files[i]}
                className="flex-1 text-[10px] bg-gradient-to-r from-coral to-pink-400 text-white py-1.5 rounded-full font-black shadow-sm disabled:opacity-30 transition-all">
                {saving === i ? '…' : 'SAVE'}
              </button>
              <button onClick={() => reset(i)}
                className="text-[10px] text-gray-300 hover:text-red-400 font-black px-2 transition-colors">
                RESET
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Curated Styles Editor ─────────────────────────────────── */
const CURATED_LABELS = CURATED_STYLES_CARDS.map(c => c.title);
const ACCEPTED_IMG_CURATED = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

function CuratedStylesEditor() {
  const [files, setFiles] = useState<(File | null)[]>(new Array(12).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(new Array(12).fill(null));
  const [titles, setTitles] = useState<string[]>([...CURATED_LABELS]);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingTitle, setSavingTitle] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/upload/curated').then(r => r.json()).then((d: { slots: (string | null)[], titles: string[] }) => {
      if (d.slots) {
        setPreviews(new Array(12).fill(null).map((_, i) => {
          if (d.slots[i]) return cmsSrc(d.slots[i]);
          const groupIdx = Math.floor(i / 4);
          const subIdx = i % 4;
          return CURATED_STYLES_CARDS[groupIdx].images[subIdx];
        }));
      }
      if (d.titles) setTitles(d.titles.map((t: string, i: number) => t || CURATED_LABELS[i]));
    });
  }, []);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const save = async (i: number) => {
    if (!files[i]) return;
    setSaving(i);
    const fd = new FormData();
    fd.append('file', files[i]!);
    fd.append('index', String(i));
    await fetch('/api/upload/curated', { method: 'POST', body: fd });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setSaving(null);
  };

  const saveTitle = async (groupIndex: number) => {
    setSavingTitle(groupIndex);
    const fd = new FormData();
    fd.append('title', titles[groupIndex]);
    fd.append('titleIndex', String(groupIndex));
    await fetch('/api/upload/curated', { method: 'POST', body: fd });
    setSavingTitle(null);
  };

  const reset = async (i: number) => {
    if (!confirm(`Reset slot ${i + 1} to default?`)) return;
    await fetch(`/api/upload/curated?index=${i}`, { method: 'DELETE' });
    setPreviews(prev => {
      const n = [...prev];
      const groupIdx = Math.floor(i / 4);
      const subIdx = i % 4;
      n[i] = CURATED_STYLES_CARDS[groupIdx].images[subIdx];
      return n;
    });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Curated Styles</h2>
          <span className="text-xs text-gray-300 font-medium">(12 revolving slots)</span>
        </div>
        <button
          onClick={async () => {
            if (!confirm('Reset all 12 slots to defaults?')) return;
            await Promise.all(Array.from({ length: 12 }).map((_, i) => fetch(`/api/upload/curated?index=${i}`, { method: 'DELETE' })));
            setPreviews(new Array(12).fill(null));
            setFiles(new Array(12).fill(null));
          }}
          className="px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[0, 1, 2].map(group => (
          <div key={group} className="flex flex-col gap-4 border border-gray-100 p-4 rounded-xl bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-gray-50 pb-3">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Group Title</label>
              <div className="flex gap-2">
                <input value={titles[group] || ''} onChange={e => {
                  const val = e.target.value;
                  setTitles(prev => { const n = [...prev]; n[group] = val; return n; });
                }} className="flex-1 text-[11px] font-bold text-navy outline-none border border-gray-200 rounded px-2 py-1 focus:border-purple-300" />
                <button onClick={() => saveTitle(group)} className="text-[9px] font-black bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 shadow-sm transition-all uppercase">
                  {savingTitle === group ? '…' : 'SAVE'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(sub => {
                const i = (group * 4) + sub;
                return (
                  <div key={i} className="flex flex-col gap-2">
                    <div
                      onClick={() => inputRefs.current[i]?.click()}
                      className="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-purple-300 group transition-all flex items-center justify-center p-2"
                    >
                      <input ref={el => { inputRefs.current[i] = el; }} type="file" accept={ACCEPTED_IMG_CURATED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }} />
                      {previews[i]
                        ? <img src={previews[i]!} alt="" className="w-full h-full object-contain drop-shadow-sm" />
                        : <span className="text-[10px] font-black text-gray-300 uppercase">+ Slot {sub + 1}</span>
                      }
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 bg-black/40 px-2 py-1 rounded-full">REPLACE</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => save(i)} disabled={!files[i]} className="flex-1 text-[9px] bg-gradient-to-r from-purple-400 to-indigo-500 text-white py-1.5 rounded-full font-black shadow-sm disabled:opacity-30">
                        {saving === i ? '…' : 'SAVE'}
                      </button>
                      <button onClick={() => reset(i)} className="text-[9px] text-gray-300 hover:text-red-400 font-black px-1.5">RESET</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Design Led Editor ─────────────────────────────────────── */
const DESIGN_LED_DEFAULT_LABELS = DESIGN_LED_ITEMS.map(i => i.label);

function DesignLedEditor() {
  const [files, setFiles] = useState<(File | null)[]>(new Array(6).fill(null));
  const [previews, setPreviews] = useState<(string | null)[]>(new Array(6).fill(null).map((_, i) => {
    const groupIdx = Math.floor(i / 2);
    const isSmall = i % 2 === 1;
    return isSmall ? DESIGN_LED_ITEMS[groupIdx].smallImg : DESIGN_LED_ITEMS[groupIdx].largeImg;
  }));
  const [labels, setLabels] = useState<string[]>([...DESIGN_LED_DEFAULT_LABELS]);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingLabel, setSavingLabel] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/upload/design-led').then(r => r.json()).then(d => {
      if (d.images) {
        setPreviews(new Array(6).fill(null).map((_, i) => {
          if (d.images[i]) return cmsSrc(d.images[i]);
          const groupIdx = Math.floor(i / 2);
          const isSmall = i % 2 === 1;
          return isSmall ? DESIGN_LED_ITEMS[groupIdx].smallImg : DESIGN_LED_ITEMS[groupIdx].largeImg;
        }));
      }
      if (d.labels) setLabels(d.labels.map((L: string, i: number) => L || DESIGN_LED_DEFAULT_LABELS[i]));
    });
  }, []);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const saveContent = async (i: number, isImage: boolean) => {
    const fd = new FormData();
    if (isImage) {
      if (!files[i]) return;
      setSaving(i);
      fd.append('file', files[i]!);
      fd.append('index', String(i));
    } else {
      setSavingLabel(i);
      fd.append('labelIndex', String(i));
      fd.append('label', labels[i]);
    }
    await fetch('/api/upload/design-led', { method: 'POST', body: fd });
    if (isImage) {
      setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
      setSaving(null);
    } else {
      setSavingLabel(null);
    }
  };

  const resetAll = async () => {
    if (!confirm('Reset DesignLed entirely?')) return;
    await fetch(`/api/upload/design-led`, { method: 'DELETE' });
    setPreviews(new Array(6).fill(null).map((_, i) => {
      const groupIdx = Math.floor(i / 2);
      const isSmall = i % 2 === 1;
      return isSmall ? DESIGN_LED_ITEMS[groupIdx].smallImg : DESIGN_LED_ITEMS[groupIdx].largeImg;
    }));
    setFiles(new Array(6).fill(null));
    setLabels([...DESIGN_LED_DEFAULT_LABELS]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Design Led</h2>
          <span className="text-xs text-gray-300 font-medium">(3 Groups)</span>
        </div>
        <button onClick={resetAll} className="px-4 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50">
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[0, 1, 2].map(group => (
          <div key={group} className="flex flex-col gap-4 border border-gray-100 p-4 rounded-xl bg-white shadow-sm">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Group Label</label>
              <div className="flex gap-2">
                <input value={labels[group] ?? ''} onChange={e => {
                  const val = e.target.value;
                  setLabels(prev => { const n = [...prev]; n[group] = val; return n; });
                }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none w-full text-navy font-semibold" />
                <button onClick={() => saveContent(group, false)} className="px-3 rounded-lg bg-teal-500 hover:bg-teal-600 transition-colors text-white text-[10px] font-bold">
                  {savingLabel === group ? '…' : 'SAVE'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* Large and Small Images side-by-side */}
              {[0, 1].map(sub => {
                const i = group * 2 + sub;
                const isLarge = sub === 0;
                return (
                  <div key={sub} className="flex flex-col justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">{isLarge ? 'Background' : 'Foreground'}</p>
                    <div onClick={() => inputRefs.current[i]?.click()} className={`relative w-full cursor-pointer bg-white overflow-hidden rounded-md flex items-center justify-center border border-gray-100 hover:border-teal-400 transition-colors ${isLarge ? 'aspect-[4/5]' : 'aspect-square bg-gray-50/50'}`}>
                      <input ref={el => { inputRefs.current[i] = el; }} type="file" accept={ACCEPTED_IMG_CURATED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }} />
                      {previews[i]
                        ? <img src={previews[i]!} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Click to browse</span>
                      }
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveContent(i, true)} disabled={!files[i]} className="flex-1 text-[9px] uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 transition-colors text-white py-1.5 rounded disabled:opacity-30 font-bold">
                        {saving === i ? '…' : 'Upload'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Standalone Banner Editor ─────────────────────────────────────── */
function StandaloneBannerEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/upload/standalone-banner').then(r => r.json()).then(d => {
      setPreview(d.banner ? cmsSrc(d.banner) : STANDALONE_BANNER_DEFAULT);
    });
  }, []);

  const loadFile = (f: File) => {
    setPreview(URL.createObjectURL(f));
    setFile(f);
  };

  const publish = async () => {
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('file', file);
    await fetch('/api/upload/standalone-banner', { method: 'POST', body: fd });
    setFile(null);
    setSaving(false);
  };

  const reset = async () => {
    if (!confirm('Reset banner to default?')) return;
    await fetch('/api/upload/standalone-banner', { method: 'DELETE' });
    setPreview(STANDALONE_BANNER_DEFAULT);
    setFile(null);
  };

  return (
    <section className="space-y-5 border-t border-gray-100 pt-12">
      <div className="flex items-end justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Standalone Banner</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={reset} className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50 transition-all">Reset</button>
          {file && (
            <button onClick={publish} disabled={saving} className="px-6 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase shadow-md disabled:opacity-30">
              {saving ? '…' : 'Publish Banner'}
            </button>
          )}
        </div>
      </div>

      <div onClick={() => inputRef.current?.click()} className="relative w-full aspect-[21/6] rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-orange-300 bg-gray-50 flex flex-col items-center justify-center transition-all group">
        <input ref={inputRef} type="file" accept={ACCEPTED_IMG_CURATED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        {preview ? (
          <>
            <img src={preview} alt="banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <span className="bg-white/90 text-navy px-4 py-2 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 shadow-xl">REPLACE</span>
            </div>
          </>
        ) : (
          <img src={STANDALONE_BANNER_DEFAULT} alt="Default Banner" className="w-full h-full object-cover" />
        )}
      </div>
    </section>
  );
}

/* ─── Testimonials Editor ─────────────────────────────────────── */
const TESTIMONIAL_DEFAULT_NAMES = TESTIMONIAL_REVIEWS.map(r => r.name);
const TESTIMONIAL_DEFAULT_TEXTS = TESTIMONIAL_REVIEWS.map(r => r.text);

function TestimonialsEditor() {
  const [files, setFiles] = useState<(File | null)[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/upload/testimonials').then(r => r.json()).then(d => {
      const names = Array.isArray(d?.names) ? d.names : [];
      const texts = Array.isArray(d?.texts) ? d.texts : [];
      const images = Array.isArray(d?.images) ? d.images : [];
      const len = Math.max(names.length || 0, TESTIMONIAL_REVIEWS.length);
      
      setPreviews(new Array(len).fill(null).map((_, i) => images[i] ? cmsSrc(images[i]) : (TESTIMONIAL_REVIEWS[i]?.img || null)));
      setNames(new Array(len).fill('').map((_, i) => names[i] || TESTIMONIAL_DEFAULT_NAMES[i] || ''));
      setTexts(new Array(len).fill('').map((_, i) => texts[i] || TESTIMONIAL_DEFAULT_TEXTS[i] || ''));
      setFiles(new Array(len).fill(null));
    }).catch(() => {
      const len = TESTIMONIAL_REVIEWS.length;
      setPreviews(new Array(len).fill(null).map((_, i) => TESTIMONIAL_REVIEWS[i]?.img || null));
      setNames(new Array(len).fill('').map((_, i) => TESTIMONIAL_DEFAULT_NAMES[i] || ''));
      setTexts(new Array(len).fill('').map((_, i) => TESTIMONIAL_DEFAULT_TEXTS[i] || ''));
      setFiles(new Array(len).fill(null));
    });
  }, []);

  const loadFile = (f: File, i: number) => {
    setPreviews(prev => { const n = [...prev]; n[i] = URL.createObjectURL(f); return n; });
    setFiles(prev => { const n = [...prev]; n[i] = f; return n; });
  };

  const save = async (i: number) => {
    setSaving(i);
    const fd = new FormData();
    if (files[i]) fd.append('file', files[i]!);
    fd.append('index', String(i));
    fd.append('name', names[i]);
    fd.append('text', texts[i]);
    await fetch('/api/upload/testimonials', { method: 'POST', body: fd });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
    setSaving(null);
  };

  const removeTestimonial = async (i: number) => {
    if (!confirm('Remove this testimonial entirely?')) return;
    await fetch(`/api/upload/testimonials?index=${i}&mode=delete`, { method: 'DELETE' });
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setNames(prev => prev.filter((_, idx) => idx !== i));
    setTexts(prev => prev.filter((_, idx) => idx !== i));
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const reset = async (i: number) => {
    if (!confirm(`Reset Testimonial ${i + 1} to default?`)) return;
    await fetch(`/api/upload/testimonials?index=${i}`, { method: 'DELETE' });
    const d = TESTIMONIAL_REVIEWS[i];
    setPreviews(prev => { const n = [...prev]; n[i] = d?.img || null; return n; });
    setNames(prev => { const n = [...prev]; n[i] = d?.name || ''; return n; });
    setTexts(prev => { const n = [...prev]; n[i] = d?.text || ''; return n; });
    setFiles(prev => { const n = [...prev]; n[i] = null; return n; });
  };

  const addTestimonial = () => {
    setPreviews(prev => [...prev, null]);
    setNames(prev => [...prev, '']);
    setTexts(prev => [...prev, '']);
    setFiles(prev => [...prev, null]);
  };

  const resetAll = async () => {
    if (!confirm('Reset all Testimonials to defaults?')) return;
    await fetch(`/api/upload/testimonials`, { method: 'DELETE' });
    setPreviews(TESTIMONIAL_REVIEWS.map(r => r.img));
    setNames([...TESTIMONIAL_DEFAULT_NAMES]);
    setTexts([...TESTIMONIAL_DEFAULT_TEXTS]);
    setFiles(new Array(TESTIMONIAL_REVIEWS.length).fill(null));
  };

  return (
    <div className="space-y-5 border-t border-gray-100 pt-20">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Testimonials</h2>
          <span className="text-xs text-gray-300 font-medium">({names.length} cards)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={addTestimonial} className="px-4 py-1.5 rounded-full border border-blue-200 text-[10px] font-black text-blue-500 uppercase hover:bg-blue-50">+ New</button>
          <button
            onClick={resetAll}
            className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {names.map((_, i) => (
          <div key={i} className="flex flex-col gap-3 relative group/item">
            {/* Delete button (X) - Always Visible */}
            <button
              onClick={() => removeTestimonial(i)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-rose-400 border-2 border-white rounded-full flex items-center justify-center text-xs text-white shadow-lg z-10 hover:bg-rose-500 transition-all font-bold"
              title="Remove Testimonial"
            >
              ✕
            </button>
            <div
              onClick={() => inputRefs.current[i]?.click()}
              className="relative w-44 aspect-square mx-auto rounded-2xl overflow-hidden cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 hover:border-indigo-300 group transition-all flex items-center justify-center"
            >
              <input ref={el => { inputRefs.current[i] = el; }} type="file" accept={ACCEPTED_IMG} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f, i); }} />
              {previews[i]
                ? <img src={previews[i]!} alt="" className="w-full h-full object-cover" />
                : <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Image</span>
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 bg-black/40 px-3 py-1 rounded-full uppercase">Replace</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <input value={names[i] || ''} onChange={e => setNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })} placeholder="NAME" className="text-[11px] font-black text-navy border-b border-gray-100 outline-none py-1 focus:border-indigo-300 w-full" />
              <textarea value={texts[i] || ''} onChange={e => setTexts(prev => { const t = [...prev]; t[i] = e.target.value; return t; })} placeholder="TESTIMONIAL TEXT" rows={3} className="text-[10px] text-gray-500 border border-gray-100 rounded-lg p-2 outline-none focus:border-indigo-300 resize-none w-full" />
              <div className="flex gap-2">
                <button onClick={() => save(i)} className="flex-1 text-[10px] bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-1.5 rounded-full font-black shadow-sm">
                  {saving === i ? '…' : 'SAVE CARD'}
                </button>
                <button onClick={() => reset(i)} className="text-[10px] text-gray-300 hover:text-red-400 font-black px-2 transition-colors">RESET</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── About Company Editor ────────────────────────────────────── */
function AboutEditor() {
  const defaultCols = [
    { title: 'Anagha Jewellery Store - A Stellar Omnichannel Presence', text: "Anagha, founded in 2011, is one of India's largest e-commerce portals for fine jewellery. By seamlessly integrating online and physical retail channels, Anagha has transformed the way consumers experience jewellery shopping. With over 344 retail stores spread across the nation, we are committed to making exquisite fine jewellery accessible. Our omnichannel approach ensures that customers can explore Anagha's extensive collection of fine jewellery at our online jewellery store or a retail store near them. Whether browsing through the curated selection on the website or visiting one of our retail stores, customers have access to a wide range of exquisite designs crafted with precision and attention to detail." },
    { title: 'Redefining the Jewellery Shopping Experience', text: "At Anagha, we're dedicated to enhancing your jewellery shopping experience with unmatched convenience through a highly developed team that ensures every question about your products gets answered. We also have a Lifetime Exchange and Buyback Policy ensuring you can shop with the peace of mind that your investment lasts a lifetime. If you're bored of hoarding outdated gold jewellery, our Big Gold Upgrade enables you to get an instant 1% benefit over the current market gold rate on all purities, while exploring Anagha's exquisite curated collections. To benchmark your jewellery shopping experience a step further, we offer free shipping on all online orders. And in case things don't work out as planned, you can rely on a hassle-free 30 Day Free Returns Policy so you can shop without a care in the world." },
    { title: '7000+ Certified Jewellery Designs', text: "Our jewellery is certified by prestigious authorities such as BIS Hallmark, SGL, IGI, and GSI to ensure the authenticity and quality of every piece. Our extensive range of 7000+ contemporary creations across 100+ collections tells a unique story, each inspired by different facets of life. From gold and platinum to diamonds and gemstones, Anagha offers 100% certified jewellery designs, promising something to suit every mood, moment, and budget. Explore our wide range of categories, which includes gold and diamond rings, earrings, pendants, mangalsutras, bangles, engagement rings, bracelets and more." }
  ];
  const [cols, setCols] = useState<{ title: string; text: string }[]>(defaultCols);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/site/landing/content')
      .then(r => r.json())
      .then(d => {
        if (d.about && d.about.length === 3) setCols(d.about);
      })
      .catch(console.error);
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/upload/landing/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cols)
    });
    setSaving(false);
  };

  const updateCol = (i: number, field: 'title'|'text', val: string) => {
    setCols(prev => {
      const n = [...prev];
      n[i] = { ...n[i], [field]: val };
      return n;
    });
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">About Company</h2>
        </div>
        <button onClick={save} disabled={saving} className="px-6 py-2 rounded-full bg-[#032C5E] text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:opacity-90 transition-all">
          {saving ? 'Saving…' : 'Save About'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Column {i + 1} Title</label>
            <input value={col.title} onChange={e => updateCol(i, 'title', e.target.value)} className="text-sm font-semibold text-navy border border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-300 w-full" />
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">Column {i + 1} Text</label>
            <textarea value={col.text} onChange={e => updateCol(i, 'text', e.target.value)} rows={15} className="text-xs text-gray-500 border border-gray-200 rounded-lg p-3 outline-none focus:border-indigo-300 w-full resize-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Anagha Promise Editor ────────────────────────────────────── */
function PromiseEditor() {
  const defaultLabels = [
    '100% Certified Jewellery',
    '100% Transparency',
    'Free Shipping',
    'No Compromise On Ethics',
    'A world of designs',
    'Personalised Video Consultations'
  ];
  const [labels, setLabels] = useState<string[]>(defaultLabels);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/site/landing/content')
      .then(r => r.json())
      .then(d => {
        if (d.promise && d.promise.length === 6) setLabels(d.promise);
      })
      .catch(console.error);
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/upload/landing/promise', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labels)
    });
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Anagha Promise</h2>
        </div>
        <button onClick={save} disabled={saving} className="px-6 py-2 rounded-full bg-[#032C5E] text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:opacity-90 transition-all">
          {saving ? 'Saving…' : 'Save Promise'}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {labels.map((lbl, i) => (
          <div key={i} className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item {i + 1} Label</label>
            <input value={lbl} onChange={e => { const n = [...labels]; n[i] = e.target.value; setLabels(n); }} className="text-sm font-semibold text-navy border border-gray-200 rounded-lg p-2 outline-none focus:border-indigo-300 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Header Editor ─────────────────────────────────────────── */

type CategoryItem = { name: string; link: string };
type Callout = { title: string; desc: string; image: string };
type Dropdown = { categories: { title: string; items: CategoryItem[] }; callout: Callout } | null;
type NavItem = { label: string; slug: string; dropdown: Dropdown };

const ACCEPTED_IMG_HEADER = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

const DEFAULT_NAV: NavItem[] = [
  { label: 'RINGS', slug: 'rings', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Diamond Rings', link: '/jewellery/rings' }, { name: 'Gold Rings', link: '/jewellery/rings' }, { name: 'White Gold Rings', link: '/jewellery/rings' }, { name: 'Rose Gold Rings', link: '/jewellery/rings' }, { name: 'Platinum Rings', link: '/jewellery/rings' }] }, callout: { title: 'Buy Solitaire Rings', desc: 'Starting at Rs. 30,000/-', image: '/images/header/menu-solitaire-ring.v1.webp' } } },
  { label: 'EARRINGS', slug: 'earrings', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Diamond Earrings', link: '/jewellery/earrings' }, { name: 'Gold Earrings', link: '/jewellery/earrings' }, { name: 'White Gold Earrings', link: '/jewellery/earrings' }, { name: 'Rose Gold Earrings', link: '/jewellery/earrings' }, { name: 'Gemstone Earrings', link: '/jewellery/earrings' }] }, callout: { title: 'Buy Solitaire Earrings', desc: 'Starting at Rs. 45,000/-', image: '/images/header/menu-solitaire-earring.v1.webp' } } },
  { label: 'PENDANTS', slug: 'pendants', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Diamond Pendants', link: '/jewellery/pendants' }, { name: 'Gold Pendants', link: '/jewellery/pendants' }, { name: 'White Gold Pendants', link: '/jewellery/pendants' }, { name: 'Rose Gold Pendants', link: '/jewellery/pendants' }, { name: 'Gemstone Pendants', link: '/jewellery/pendants' }] }, callout: { title: 'Buy Solitaire Pendants', desc: 'Starting at Rs. 40,000/-', image: '/images/header/menu-solitaire-pendant.v1.webp' } } },
  { label: 'HARAM', slug: 'haram', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Guttapusala Haram', link: '/jewellery/haram#guttapusala-haram' }, { name: 'Kasulaperu Haram', link: '/jewellery/haram#kasulaperu-haram' }, { name: 'Pachala Haram', link: '/jewellery/haram#pachala-haram' }, { name: 'Nakshi Haram', link: '/jewellery/haram#nakshi-haram' }, { name: 'Gundla Haram', link: '/jewellery/haram#gundla-haram' }] }, callout: { title: 'Shop Silver Haram', desc: 'Explore our collection', image: '/images/header/silver-haram.jpg' } } },
  { label: 'VADDANAM', slug: 'vaddanam', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Lakshmi Vaddanam', link: '/jewellery/vaddanam' }, { name: 'Nakshi Vaddanam', link: '/jewellery/vaddanam' }, { name: 'Peacock (Mayil) Vaddanam', link: '/jewellery/vaddanam' }, { name: 'Polki Vaddanam', link: '/jewellery/vaddanam' }, { name: 'Lightweight Vaddanam', link: '/jewellery/vaddanam' }] }, callout: { title: 'Shop Silver Vaddanam', desc: 'Explore our collection', image: '/images/header/silver-vaddanam.png' } } },
  { label: 'BANGLES', slug: 'bangles', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Nakshi Bangles', link: '/jewellery/bangles' }, { name: 'Kundan Bangles', link: '/jewellery/bangles' }, { name: 'Glass Bangles', link: '/jewellery/bangles' }, { name: 'Antique Finish Bangles', link: '/jewellery/bangles' }, { name: 'Meenakari Bangles', link: '/jewellery/bangles' }] }, callout: { title: 'Shop Silver Bangles', desc: 'Explore our collection', image: '/images/header/silver-bangle.jpg' } } },
  { label: 'SOLITAIRES', slug: 'solitaires', dropdown: { categories: { title: 'By Categories', items: [{ name: 'Solitaire Rings', link: '/jewellery/solitaires' }, { name: 'Solitaire Earrings', link: '/jewellery/solitaires' }, { name: 'Solitaire Pendants', link: '/jewellery/solitaires' }] }, callout: { title: 'Shop Solitaires', desc: 'Premium Diamond Collection', image: '/images/header/solitaire-ring.v1.webp' } } },
  { label: 'ALL JEWELLERY', slug: 'all-jewellery', dropdown: null },
];

function HeaderEditor() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const calloutImgRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Load from API */
  useEffect(() => {
    fetch('/api/upload/header')
      .then(r => r.json())
      .then((data: NavItem[]) => {
        setNavItems(data.length ? data : DEFAULT_NAV);
      })
      .catch(() => setNavItems(DEFAULT_NAV));
  }, []);

  /* ── helpers ── */
  const updateLabel = (i: number, val: string) =>
    setNavItems(prev => prev.map((item, idx) => idx === i ? { ...item, label: val } : item));

  const removeTab = (i: number) => {
    const label = navItems[i]?.label || 'this tab';
    if (!window.confirm(`Remove tab "${label}"?`)) return;
    
    setNavItems(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      return next;
    });

    if (expandedTab === i) {
      setExpandedTab(null);
    } else if (expandedTab !== null && expandedTab > i) {
      setExpandedTab(expandedTab - 1);
    }
  };

  const addTab = () => {
    const newItem: NavItem = {
      label: 'NEW TAB',
      slug: `new-tab-${Date.now()}`,
      dropdown: {
        categories: { title: 'By Categories', items: [{ name: 'Category 1', link: '#' }] },
        callout: { title: 'Callout Title', desc: 'Callout description', image: '' },
      },
    };
    setNavItems(prev => [...prev, newItem]);
    setExpandedTab(navItems.length);
  };

  const updateCategoryItem = (tabIdx: number, catIdx: number, field: 'name' | 'link', val: string) => {
    setNavItems(prev => prev.map((item, i) => {
      if (i !== tabIdx || !item.dropdown) return item;
      const newItems = item.dropdown.categories.items.map((c, ci) =>
        ci === catIdx ? { ...c, [field]: val } : c
      );
      return { ...item, dropdown: { ...item.dropdown, categories: { ...item.dropdown.categories, items: newItems } } };
    }));
  };

  const addCategoryItem = (tabIdx: number) => {
    setNavItems(prev => prev.map((item, i) => {
      if (i !== tabIdx || !item.dropdown) return item;
      if (item.dropdown.categories.items.length >= 5) return item; // max 5
      const newItems = [...item.dropdown.categories.items, { name: 'New Category', link: '#' }];
      return { ...item, dropdown: { ...item.dropdown, categories: { ...item.dropdown.categories, items: newItems } } };
    }));
  };

  const removeCategoryItem = (tabIdx: number, catIdx: number) => {
    setNavItems(prev => prev.map((item, i) => {
      if (i !== tabIdx || !item.dropdown) return item;
      const newItems = item.dropdown.categories.items.filter((_, ci) => ci !== catIdx);
      return { ...item, dropdown: { ...item.dropdown, categories: { ...item.dropdown.categories, items: newItems } } };
    }));
  };

  const updateCallout = (tabIdx: number, field: keyof Callout, val: string) => {
    setNavItems(prev => prev.map((item, i) => {
      if (i !== tabIdx || !item.dropdown) return item;
      return { ...item, dropdown: { ...item.dropdown, callout: { ...item.dropdown.callout, [field]: val } } };
    }));
  };

  const uploadCalloutImage = async (tabIdx: number, file: File) => {
    /* Optimistic preview */
    const objectUrl = URL.createObjectURL(file);
    updateCallout(tabIdx, 'image', objectUrl);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('navIndex', String(tabIdx));
    const res = await fetch('/api/upload/header?action=upload-callout-image&navIndex=' + tabIdx, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.image || data.url || data.filename) {
      updateCallout(tabIdx, 'image', cmsSrc(data.image || data.url || data.filename));
    }
  };

  const save = async () => {
    setSaving(true);
    await fetch('/api/upload/header', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(navItems),
    });
    setSaving(false);
    setMsg('Saved!');
    setTimeout(() => setMsg(''), 2500);
  };

  const resetAll = async () => {
    if (!confirm('Reset header navigation to defaults?')) return;
    await fetch('/api/upload/header', { method: 'DELETE' });
    setNavItems(DEFAULT_NAV);
    setExpandedTab(null);
    setMsg('Reset to defaults.');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="space-y-6 border-t border-gray-100 pt-20">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-navy to-blue-600" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">Header</h2>
          <span className="text-xs text-gray-300 font-medium">({navItems.length} tabs)</span>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-green-500 font-bold">{msg}</span>}
          <button onClick={resetAll} className="px-5 py-1.5 rounded-full border border-gray-200 text-[10px] font-black text-gray-400 uppercase hover:bg-gray-50 transition-all">
            Reset All
          </button>
          <button onClick={addTab} className="px-4 py-1.5 rounded-full border border-navy/30 text-[10px] font-black text-navy uppercase hover:bg-navy/5 transition-all">
            + Add Tab
          </button>
        </div>
      </div>

      {/* Tab list */}
      <div className="space-y-3">
        {navItems.map((item, tabIdx) => (
          <div key={item.slug || tabIdx} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Tab row */}
            <div className="flex items-center gap-3 px-5 py-3">
              {/* Drag handle visual */}
              <span className="text-gray-200 text-lg select-none cursor-grab">⠿</span>

              {/* Label input */}
              <input
                value={item.label}
                onChange={e => updateLabel(tabIdx, e.target.value)}
                className="flex-1 text-[13px] font-black text-navy border-b border-gray-200 focus:border-navy outline-none bg-transparent py-0.5 uppercase tracking-widest"
              />

              {/* Expand / collapse toggle */}
              {item.dropdown && (
                <button
                  onClick={() => setExpandedTab(expandedTab === tabIdx ? null : tabIdx)}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1 rounded-full border border-gray-200 hover:border-navy/30 hover:text-navy transition-all"
                >
                  {expandedTab === tabIdx ? 'Collapse ▲' : 'Edit Dropdown ▼'}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeTab(tabIdx);
                }}
                className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-400 text-rose-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                title="Remove tab"
              >
                ✕
              </button>
            </div>

            {/* Dropdown editor — expanded */}
            {expandedTab === tabIdx && item.dropdown && (
              <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/60 grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* ── By Categories ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-navy uppercase tracking-widest">By Categories</h4>
                    <button
                      onClick={() => addCategoryItem(tabIdx)}
                      disabled={item.dropdown.categories.items.length >= 5}
                      className="text-[9px] font-black text-teal-500 border border-teal-200 px-2 py-1 rounded-full hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase"
                    >
                      + Add (max 5)
                    </button>
                  </div>

                  <div className="space-y-2">
                    {item.dropdown.categories.items.map((cat, catIdx) => (
                      <div key={catIdx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <span className="text-[10px] font-black text-gray-300 w-4 shrink-0">{catIdx + 1}</span>
                        <input
                          value={cat.name}
                          onChange={e => updateCategoryItem(tabIdx, catIdx, 'name', e.target.value)}
                          placeholder="Category name"
                          className="flex-1 text-[12px] text-navy font-semibold outline-none bg-transparent border-b border-transparent focus:border-navy/30 py-0.5"
                        />
                        <button
                          onClick={() => removeCategoryItem(tabIdx, catIdx)}
                          className="w-5 h-5 rounded-full bg-rose-50 hover:bg-rose-400 text-rose-400 hover:text-white flex items-center justify-center text-[9px] font-bold transition-all shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {item.dropdown.categories.items.length === 0 && (
                      <p className="text-[11px] text-gray-300 italic px-2">No categories yet. Click "+ Add" to add one.</p>
                    )}
                  </div>
                </div>

                {/* ── Callout image & text ── */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black text-navy uppercase tracking-widest">Callout</h4>

                  {/* Image upload */}
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => calloutImgRefs.current[tabIdx]?.click()}
                      className="relative w-36 h-28 rounded-lg overflow-hidden cursor-pointer bg-gray-100 border-2 border-dashed border-gray-200 hover:border-navy/30 group transition-all flex items-center justify-center shrink-0"
                    >
                      <input
                        ref={el => { calloutImgRefs.current[tabIdx] = el; }}
                        type="file"
                        accept={ACCEPTED_IMG_HEADER}
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadCalloutImage(tabIdx, f); }}
                      />
                      {item.dropdown.callout.image ? (
                        <>
                          <img src={item.dropdown.callout.image} alt="" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100">REPLACE</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-300">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" /></svg>
                          <p className="text-[9px] font-bold uppercase">Upload</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400">Click to upload<br />callout image</p>
                  </div>

                  {/* Callout title & desc */}
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Callout Title</label>
                      <input
                        value={item.dropdown.callout.title}
                        onChange={e => updateCallout(tabIdx, 'title', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-semibold outline-none focus:border-navy/40 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Callout Description</label>
                      <input
                        value={item.dropdown.callout.desc}
                        onChange={e => updateCallout(tabIdx, 'desc', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 outline-none focus:border-navy/40 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom save reminder */}
      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={saving} className="px-8 py-2.5 rounded-full bg-navy text-white text-[11px] font-black uppercase shadow-md hover:bg-navy/90 transition-all disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Header'}
        </button>
      </div>
    </div>
  );
}
