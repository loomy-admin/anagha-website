'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Header from '@/components/Header';

interface Section {
  title: string;
  body: string;
}

interface PoliciesConfig {
  privacyPolicy: Section[];
  termsConditions: Section[];
}

export default function PoliciesAdmin() {
  const [data, setData] = useState<PoliciesConfig>({ privacyPolicy: [], termsConditions: [] });
  const [activeTab, setActiveTab] = useState<'privacyPolicy' | 'termsConditions'>('privacyPolicy');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/site/policies')
      .then(res => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/site/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSections = data[activeTab];

  const updateSection = (idx: number, field: keyof Section, value: string) => {
    const newSections = [...currentSections];
    newSections[idx] = { ...newSections[idx], [field]: value };
    setData({ ...data, [activeTab]: newSections });
  };

  const addSection = () => {
    setData({
      ...data,
      [activeTab]: [...currentSections, { title: 'New Section', body: '' }]
    });
  };

  const removeSection = (idx: number) => {
    if (!confirm('Are you sure you want to remove this section?')) return;
    const newSections = [...currentSections];
    newSections.splice(idx, 1);
    setData({ ...data, [activeTab]: newSections });
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === currentSections.length - 1) return;
    
    const newSections = [...currentSections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    
    setData({ ...data, [activeTab]: newSections });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 font-sans">
          Loading policies...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/upload"
              className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-display font-bold text-navy uppercase tracking-widest">
              Legal Policies
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#f1592a] text-white rounded-md font-semibold text-sm hover:bg-[#d64518] transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100">

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 mb-8">
          <button
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'privacyPolicy' ? 'border-[#f1592a] text-[#f1592a]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('privacyPolicy')}
          >
            Privacy Policy
          </button>
          <button
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'termsConditions' ? 'border-[#f1592a] text-[#f1592a]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('termsConditions')}
          >
            Terms & Conditions
          </button>
        </div>

        {/* Editor Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800">
          <p className="font-semibold mb-1">Formatting Tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Type normally to create <strong>paragraphs</strong>.</li>
            <li>Start a line with <code className="bg-white px-1 rounded">- </code> (a dash and a space) to create a <strong>bullet point</strong>.</li>
          </ul>
        </div>

        {/* Sections List */}
        <div className="space-y-6">
          <AnimatePresence>
            {currentSections.map((section, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative group"
              >
                {/* Controls */}
                <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-navy disabled:opacity-30 rounded hover:bg-gray-100" title="Move Up">
                    ↑
                  </button>
                  <button onClick={() => moveSection(idx, 'down')} disabled={idx === currentSections.length - 1} className="p-1.5 text-gray-400 hover:text-navy disabled:opacity-30 rounded hover:bg-gray-100" title="Move Down">
                    ↓
                  </button>
                  <button onClick={() => removeSection(idx)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 ml-2" title="Remove Section">
                    ✕
                  </button>
                </div>

                <div className="space-y-4 pr-16">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Section Title</label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(idx, 'title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f1592a] focus:border-transparent outline-none font-semibold text-gray-800"
                      placeholder="e.g. 1. Introduction"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Body Text</label>
                    <textarea
                      value={section.body}
                      onChange={(e) => updateSection(idx, 'body', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f1592a] focus:border-transparent outline-none text-gray-700 min-h-[150px] leading-relaxed"
                      placeholder="Enter the section content here..."
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={addSection}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-[#f1592a] hover:text-[#f1592a] hover:bg-orange-50/30 transition-all flex items-center justify-center gap-2"
          >
            <span>+</span> Add New Section
          </button>
        </div>
        </div>
      </main>
    </div>
  );
}
