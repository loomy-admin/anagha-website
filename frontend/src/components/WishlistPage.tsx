'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadWishlist, type WishlistItem, WISHLIST_CHANGED_EVENT } from '@/lib/wishlist';
import WishlistProductCard from '@/components/WishlistProductCard';
import type { CatalogItem } from '@/lib/erpCatalog';

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function sync() {
      setItems(loadWishlist());
      setLoading(false);
    }
    sync();

    window.addEventListener(WISHLIST_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(WISHLIST_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#032C5E] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading wishlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-domine text-navy mb-3 font-bold text-center">Your wishlist is empty</h1>
        <p className="text-gray-500 text-center max-w-md mb-8">
          Found something you like? Tap on the heart icon next to the item to add it to your wishlist!
        </p>
        <Link
          href="/jewellery"
          className="bg-navy hover:bg-navy/90 text-white font-bold tracking-wider px-8 py-3.5 rounded-full transition-all shadow-md uppercase text-sm"
        >
          Explore Jewellery
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1250px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <p className="text-[11px] uppercase tracking-widest text-[#f1592a] font-bold mb-1">Wishlist</p>
          <h1 className="text-3xl md:text-4xl font-domine text-navy font-bold">
            {items.length} item{items.length === 1 ? '' : 's'}
          </h1>
        </div>
      </div>

      <div className="max-w-[1250px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {items.map((item) => {
            const product: CatalogItem = {
              id: item.tag_number,
              tag_number: item.tag_number,
              name: item.name,
              display_price: item.display_price,
              image_url: item.image_url,
              type_slug: item.type_slug,
              group_slug: item.group_slug,
              purity: item.purity,
            };

            return <WishlistProductCard key={item.tag_number} product={product} />;
          })}
        </div>
      </div>
    </>
  );
}
