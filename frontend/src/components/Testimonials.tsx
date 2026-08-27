'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TESTIMONIAL_REVIEWS } from '@/lib/data';
import { cmsSrc } from '@/lib/cmsAsset';

interface Props {
  live?: {
    images: (string | null)[];
    names: (string | null)[];
    texts: (string | null)[];
  };
}

export default function Testimonials({ live }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const liveImages = live?.images || [];
  const liveNames  = live?.names || [];
  const liveTexts  = live?.texts || [];

  const count = Math.max(liveNames.length, TESTIMONIAL_REVIEWS.length);
  const items = Array.from({ length: count }).map((_, i) => {
    const d = TESTIMONIAL_REVIEWS[i];
    return {
      name: liveNames[i] || d?.name || '',
      text: liveTexts[i] || d?.text || '',
      img:  liveImages[i] ? cmsSrc(liveImages[i]) : (d?.img || ''),
      rotate: d?.rotate || (i % 2 === 0 ? 'rotate-2' : '-rotate-2'),
      translateY: d?.translateY || 'translate-y-0',
    };
  }).filter(it => it.name || it.text);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
    setScrollProgress(progress);
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  return (
    <section className="bg-white pt-8 sm:pt-16 pb-4 relative overflow-hidden">
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="w-full mb-12 relative"
      >
        {/* Title */}
        <motion.h2 
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
          }}
          className="text-center text-[22px] sm:text-[28px] font-domine text-[#032C5E] tracking-wide mb-6 px-4"
        >
          Customer Testimonials
        </motion.h2>

        {/* Scrollable Container */}
        <motion.div 
          variants={{
            hidden: { x: "50%", opacity: 0 },
            visible: { x: 0, opacity: 1, transition: { duration: 1.4, ease: [0.23, 1, 0.32, 1] } }
          }}
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-6 sm:gap-10 overflow-x-auto pb-16 pt-10 px-4 sm:px-8 lg:px-12 snap-x snap-mandatory z-10 relative scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, idx) => (
            <div 
              key={idx} 
              className={`relative min-w-[min(280px,82vw)] w-[min(280px,82vw)] shrink-0 snap-center transition-transform hover:scale-105 duration-300 ${item.rotate} ${item.translateY} shadow-lg rounded-sm`}
              style={{ backgroundColor: '#ffeff3' }}
            >
              {/* Pin */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-10 z-20 drop-shadow-sm">
                <img src="/images/pin.webp" alt="Pin" className="w-full h-full object-contain" />
              </div>

              {/* Polaroid Frame */}
              <div className="p-3 pb-8 h-full flex flex-col">
                <div className="w-full aspect-[4/3] bg-white mb-4 relative overflow-hidden">
                  <img src={item.img} alt={item.name} className="w-full h-full object-contain p-2" draggable={false} />
                </div>
                
                <h4 className="text-[#032C5E] font-medium text-[15px] mb-2">{item.name}</h4>
                <p className="text-gray-400 text-[12px] leading-relaxed italic">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Custom Styled Scrollbar indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="max-w-[280px] mx-auto mt-10 relative h-[4px] bg-gray-200 rounded-full overflow-hidden"
        >
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
            style={{ width: `${Math.max(15, scrollProgress)}%`, backgroundColor: '#e29db1' }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
