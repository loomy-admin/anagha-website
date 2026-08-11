'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type CatalogItem, formatDisplayPrice } from '@/lib/erpCatalog';
import { isInWishlist, toggleWishlist, WISHLIST_CHANGED_EVENT, type WishlistItem } from '@/lib/wishlist';

function itemHref(item: CatalogItem) {
  const g = item.group_slug || 'item';
  return `/jewellery/${encodeURIComponent(g)}/${encodeURIComponent(item.tag_number)}`;
}

export default function ProductCard({ product }: { product: CatalogItem }) {
  const priceLabel = formatDisplayPrice(product.display_price);
  const showPrice = product.display_price != null;

  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setIsWishlisted(isInWishlist(product.tag_number));

    const handleWishlistChange = () => {
      setIsWishlisted(isInWishlist(product.tag_number));
    };

    window.addEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChange);
  }, [product.tag_number]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
    <Link
      href={itemHref(product)}
      className="group flex flex-col bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 h-full relative"
    >
      {/* Heart Button */}
      <button
        onClick={handleToggleWishlist}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 backdrop-blur shadow-sm border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all duration-200 group/heart"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isWishlisted ? "#ef4444" : "none"}
          stroke={isWishlisted ? "#ef4444" : "#9ca3af"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-300 ${isWishlisted ? 'scale-110' : 'group-hover/heart:scale-110 group-hover/heart:stroke-red-400'}`}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>

      <div className="relative w-full aspect-square bg-[#fafafa] overflow-hidden shrink-0">
        <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
          {(product.image_url || (Array.isArray(product.website_images) && product.website_images.length > 0)) ? (
            <Image
              src={product.image_url || (Array.isArray(product.website_images) ? product.website_images[0] : '')}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
              className="object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply p-2"
            />
          ) : (
            <div className="text-gray-300 text-sm text-center px-4">No image</div>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 items-start text-left bg-white">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap min-h-[24px]">
          <span className={`font-bold text-[15px] md:text-[16px] ${showPrice ? 'text-[#222]' : 'text-gray-500 text-[13px]'}`}>
            {priceLabel}
          </span>
        </div>
        <h3 className="text-[#666] text-[12px] md:text-[13px] line-clamp-2 leading-snug min-h-[38px] w-full">
          {product.name}
        </h3>
        <p className="text-[11px] text-gray-400 mt-1">
          {product.tag_number}
          {product.purity ? ` · ${product.purity}` : ''}
        </p>
      </div>
    </Link>
  );
}
