'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addToCart, type CheckoutCartItem } from '@/lib/checkout';

type Props = {
  item: CheckoutCartItem;
  onAfterAdd?: () => void;
  className?: string;
};

export default function AddToCartButton({ item, onAfterAdd, className = '' }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'added' | 'exists'>('idle');

  function onClick() {
    const result = addToCart(item);
    if (result.added && onAfterAdd) {
      onAfterAdd();
    }
    router.push('/cart');
  }

  if (state === 'added' || state === 'exists') {
    return (
      <Link
        href="/cart"
        className="inline-flex w-full items-center justify-center text-[12px] font-semibold text-[#032C5E] hover:underline underline-offset-4"
      >
        {state === 'added' ? 'Added to cart — View' : 'In cart — View'}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center border border-[#032C5E] text-[#032C5E] font-semibold py-1.5 px-3 rounded-full hover:bg-[#032C5E] hover:text-white transition-colors text-[11px] uppercase tracking-wider whitespace-nowrap ${className}`}
    >
      Add to cart
    </button>
  );
}
