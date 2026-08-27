'use client';

import { useState, useEffect } from 'react';
import { isInWishlist, toggleWishlist, WISHLIST_CHANGED_EVENT, type WishlistItem } from '@/lib/wishlist';
import { useContactInfo } from '@/lib/contact';

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
  const { whatsapp } = useContactInfo();

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

  const whatsappText = encodeURIComponent(
    `Hi, please send photos of ${alt} (Tag: ${product?.tag_number || ''}).`,
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="relative aspect-square w-full max-w-[560px] mx-auto bg-[#f4f6f9] rounded-xl border border-gray-100 flex items-center justify-center p-4 sm:p-8 group overflow-hidden">
        {current ? (
          <img src={current} alt={alt} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center text-center px-6 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#032C5E]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="font-domine text-[#032C5E] text-lg font-bold mb-1">{alt}</p>
            {product?.tag_number ? (
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold mb-3">
                Tag {product.tag_number}
              </p>
            ) : null}
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Photos for this piece will appear here. Ask our team for current pictures on WhatsApp.
            </p>
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#032C5E] text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full"
            >
              Request photos
            </a>
          </div>
        )}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 transition-transform z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-colors ${isWishlisted ? 'text-rose-500' : 'text-gray-400'}`}
            fill={isWishlisted ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={isWishlisted ? 1 : 1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {realImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-[560px] mx-auto w-full">
          {realImages.map((url, index) => {
            const selected = active === index;
            return (
              <button
                key={`img-${index}`}
                type="button"
                onClick={() => setActive(index)}
                className={`w-16 h-16 sm:w-20 sm:h-20 p-1 flex items-center justify-center border-2 transition-colors shrink-0 ${
                  selected ? 'border-[#032C5E]' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <img src={url} alt="" className="w-full h-full object-contain" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
