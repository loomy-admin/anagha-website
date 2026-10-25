'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, CART_CHANGED_EVENT, loadCart, type CheckoutCartItem } from '@/lib/checkout';

type Props = {
  item: CheckoutCartItem;
  onAfterAdd?: () => void;
  className?: string;
  size?: 'sm' | 'lg';
  /** Stay on the page after adding (product listing); otherwise go to the cart. */
  stayOnPage?: boolean;
};

const SIZE_CLASSES = {
  sm: 'font-semibold py-1.5 px-3 text-[11px] tracking-wider',
  lg: 'font-bold py-3 px-6 text-[12px] tracking-widest',
};

export default function AddToCartButton({
  item,
  onAfterAdd,
  className = '',
  size = 'sm',
  stayOnPage = false,
}: Props) {
  const router = useRouter();
  const [inCart, setInCart] = useState(false);
  const tag = String(item.tag_number || '').trim().toUpperCase();

  useEffect(() => {
    if (!stayOnPage) return;
    const sync = () => setInCart(loadCart().some((row) => row.tag_number === tag));
    sync();
    window.addEventListener(CART_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CART_CHANGED_EVENT, sync);
  }, [stayOnPage, tag]);

  function onClick(e: React.MouseEvent) {
    // Cards wrap this button in a link to the product page.
    e.preventDefault();
    e.stopPropagation();
    if (stayOnPage && inCart) {
      router.push('/cart');
      return;
    }
    const result = addToCart(item);
    if (result.added && onAfterAdd) {
      onAfterAdd();
    }
    if (stayOnPage) {
      setInCart(true);
      return;
    }
    router.push('/cart');
  }

  if (stayOnPage && inCart) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex w-full items-center justify-center border border-[#032C5E] text-[#032C5E] bg-white rounded-full hover:bg-[#032C5E]/5 transition-colors uppercase whitespace-nowrap ${SIZE_CLASSES[size]} ${className}`}
      >
        In cart · View
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center border border-[#032C5E] bg-[#032C5E] text-white rounded-full hover:bg-[#021f45] hover:border-[#021f45] transition-colors uppercase whitespace-nowrap ${SIZE_CLASSES[size]} ${className}`}
    >
      Add to cart
    </button>
  );
}
