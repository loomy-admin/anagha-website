'use client';

import { useState, useEffect } from 'react';
import { isInWishlist, toggleWishlist, WISHLIST_CHANGED_EVENT, type WishlistItem } from '@/lib/wishlist';

const THUMB_SLOTS = 5;

export default function ProductGallery({
  images,
  alt,
  product,
}: {
  images: string[];
  alt: string;
  product?: any;
}) {
  const realImages = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const current = realImages[active] || realImages[0] || null;

  const slots = Array.from({ length: THUMB_SLOTS }, (_, i) => {
    if (realImages[i]) return { type: 'image' as const, url: realImages[i], index: i };
    // Match V1: remaining slots → first two Video, then Image placeholders
    const placeholderIndex = i - realImages.length;
    return {
      type: placeholderIndex < 2 ? ('video' as const) : ('image-ph' as const),
      url: null as string | null,
      index: i,
    };
  });

  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!product?.tag_number) return;
    setIsWishlisted(isInWishlist(product.tag_number));

    const handleWishlistChange = () => {
      setIsWishlisted(isInWishlist(product.tag_number));
    };

    window.addEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChange);
  }, [product?.tag_number]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product) return;

    const item: WishlistItem = {
      tag_number: product.tag_number,
      name: product.name || 'Jewellery',
      display_price: product.display_price,
      image_url: product.image_url,
      type_slug: product.type_slug,
      group_slug: product.group_slug,
      purity: product.purity,
    };

    toggleWishlist(item);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full aspect-square bg-[#f8f8f8] rounded-lg overflow-hidden flex items-center justify-center p-8 sm:p-12 relative group max-w-[500px]">
        <button
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center transition-colors z-10 group/heart"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`w-5 h-5 transition-transform duration-300 ${isWishlisted ? 'scale-110' : 'group-hover/heart:scale-110 group-hover/heart:stroke-red-400'}`}
            fill={isWishlisted ? "#ef4444" : "none"} 
            stroke={isWishlisted ? "#ef4444" : "#9ca3af"} 
            viewBox="0 0 24 24" 
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        {current ? (
          <img src={current} alt={alt} className="w-full h-full object-contain" />
        ) : (
          <span className="text-gray-300 text-sm">No image available</span>
        )}
      </div>

      <div className="mt-6 sm:mt-8 w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {slots.map((slot) => {
          if (slot.type === 'image' && slot.url) {
            const selected = slot.index === active;
            return (
              <button
                key={`img-${slot.index}`}
                type="button"
                onClick={() => setActive(slot.index)}
                className={`w-16 h-16 sm:w-20 sm:h-20 p-1 flex items-center justify-center border-2 transition-colors ${
                  selected ? 'border-[#032C5E]' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`View image ${slot.index + 1}`}
              >
                <img src={slot.url} alt="" className="w-full h-full object-contain" />
              </button>
            );
          }

          if (slot.type === 'video') {
            return (
              <div
                key={`vid-${slot.index}`}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 border border-gray-200 flex flex-col items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-bold tracking-tight">Video</span>
              </div>
            );
          }

          return (
            <div
              key={`ph-${slot.index}`}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 border border-gray-200 flex flex-col items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-bold tracking-tight">Image</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
