'use client';

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { CURATED_STYLES_CARDS } from '@/lib/data';
import { cmsSrc } from '@/lib/cmsAsset';

interface Props {
  liveSlots?: (string | null)[];
  liveTitles?: (string | null)[];
}

export default function CuratedStyles({ liveSlots, liveTitles }: Props) {
  const [index0, setIndex0] = useState(0);
  const [index1, setIndex1] = useState(0);
  const [index2, setIndex2] = useState(0);
  const [overrides, setOverrides] = useState<(string | null)[]>(liveSlots ? liveSlots.map(f => f ? cmsSrc(f) : null) : new Array(12).fill(null));
  const [titles,    setTitles]    = useState<(string | null)[]>(liveTitles || []);

  useEffect(() => {
    if (!liveSlots && !liveTitles) {
      fetch('/api/upload/curated')
        .then(r => r.json())
        .then(d => {
          if (d.slots) setOverrides(d.slots.map((file: string | null) => file ? cmsSrc(file) : null));
          if (d.titles) setTitles(d.titles);
        })
        .catch(() => {});
    }
  }, [liveSlots, liveTitles]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setInterval(() => setIndex0(p => (p + 1) % 4), 3000));
    
    const to1 = setTimeout(() => {
      timers.push(setInterval(() => setIndex1(p => (p + 1) % 4), 3000));
    }, 1000);
    
    const to2 = setTimeout(() => {
      timers.push(setInterval(() => setIndex2(p => (p + 1) % 4), 3000));
    }, 2000);
    
    return () => {
      timers.forEach(clearInterval);
      clearTimeout(to1);
      clearTimeout(to2);
    };
  }, []);

  const indices = [index0, index1, index2];

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section className="bg-white py-6 sm:py-10 overflow-hidden">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="w-full px-4 sm:px-8 mx-auto flex flex-col lg:flex-row items-center lg:divide-x lg:divide-[#f6e1e1]"
      >
        
        {/* LEFT COMPONENT: 3 Cards Grid */}
        <div className="lg:w-[55%] grid grid-cols-1 md:grid-cols-3 gap-5 lg:pr-8 mb-8 lg:mb-0">
          {CURATED_STYLES_CARDS.map((card, idx) => (
            <motion.div variants={itemVariants} key={idx}>
              <Link href={card.link} className="block group">
                <div className="bg-[#fff5f8] p-[10px] rounded-[18px] flex flex-col h-full hover:shadow-md transition-shadow">
                  
                  {/* Image Container with Crossfade */}
                  <div className="bg-white rounded-[12px] aspect-square overflow-hidden relative mb-4 flex items-center justify-center p-2">
                    {card.images.map((img, i) => {
                      const globalIndex = idx * 4 + i;
                      const displaySrc = overrides[globalIndex] || img;
                      return (
                        <img 
                          key={i}
                          src={displaySrc} 
                          alt={`${card.title} ${i + 1}`} 
                          className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-[1200ms] ease-in-out
                            ${i === indices[idx] ? 'opacity-100 scale-100 translate-y-0 blur-0 z-10' : 'opacity-0 scale-90 translate-y-3 blur-sm z-0'}`} 
                        />
                      );
                    })}
                  </div>

                  {/* Text Content */}
                  <div className="px-1 pb-2 flex-grow">
                    <h3 className="text-[#032C5E] font-domine text-[15px] font-semibold border-b-[1.5px] border-[#032C5E]/50 inline-block mb-2 group-hover:border-[#032C5E] transition-colors">
                      {titles[idx] || card.title}
                    </h3>
                    <p className="text-[12.5px] text-gray-500 leading-snug">
                      {card.desc}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* RIGHT COMPONENT: Gift Card Banner */}
        <motion.div variants={itemVariants} className="lg:w-[45%] lg:pl-8">
          <div className="rounded-[24px] overflow-hidden relative shadow-sm">
            {/* Background Image guarantees natural aspect ratio */}
            <img 
              src="/images/gifts/giftcard-bg.webp" 
              alt="Gift Boxes"
              className="w-full h-auto transition-transform duration-700 hover:scale-105" 
            />
            
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute bottom-[12%] left-0 w-full flex justify-center gap-4 sm:gap-5 px-4">
                <a href="#" className="w-[28%] sm:w-[130px] hover:-translate-y-1.5 transition-transform duration-300 pointer-events-auto">
                  <img src="/images/gifts/giftcard-under10k.webp" alt="Gifts Under 10k" className="w-full h-auto drop-shadow-md" />
                </a>
                <a href="#" className="w-[28%] sm:w-[130px] hover:-translate-y-1.5 transition-transform duration-300 pointer-events-auto">
                  <img src="/images/gifts/giftcard-under30k.webp" alt="Gifts Under 30k" className="w-full h-auto drop-shadow-md" />
                </a>
                <a href="#" className="w-[28%] sm:w-[130px] hover:-translate-y-1.5 transition-transform duration-300 pointer-events-auto">
                  <img src="/images/gifts/giftcard-under50k.webp" alt="Gifts Under 50k" className="w-full h-auto drop-shadow-md" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
