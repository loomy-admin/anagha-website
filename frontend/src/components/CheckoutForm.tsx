'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDisplayPrice, type CatalogItem } from '@/lib/erpCatalog';
import {
  addToCart,
  createCheckoutSession,
  loadCart,
  type CheckoutCartItem,
} from '@/lib/checkout';
import { fetchMe, type WebsiteCustomer, type ShippingAddress } from '@/lib/auth';

async function loadItem(tag: string): Promise<CatalogItem | null> {
  try {
    const res = await fetch(`/api/catalog/items/${encodeURIComponent(tag)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

function toCartItem(loaded: CatalogItem): CheckoutCartItem {
  return {
    tag_number: loaded.tag_number,
    name: loaded.name,
    display_price: loaded.display_price,
    image_url: loaded.image_url,
    type_slug: loaded.group_slug || loaded.type_slug,
  };
}

export default function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFromQuery = (searchParams.get('tag') || '').trim().toUpperCase();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [customer, setCustomer] = useState<WebsiteCustomer | null>(null);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      const me = await fetchMe().catch(() => null);
      if (cancelled) return;
      if (!me) {
        const cart = loadCart();
        const tag = tagFromQuery || cart[0]?.tag_number || '';
        const next = tag
          ? `/checkout?tag=${encodeURIComponent(tag)}`
          : cart.length
            ? '/checkout'
            : '/cart';
        router.replace(`/account/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setCustomer(me);
      
      let existing: ShippingAddress[] = [];
      if (Array.isArray(me.shippingAddress)) {
        existing = me.shippingAddress;
      } else if (me.shippingAddress && (me.shippingAddress as ShippingAddress).pincode) {
        existing = [me.shippingAddress as ShippingAddress];
      }
      setAddresses(existing);
      
      if (existing.length > 0) {
        const defaultAddr = existing.find((a: ShippingAddress) => a.isDefault) || existing[0];
        setSelectedAddressId(defaultAddr.id || JSON.stringify(defaultAddr));
      }

      const tags = tagFromQuery
        ? [tagFromQuery]
        : loadCart().map((row) => row.tag_number);

      if (!tags.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const loadedRows = await Promise.all(tags.map((tag) => loadItem(tag)));
      if (cancelled) return;

      const available = loadedRows.filter((row): row is CatalogItem => Boolean(row));
      if (!available.length) {
        setItems([]);
        setError('These items are no longer available.');
        setLoading(false);
        return;
      }

      available.forEach((row) => addToCart(toCartItem(row)));
      setItems(available);
      if (available.length < tags.length) {
        setError('Some items were unavailable and were removed from this checkout.');
      }
      setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [tagFromQuery, router]);

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = Number(item.display_price);
        return sum + (Number.isFinite(price) ? price : 0);
      }, 0),
    [items],
  );

  async function onPay() {
    if (!items.length || !customer || submitting) return;
    if (!selectedAddressId) {
      setError('Please select a shipping address before proceeding.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const selectedAddr = addresses.find(a => (a.id || JSON.stringify(a)) === selectedAddressId);

    try {
      const { session, payment } = await createCheckoutSession({
        tag_numbers: items.map((item) => item.tag_number),
        shippingAddress: selectedAddr,
      });

      if (payment?.mode !== 'razorpay' || !session?.id) {
        throw new Error('Razorpay checkout could not be started');
      }

      window.location.assign(`/checkout/pay?session=${encodeURIComponent(session.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500 text-sm">
        Loading checkout…
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-domine text-2xl text-[#032C5E] mb-3">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-8">
          Choose a piece from live inventory to continue.
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
      <h1 className="font-domine text-[28px] text-[#032C5E] font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-xl border border-gray-100 bg-[#fafafa] p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
              <h2 className="text-sm font-bold text-[#032C5E] uppercase tracking-wide">
                Shipping Address
              </h2>
              <Link
                href={`/account/address?next=${encodeURIComponent('/checkout')}`}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 uppercase tracking-widest border border-teal-200 hover:border-teal-300 rounded px-2 py-1 transition-colors"
              >
                + Add New
              </Link>
            </div>
            
            {addresses.length === 0 ? (
              <div className="text-sm text-gray-500 py-2">
                You do not have any saved addresses. <br/>
                <Link href={`/account/address?next=${encodeURIComponent('/checkout')}`} className="text-teal-600 underline font-medium mt-1 inline-block">Add an address now</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const addrId = addr.id || JSON.stringify(addr);
                  return (
                    <label key={addrId} className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedAddressId === addrId ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500' : 'border-gray-200 hover:border-teal-200 bg-white'}`}>
                      <input 
                        type="radio" 
                        name="shippingAddress" 
                        className="mt-1 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500" 
                        checked={selectedAddressId === addrId}
                        onChange={() => setSelectedAddressId(addrId)}
                      />
                      <div className="text-sm text-gray-600 flex-1">
                        <p className="font-bold text-gray-900">{addr.recipientName || customer.name}</p>
                        <p>{addr.addressLine || addr.street}</p>
                        <p>{[addr.locality, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
                        <p className="mt-1 text-gray-500">Mobile: {addr.mobile || customer.mobile}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-[#fafafa] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#032C5E] uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">
              Contact Info
            </h2>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-[#222] text-right">{customer.name}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Mobile</span>
              <span className="font-medium text-[#222] text-right">{customer.mobile}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-[#222] text-right">{customer.email}</span>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onPay}
            disabled={submitting}
            className="w-full sm:w-auto bg-[#f1592a] hover:bg-[#d94a1f] disabled:opacity-60 text-white font-bold text-[12px] uppercase tracking-widest px-10 py-3.5 rounded-full transition-colors"
          >
            {submitting ? 'Starting payment…' : 'Pay securely'}
          </button>
        </div>

        <aside className="lg:col-span-2">
          <div className="border border-gray-100 rounded-lg p-5 bg-[#fafafa]">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-4">Order summary</p>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.tag_number} className="flex gap-4">
                  <div className="w-20 h-20 bg-white rounded overflow-hidden flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-300">No image</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase">Tag {item.tag_number}</p>
                    <p className="text-sm font-medium text-[#222] leading-snug mt-1">{item.name}</p>
                    <p className="text-sm font-bold text-[#222] mt-2">
                      {formatDisplayPrice(item.display_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-[13px] text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[#222]">{formatDisplayPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-[#00a699]">Free</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span className="font-medium text-[#222]">Included</span>
              </div>
            </div>

            <div className="flex justify-between text-base font-bold text-[#222] border-t border-gray-200 pt-3 mt-3">
              <span>Total</span>
              <span>{formatDisplayPrice(total)}</span>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 border border-gray-100 rounded-lg p-5 bg-[#fafafa]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#032C5E] uppercase tracking-wide">100% Secure Payments</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Protected by Razorpay encryption</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#032C5E] uppercase tracking-wide">Insured Shipping</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Free fast delivery</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
