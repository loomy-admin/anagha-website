import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import Offers from '@/components/Offers';
import LatestCollections from '@/components/LatestCollections';
import CuratedStyles from '@/components/CuratedStyles';
import DesignLed from '@/components/DesignLed';
import Testimonials from '@/components/Testimonials';
import AboutCompany from '@/components/AboutCompany';
import PromiseSection from '@/components/Promise';
import Footer from '@/components/Footer';
async function getMeta() {
  try {
    const res = await fetch('http://127.0.0.1:4001/api/site/landing/content', {
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error('Failed to fetch landing content');
    return await res.json();
  } catch (err) {
    console.error('Error fetching landing content:', err);
    return {
      hero: null,
      goldCategories: [],
      silverCategories: [],
      offers: [],
      landing_visibility: {}
    };
  }
}

import { Suspense } from 'react';

async function LandingContent() {
  const meta = await getMeta();
  const visibility = meta.landing_visibility || {};

  return (
    <>
      {!visibility.hideHero && <Hero meta={meta.hero} />}
      
      {!visibility.hideCategories && (
        <Categories
          goldLive={meta.goldCategories || []}
          silverLive={meta.silverCategories || []}
          goldPlan={meta.goldPlan}
          silverPlan={meta.silverPlan}
          hideGoldPlan={visibility.hideGoldPlan}
          hideSilverPlan={visibility.hideSilverPlan}
        />
      )}
      
      {!visibility.hideOffers && <Offers live={meta.offers || []} />}
      
      {!visibility.hideCollections && (
        <LatestCollections live={meta.collections || []} btnLink={meta.collectionsBtnLink} />
      )}
      
      {!visibility.hideCurated && (
        <CuratedStyles liveSlots={meta.curatedSlots} liveTitles={meta.curatedTitles} />
      )}

      {!visibility.hideDesignLed && (
        <DesignLed liveImages={meta.designLedImages} liveLabels={meta.designLedLabels} />
      )}

      {!visibility.hideBanner && (
        <section className="w-full">
          <img 
            src={meta.standaloneBanner ? `/uploads/${meta.standaloneBanner}` : "/images/banner_collection.webp"}
            alt="Latest Collection Banner" 
            className="w-full h-auto block" 
            draggable={false}
          />
        </section>
      )}

      {!visibility.hideTestimonials && (
        <Testimonials 
          live={{
            images: meta.testimonialsImages || [],
            names:  meta.testimonialsNames || [],
            texts:  meta.testimonialsTexts || [],
          }} 
        />
      )}
      
      {!visibility.hideAbout && <AboutCompany data={meta.about} />}
      
      {!visibility.hidePromise && <PromiseSection labels={meta.promise} />}
    </>
  );
}

function LandingSkeleton() {
  return (
    <div className="w-full h-[60vh] bg-gray-50 flex items-center justify-center animate-pulse">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-col gap-y-8 md:gap-y-12 pb-8 md:pb-12 overflow-x-clip w-full max-w-[100vw]">
        <Suspense fallback={<LandingSkeleton />}>
          <LandingContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
