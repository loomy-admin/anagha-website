'use client';

import { useRouter } from 'next/navigation';
import { addToCart, type CheckoutCartItem } from '@/lib/checkout';

type Props = {
  item: CheckoutCartItem;
  className?: string;
  onAfterAdd?: () => void;
};

export default function BuyNowButton({ item, className = '', onAfterAdd }: Props) {
  const router = useRouter();

  function onClick() {
    const result = addToCart(item);
    if (result.added && onAfterAdd) {
      onAfterAdd();
    }
    router.push(`/checkout?tag=${encodeURIComponent(item.tag_number)}`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 bg-[#f1592a] text-white font-bold py-3 px-6 rounded-full hover:bg-[#d94a1f] transition-colors uppercase tracking-widest text-[12px] ${className}`}
    >
      Buy now
    </button>
  );
}
