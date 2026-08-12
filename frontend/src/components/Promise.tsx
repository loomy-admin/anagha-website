'use client';

import { motion } from 'framer-motion';

const ITEMS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15l-3-3m0 0l3-3m-3 3h8M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
      </svg>
    ),
    label: '100% Certified Jewellery',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="6"/>
        <path d="M20 20l-4-4"/>
      </svg>
    ),
    label: '100% Transparency',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 10v6h3m3 0h6m3 0h3v-4l-3-3h-4v7m-8 0a2 2 0 104 0m4 0a2 2 0 104 0M3 10V6h11v10"/>
      </svg>
    ),
    label: 'Free Shipping',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
      </svg>
    ),
    label: 'No Compromise On Ethics',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="14" r="5" />
        <path d="M10 9l2-4 2 4M6 14h1m10 0h1" />
      </svg>
    ),
    label: 'A world of designs',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    ),
    label: 'Personalised Video Consultations',
  }
];

export default function PromiseSection({ labels }: { labels?: string[] }) {
  const finalLabels = labels && labels.length === 6 ? labels : ITEMS.map(item => item.label);

  return (
    <section className="bg-white py-12 md:py-16 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="max-w-[1500px] mx-auto px-4 lg:pl-10 lg:pr-6 w-full relative"
      >
        <motion.div 
          variants={{
            hidden: { x: "50%", opacity: 0 },
            visible: { x: 0, opacity: 1, transition: { duration: 1.4, ease: [0.23, 1, 0.32, 1] } }
          }}
          className="flex flex-col lg:flex-row items-center justify-between w-full"
        >
          {/* Left Titling */}
          <div className="w-full lg:w-[45%] flex justify-start lg:justify-end pr-0 lg:pr-[140px] relative z-10 mb-12 lg:mb-0">
            <h2 className="text-[#032C5E] font-domine text-[42px] sm:text-[48px] lg:text-[80px] leading-[1.05] font-medium text-left lg:text-right relative">
              Anagha<br />
              <span className="relative inline-flex items-center">
                Promis
                <span className="relative">
                  e
                </span>
              </span>
            </h2>
          </div>

          {/* Right Info Box */}
          <div className="w-full lg:w-[55%] relative z-0">
            <div className="border border-[#032C5E]/60 rounded-[20px] bg-white px-[16px] py-[16px] md:px-[24px] md:py-[24px] lg:px-[28px] lg:py-[28px] relative overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
              
              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-[32px] gap-x-[16px] relative z-20">
                {ITEMS.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center">
                    {/* Circle Icon - NO SHADOWS, NO ANIMATIONS */}
                    <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] shrink-0 bg-[#032C5E] text-white rounded-full flex flex-col items-center justify-center mb-4 [&_svg]:w-[32px] [&_svg]:h-[32px]">
                      {item.icon}
                    </div>
                    {/* Label */}
                    <h4 
                      className="text-[#032C5E] font-inter text-[14px] sm:text-[15px] font-semibold leading-[1.3] px-2"
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {finalLabels[idx]}
                    </h4>
                  </div>
                ))}
              </div>
              
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
