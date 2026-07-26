'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addToCart, type CheckoutCartItem } from '@/lib/checkout';

type Props = {
  item: CheckoutCartItem;
};

export default function AddToCartButton({ item }: Props) {
  const [state, setState] = useState<'idle' | 'added' | 'exists'>('idle');

  function onClick() {
    const result = addToCart(item);
    setState(result.added ? 'added' : 'exists');
    window.setTimeout(() => setState('idle'), 2200);
  }

  if (state === 'added' || state === 'exists') {
    return (
      <Link
        href="/cart"
        className="inline-flex items-center justify-center text-[12px] font-semibold text-[#032C5E] hover:underline underline-offset-4"
      >
        {state === 'added' ? 'Added to cart — View' : 'In cart — View'}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center border border-[#032C5E] text-[#032C5E] font-semibold py-1.5 px-3 rounded-full hover:bg-[#032C5E] hover:text-white transition-colors text-[10px] uppercase tracking-wider whitespace-nowrap"
    >
      Add to cart
    </button>
  );
}
