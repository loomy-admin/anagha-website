'use client';

import { motion, Variants } from 'framer-motion';

const DEFAULTS = [
  '/images/collections/resized_image.png',
  '/images/collections/resized_image_2.png',
  '/images/collections/resized_image_3.png',
];

interface Props {
  live: (string | null)[];
  btnLink?: string;
}

export default function LatestCollections({ live, btnLink = '#' }: Props) {
  const imgs = DEFAULTS.map((def, i) => (live[i] ? `/uploads/${live[i]}` : def));

  const CARD = 'w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm shrink-0';

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section className="bg-white pt-4 pb-6 sm:pt-6 sm:pb-8">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* Title */}
        <motion.h2 variants={itemVariants} className="text-center text-[22px] sm:text-[28px] font-domine text-[#032C5E] tracking-wide mb-4 sm:mb-6 px-4">
          Browse Latest Jewellery Collections
        </motion.h2>

        {/* Row — collapses to column on mobile */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full">

          {/* Left card */}
          <motion.div variants={itemVariants} className="w-full max-w-md md:flex-1 md:max-w-[33%]">
              <div className={CARD}>
                <img src={imgs[0]} alt="Collection 1" className="w-full h-full object-cover" draggable={false} />
              </div>
          </motion.div>

          {/* Center column: card + button below */}
          <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 shrink-0 w-full max-w-md md:flex-1 md:max-w-[33%]">
            <div className={`${CARD}`}>
              <img src={imgs[1]} alt="Collection 2" className="w-full h-full object-cover" draggable={false} />
            </div>
            <a
              href={btnLink}
              className="px-8 py-2.5 rounded-full border border-pink-100 text-[12.5px] font-medium
                text-gray-500 bg-[#fceef4] hover:bg-pink-100 hover:border-pink-200 hover:text-coral
                transition-all duration-200 whitespace-nowrap shadow-sm mt-2 md:mt-0"
            >
              Browse all Collections
            </a>
          </motion.div>

          {/* Right card */}
          <motion.div variants={itemVariants} className="w-full max-w-md md:flex-1 md:max-w-[33%]">
             <div className={CARD}>
               <img src={imgs[2]} alt="Collection 3" className="w-full h-full object-cover" draggable={false} />
             </div>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
}
