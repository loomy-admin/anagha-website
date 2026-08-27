'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

export default function AdminHome() {
  const sections = [
    {
      title: 'Landing Page',
      desc: 'Customize the main homepage content, hero banners, curated styles, and testimonials.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/landing',
      color: 'from-pink-500 to-rose-500'
    },
    {
      title: 'Jewellery Page',
      desc: 'Website jewellery catalog. Re-import from ERP when you need a fresh copy.',
      img: '/images/admin/jewellery_thumb.png',
      link: '/upload/jewellery',
      color: 'from-blue-500 to-indigo-600',
      comingSoon: false
    },
    {
      title: 'Contact Info',
      desc: 'Update the global WhatsApp number and support email address used across the site.',
      img: '/images/admin/landing_thumb.png', // Reusing an existing thumb for now
      link: '/upload/contact',
      color: 'from-orange-400 to-amber-500',
    },
    {
      title: 'Search Suggestions',
      desc: 'Configure the default Trending categories and What\'s New items in the search bar.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/search-suggestions',
      color: 'from-pink-500 to-rose-600',
    },
    {
      title: 'Orders',
      desc: 'View paid orders, pack and ship, and add courier tracking for customers.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/orders',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Shipping methods',
      desc: 'Set delivery options and charges shown at checkout.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/shipping',
      color: 'from-teal-500 to-emerald-600',
    },
    {
      title: 'Buy X Get Y',
      desc: 'Cart offers: paid pieces plus free extras. Highest matching tier wins.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/offers',
      color: 'from-orange-500 to-rose-500',
    },
    {
      title: 'Legal Policies',
      desc: 'Edit the content for the Privacy Policy and Terms & Conditions pages.',
      img: '/images/admin/landing_thumb.png',
      link: '/upload/policies',
      color: 'from-purple-500 to-fuchsia-600',
    }
  ];

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="flex flex-col items-center text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-navy mb-4"
          >
            Admin Dashboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 max-w-lg text-lg"
          >
            Welcome back. Select a section to start customizing your store experience.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <Link 
                href={section.link}
                className={`group block relative bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${section.comingSoon ? 'pointer-events-none grayscale opacity-70' : ''}`}
              >
                {/* Image Container */}
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img 
                    src={section.img} 
                    alt={section.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${section.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                  
                  {section.comingSoon && (
                    <div className="absolute top-6 right-6 bg-navy/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-md">
                      Coming Soon
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-8 lg:p-10">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-display font-bold text-navy group-hover:text-rose-600 transition-colors">
                      {section.title}
                    </h2>
                    {!section.comingSoon && (
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-rose-50 group-hover:text-rose-600 transition-all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14m-7-7l7 7-7 7"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 leading-relaxed text-sm lg:text-base">
                    {section.desc}
                  </p>
                </div>

                {/* Decorative Element */}
                <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${section.color} group-hover:w-full transition-all duration-700`} />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Tips or Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 p-8 rounded-[24px] bg-white/50 border border-gray-100 backdrop-blur-sm flex flex-col md:flex-row items-center gap-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 16v-4m0-4h.01"/>
            </svg>
          </div>
          <div>
            <h4 className="text-navy font-bold mb-1">Administrative Note</h4>
            <p className="text-gray-500 text-sm">
              All changes made in these editors are live. Please ensure assets are optimized for web performance (WebP recommended) before uploading.
            </p>
          </div>
        </motion.div>
      </main>
      
      <footer className="py-8 text-center text-gray-400 text-xs tracking-widest uppercase border-t border-gray-100">
        © 2026 Anagha Administrative Portal
      </footer>
    </div>
  );
}
