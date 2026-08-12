'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  fetchCatalogFilters,
  fetchGroupImages,
  groupImageForSlug,
  slugifyName,
  type CatalogFilterOption,
} from '@/lib/erpCatalog';

const HOME_GRID_LIMIT = 16;

type PlanData = {
  badge: string;
  installment: string;
  suffix: string;
  desc: string;
  btnText: string;
  btnLink: string;
};

const SILVER_PLAN_DEFAULT: PlanData = {
  badge: 'Anagha Silver Advantage Plan:',
  installment: '0% Interest',
  suffix: 'Easy EMIs',
  desc: 'Flexible monthly plans on selected silver jewellery',
  btnText: 'Explore Plan',
  btnLink: '/jewellery',
};

interface Props {
  goldLive?: Array<{ name?: string; filename?: string | null } | null>;
  silverLive?: Array<{ name?: string; filename?: string | null } | null>;
  goldPlan?: Partial<PlanData>;
  silverPlan?: Partial<PlanData>;
  hideGoldPlan?: boolean;
  hideSilverPlan?: boolean;
}

function sortByCountDesc(groups: CatalogFilterOption[]) {
  return [...groups].sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));
}

export default function Categories({ goldLive, silverLive, goldPlan, silverPlan, hideGoldPlan, hideSilverPlan }: Props) {
  const [groups, setGroups] = useState<CatalogFilterOption[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const plan: PlanData = { ...SILVER_PLAN_DEFAULT, ...silverPlan };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [payload, images] = await Promise.all([
          fetchCatalogFilters(),
          fetchGroupImages().catch(() => ({})),
        ]);
        if (!cancelled) {
          setImageOverrides(images);
          setGroups(sortByCountDesc(payload.filters?.group || []).slice(0, HOME_GRID_LIMIT));
        }
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white py-10 overflow-hidden">
      <div className="w-full px-6">
        <div className="flex items-center justify-center mb-10">
          <div className="relative inline-flex rounded-full bg-gray-100 p-1.5 gap-1">
            <button
              type="button"
              className="relative z-10 px-8 py-3 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 bg-gradient-to-r from-slate-400 to-gray-500 text-white shadow-md"
            >
              Silver
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-x-4 md:gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 animate-pulse">
                <div className="w-full aspect-square rounded-[22px] bg-[#f4f6f9]" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            Categories will appear when live inventory is available.
          </p>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-x-4 md:gap-y-8"
          >
            {groups.map((g, i) => {
              const slug = g.slug || slugifyName(g.name);
              const img = groupImageForSlug(slug, imageOverrides);
              const isLeft = (i % 8) % 2 === 0;

              return (
                <motion.div
                  key={g.id || slug}
                  variants={{
                    hidden: { x: isLeft ? 'calc(100% + 1rem)' : 'calc(-100% - 1rem)', opacity: 0 },
                    visible: {
                      x: 0,
                      opacity: 1,
                      transition: { delay: Math.min(i * 0.03, 0.4), duration: 0.6, ease: [0.23, 1, 0.32, 1] },
                    },
                  }}
                >
                  <Link href={`/jewellery/${slug}`} className="flex flex-col items-center gap-3 cursor-pointer group">
                    <div className="w-full aspect-square rounded-[22px] overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl bg-[#f4f6f9] group-hover:bg-[#eaeff7]">
                      <img src={img} alt={g.name} className="w-[78%] h-[78%] object-contain" />
                    </div>
                    <p className="text-[12px] font-medium text-center leading-tight transition-colors text-gray-400 group-hover:text-slate-600 uppercase">
                      {g.name}
                      {typeof g.count === 'number' ? (
                        <span className="block text-[10px] font-normal normal-case text-gray-300">
                          {g.count} items
                        </span>
                      ) : null}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        {/* Silver Offer Plan Banner */}
        {!hideSilverPlan && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            backgroundImage: [
              'linear-gradient(to right, transparent 0%, rgba(100,120,155,0.2) 30%, rgba(100,120,155,0.2) 70%, transparent 100%)',
              'linear-gradient(to right, transparent 0%, rgba(100,120,155,0.2) 30%, rgba(100,120,155,0.2) 70%, transparent 100%)',
              'linear-gradient(to right, #f8fafc 0%, #f2f5f9 20%, #e8eef5 50%, #f2f5f9 80%, #f8fafc 100%)',
            ].join(','),
            backgroundSize: '100% 1px, 100% 1px, 100% 100%',
            backgroundPosition: 'top, bottom, center',
            backgroundRepeat: 'no-repeat',
          }}
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full py-5 md:py-3.5 mt-10 md:mt-16 text-center md:text-left"
        >
          <p className="text-[12px] md:text-[13.5px] text-navy">
            <span className="font-bold block sm:inline">{plan.badge} </span>
            <span className="font-extrabold text-slate-500">{plan.installment}</span>
            <span className="font-bold"> {plan.suffix}</span>
            <span className="text-gray-400 font-normal text-[11px] md:text-[13px] block sm:inline sm:ml-1.5 mt-1 sm:mt-0">
              ({plan.desc})
            </span>
          </p>
          <a
            href={plan.btnLink}
            className="shrink-0 px-6 py-2 rounded-lg text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm bg-slate-500"
          >
            {plan.btnText}
          </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
