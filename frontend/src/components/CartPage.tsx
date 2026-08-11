'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CART_CHANGED_EVENT,
  loadCart,
  removeFromCart,
  type CheckoutCartItem,
} from '@/lib/checkout';
import { addToWishlist } from '@/lib/wishlist';
import { formatDisplayPrice } from '@/lib/erpCatalog';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckoutCartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setItems(loadCart());
      setReady(true);
    }
    sync();
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = Number(item.display_price);
        return sum + (Number.isFinite(price) ? price : 0);
      }, 0),
    [items],
  );

  if (!ready) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-gray-500">
        Loading cart…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="font-domine text-3xl text-[#032C5E] font-bold mb-3">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-8">
          Add jewellery from live inventory, then checkout when you are ready.
        </p>
        <Link
          href="/jewellery"
          className="inline-flex bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
        >
          Browse jewellery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#f1592a] font-bold mb-1">Cart</p>
          <h1 className="font-domine text-[28px] text-[#032C5E] font-bold">
            {items.length} item{items.length === 1 ? '' : 's'}
          </h1>
        </div>
        <Link href="/jewellery" className="text-sm text-[#032C5E] hover:underline">
          Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-4">
          {items.map((item) => (
            <div
              key={item.tag_number}
              className="flex gap-4 border border-gray-100 rounded-xl bg-white p-4"
            >
              <Link
                href={
                  item.type_slug
                    ? `/jewellery/${encodeURIComponent(item.type_slug)}/${encodeURIComponent(item.tag_number)}`
                    : '/jewellery'
                }
                className="w-24 h-24 bg-[#fafafa] rounded overflow-hidden flex items-center justify-center shrink-0"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-300">No image</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-gray-400 uppercase">Tag {item.tag_number}</p>
                <p className="text-sm font-medium text-[#222] leading-snug mt-1">{item.name}</p>
                <p className="text-base font-bold text-[#222] mt-2">
                  {formatDisplayPrice(item.display_price)}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      addToWishlist({
                        tag_number: item.tag_number,
                        name: item.name,
                        display_price: item.display_price,
                        image_url: item.image_url,
                        type_slug: item.type_slug,
                      });
                      setItems(removeFromCart(item.tag_number));
                    }}
                    className="text-[12px] text-[#032C5E] hover:underline font-semibold"
                  >
                    Move to Wishlist
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems(removeFromCart(item.tag_number))}
                    className="text-[12px] text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="lg:col-span-2">
          <div className="border border-gray-100 rounded-xl p-5 bg-[#fafafa] sticky top-24">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-4">Summary</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Items</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#222] border-t border-gray-200 pt-3 mt-3 mb-6">
              <span>Total</span>
              <span>{formatDisplayPrice(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => router.push('/checkout')}
              className="w-full bg-[#f1592a] hover:bg-[#d94a1f] text-white font-bold text-[12px] uppercase tracking-widest py-3.5 rounded-full transition-colors"
            >
              Proceed to checkout
            </button>
            <p className="text-[11px] text-gray-400 mt-3 text-center">
              Sign in is required at payment. Unique tagged pieces — quantity is always 1.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
