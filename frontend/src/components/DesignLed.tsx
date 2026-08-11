'use client';

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import { DESIGN_LED_ITEMS } from '@/lib/data';

interface Props {
  liveImages?: (string | null)[];
  liveLabels?: (string | null)[];
}

export default function DesignLed({ liveImages, liveLabels }: Props) {
  const [overrides, setOverrides] = useState<(string | null)[]>(liveImages ? liveImages.map(f => f ? `/uploads/${f}` : null) : new Array(6).fill(null));
  const [labelOverrides, setLabelOverrides] = useState<(string | null)[]>(liveLabels || new Array(3).fill(null));

  useEffect(() => {
    if (!liveImages && !liveLabels) {
      fetch('/api/upload/design-led')
        .then(r => r.json())
        .then(d => {
          if (d.images) setOverrides(d.images.map((file: string | null) => file ? `/uploads/${file}` : null));
          if (d.labels) setLabelOverrides(d.labels);
        })
        .catch(() => {});
    }
  }, [liveImages, liveLabels]);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.3 } }
  };

  // Unique 3D flip-up animation for the main cards
  const cardVariants: Variants = {
    hidden: { opacity: 0, rotateX: 25, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      rotateX: 0, 
      y: 0, 
      scale: 1,
      transition: { duration: 1, ease: [0.23, 1, 0.32, 1] } 
    }
  };

  // Spring pop animation for the small overlapping images
  const popVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { type: 'spring', stiffness: 150, damping: 12, delay: 0.4 } 
    }
  };

  return (
    <section className="bg-white py-12 perspective-[2000px]">
      {/* Title */}
      <h2 className="text-center text-[28px] font-domine text-[#032C5E] tracking-wide mb-10">
        Design Led Jewellery
      </h2>

      {/* Grid container */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="w-full px-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {DESIGN_LED_ITEMS.map((item, idx) => {
          const largeIndex = idx * 2;
          const smallIndex = idx * 2 + 1;
          const displayLarge = overrides[largeIndex] || item.largeImg;
          const displaySmall = overrides[smallIndex] || item.smallImg;
          const displayLabel = labelOverrides[idx] || item.label;

          return (
            <motion.div variants={cardVariants} key={idx} className="flex flex-col items-center">
              <Link href={`/jewellery/${item.slug}`} className="flex flex-col items-center w-full group">

                {/* Image Box */}
                <div className="relative w-[92%] max-w-[380px] mx-auto mb-24 border-2 border-[#f1592a] rounded-[16px] shadow-sm bg-[#fafafa] transform-style-3d group-hover:shadow-md transition-shadow duration-300">
                  <img 
                    src={displayLarge} 
                    alt={`${displayLabel} worn`} 
                    className="w-full object-cover rounded-[16px]"
                    draggable={false}
                  />
                  
                  {/* Overlapping small container */}
                  <div className="absolute z-10 left-1/2 bottom-0 translate-y-[75%] -translate-x-1/2">
                    <motion.div 
                      variants={popVariants}
                      className="w-[140px] h-[85px] sm:w-[160px] sm:h-[95px] xl:w-[200px] xl:h-[120px] bg-white rounded-[20px] shadow-[0_12px_40px_rgb(0,0,0,0.15)] border-2 border-gray-200
                                flex items-center justify-center p-1 overflow-hidden"
                    >
                      <img 
                        src={displaySmall} 
                        alt={displayLabel} 
                        className="w-full h-full object-cover scale-[1.08] opacity-90 transition-opacity hover:opacity-100" 
                        draggable={false}
                      />
                    </motion.div>
                  </div>
                </div>

                {/* Label below */}
                <p className="text-[16px] text-gray-500 font-semibold tracking-wide mt-4 group-hover:text-[#032C5E] transition-colors">
                  {displayLabel}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
