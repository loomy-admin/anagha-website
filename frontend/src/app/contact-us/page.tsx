'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useContactInfo } from '@/lib/contact';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0 mt-0.5 text-[#f1592a]">
    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

export default function ContactUs() {
  const { whatsapp, email, phone, corporateEmail, salesEmail, addresses } = useContactInfo();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', query: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/site/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrorMsg('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="w-full bg-white min-h-screen py-10 sm:py-16 lg:py-20 font-sans">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">

          {/* Page Title */}
          <div className="flex flex-col items-center justify-center mb-14">
            <h1 className="text-[26px] md:text-[32px] font-domine font-bold tracking-wide text-[#222] uppercase text-center mb-4">
              CONTACT <span className="text-[#f1592a]">US</span>
            </h1>
            <div className="flex items-center w-full max-w-[600px] gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="w-[7px] h-[7px] rounded-full bg-[#f1592a] shrink-0"></div>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
          </div>


          {/* ── Two Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

            {/* ── LEFT: Contact Info ── */}
            <div className="space-y-10">

              {/* Customer Delight */}
              <div>
                <h3 className="text-[#f1592a] font-semibold text-[15px] mb-4 font-domine">Customer Delight</h3>
                <div className="space-y-2 text-[14px] text-[#4a4a4a] leading-relaxed">
                  <p>Call us at <strong>{phone}</strong> (9 am–10 pm, 7 days a week)</p>
                  <p className="text-gray-400">or</p>
                  <p className="text-[13px] text-gray-500 font-sans mt-2">
                    Write to us at{' '}
                    <a href={`mailto:${email}`} className="text-[#4a4a4a] hover:underline">
                      {email}
                    </a>
                  </p>
                </div>
              </div>

              {/* WhatsApp Direct */}
              <div>
                <h3 className="text-[#f1592a] font-semibold text-[15px] mb-4 font-domine">WhatsApp Support</h3>
                <div className="space-y-2 text-[14px] text-[#4a4a4a] leading-relaxed">
                  <p className="text-[13px] text-gray-500 font-sans">
                    Prefer chatting? Reach us directly on WhatsApp at{' '}
                    <a
                      href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#f1592a] font-bold hover:underline"
                    >
                      {whatsapp}
                    </a>
                  </p>
                  <p className="text-gray-500 text-[13px]">
                    Available 9 am–10 pm, 7 days a week. Tap the button above for the fastest response!
                  </p>
                </div>
              </div>

              {/* Corporate Sales */}
              <div>
                <h3 className="text-[#f1592a] font-semibold text-[15px] mb-4 font-domine">Corporate Sales</h3>
                <div className="space-y-2 text-[14px] text-[#4a4a4a] leading-relaxed">
                  <p>
                    For all corporate sales related queries please write to us at{' '}
                    <a href={`mailto:${corporateEmail}`} className="text-[#4a4a4a] hover:underline">
                      {corporateEmail}
                    </a>
                  </p>
                  <p>
                    For bulk enquiries or sales associations please contact{' '}
                    <a href={`mailto:${salesEmail}`} className="text-[#4a4a4a] hover:underline">
                      {salesEmail}
                    </a>
                  </p>
                </div>
              </div>

              {/* Office Addresses */}
              {addresses && addresses.length > 0 && (
                <div>
                  <h3 className="text-[#f1592a] font-semibold text-[15px] mb-4 font-domine">Office Addresses</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[13.5px] text-[#4a4a4a] leading-relaxed">
                    {addresses.map((addr, idx) => (
                      <div key={idx}>
                        <div className="flex items-start gap-1.5 mb-2">
                          <PinIcon />
                          <span className="text-[#4a4a4a] font-semibold">Address {idx + 1}</span>
                        </div>
                        {addr.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT: Contact Form ── */}
            <div>
              <h2 className="text-[18px] font-semibold text-[#222] mb-6 uppercase tracking-wider text-[#f1592a]">
                Have A Question?
              </h2>
              <div className="w-full h-px bg-gray-200 mb-8"></div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[16px] font-semibold text-[#222]">Thank you!</p>
                  <p className="text-[14px] text-gray-500">We've received your query and will get back to you within 24 hours.</p>
                  <button onClick={() => { setSubmitted(false); setFormData({ name:'', email:'', phone:'', query:'' }); }} className="mt-2 text-[13px] text-[#f1592a] underline">Submit another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 text-[14px] text-[#4a4a4a]">
                  {/* Name */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
                    <label className="w-auto sm:w-[80px] shrink-0 sm:pt-2 text-[#4a4a4a] font-medium">Name</label>
                    <input
                      type="text"
                      placeholder="Enter name"
                      required
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="flex-1 border-0 border-b border-gray-200 outline-none py-2 text-[14px] text-[#222] placeholder-gray-300 focus:border-[#f1592a] transition-colors bg-transparent"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
                    <label className="w-auto sm:w-[80px] shrink-0 sm:pt-2 text-[#4a4a4a] font-medium">Email</label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      required
                      value={formData.email}
                      onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                      className="flex-1 border-0 border-b border-gray-200 outline-none py-2 text-[14px] text-[#222] placeholder-gray-300 focus:border-[#f1592a] transition-colors bg-transparent"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
                    <label className="w-auto sm:w-[80px] shrink-0 sm:pt-2 text-[#4a4a4a] font-medium">Phone</label>
                    <div className="flex flex-1 border-b border-gray-200 focus-within:border-[#f1592a] transition-colors">
                      <span className="text-[#4a4a4a] font-semibold pr-3 py-2 text-[14px] shrink-0">+91</span>
                      <input
                        type="tel"
                        placeholder="Enter phone"
                        value={formData.phone}
                        onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                        className="flex-1 border-0 outline-none py-2 text-[14px] text-[#222] placeholder-gray-300 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Query */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
                    <label className="w-auto sm:w-[80px] shrink-0 sm:pt-2 text-[#4a4a4a] font-medium">Query</label>
                    <textarea
                      required
                      placeholder="Enter query"
                      rows={4}
                      value={formData.query}
                      onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                      className="flex-1 border-0 border-b border-gray-200 outline-none py-2 text-[14px] text-[#222] placeholder-gray-300 focus:border-[#f1592a] transition-colors resize-none bg-transparent"
                    ></textarea>
                  </div>

                  {errorMsg && (
                    <div className="text-red-500 text-sm font-semibold">{errorMsg}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#f1592a] text-white py-4 font-bold text-[13px] tracking-widest uppercase hover:bg-[#d04a20] transition-colors rounded-sm disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Submit'}
                  </button>

                  {/* WhatsApp Banner — below submit */}
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-between gap-3 sm:gap-4 bg-[#25D366] rounded-xl px-4 sm:px-5 py-4 shadow hover:shadow-md hover:brightness-105 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 text-white min-w-0">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <WhatsAppIcon />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] sm:text-[14px] font-domine leading-tight">Connect With Us on WhatsApp</p>
                        <p className="text-white/85 text-[12px] mt-0.5">Fastest response — anytime, anywhere</p>
                      </div>
                    </div>
                    <span className="text-white font-bold text-[13px] shrink-0 group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
