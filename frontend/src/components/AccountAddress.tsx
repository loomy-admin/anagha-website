'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchMe, updateMe, type WebsiteCustomer, type ShippingAddress } from '@/lib/auth';

export default function AccountAddress() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');

  const [customer, setCustomer] = useState<WebsiteCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form State
  const [pincode, setPincode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [fetchingPincode, setFetchingPincode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace(`/account/login?next=${encodeURIComponent('/account/address' + (nextUrl ? `?next=${nextUrl}` : ''))}`);
          return;
        }
        setCustomer(me);
        
        let existing: ShippingAddress[] = [];
        if (Array.isArray(me.shippingAddress)) {
          existing = me.shippingAddress;
        } else if (me.shippingAddress && me.shippingAddress.pincode) {
          existing = [me.shippingAddress];
        }
        
        setAddresses(existing);
        
        // If coming from checkout and no addresses, show the add form immediately
        if (nextUrl === '/checkout' && existing.length === 0) {
          setFormMode('add');
        }

      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load addresses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router, nextUrl]);

  useEffect(() => {
    async function fetchPincodeDetails() {
      if (pincode.length === 6 && /^\d+$/.test(pincode)) {
        setFetchingPincode(true);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await res.json();
          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setCity(postOffice.District);
            setState(postOffice.State);
          }
        } catch (err) {
          console.error('Failed to fetch pincode details', err);
        } finally {
          setFetchingPincode(false);
        }
      }
    }
    fetchPincodeDetails();
  }, [pincode]);

  function resetForm() {
    setPincode('');
    setRecipientName('');
    setMobile('');
    setAltMobile('');
    setAddressLine('');
    setStreet('');
    setLocality('');
    setLandmark('');
    setCity('');
    setState('');
    setFormMode(null);
    setEditingAddressId(null);
  }

  function handleEdit(address: ShippingAddress) {
    setPincode(address.pincode || '');
    setRecipientName(address.recipientName || '');
    setMobile(address.mobile || '');
    setAltMobile(address.altMobile || '');
    setAddressLine(address.addressLine || '');
    setStreet(address.street || '');
    setLocality(address.locality || '');
    setLandmark(address.landmark || '');
    setCity(address.city || '');
    setState(address.state || '');
    setEditingAddressId(address.id!);
    setFormMode('edit');
    setError(null);
    setSuccess(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let updatedAddresses = [...addresses];

    if (formMode === 'edit' && editingAddressId) {
      updatedAddresses = addresses.map(a => 
        a.id === editingAddressId 
          ? { ...a, pincode, recipientName, mobile, altMobile, addressLine, street, locality, landmark, city, state } 
          : a
      );
    } else {
      const safeId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15);

      const newAddress: ShippingAddress = {
        id: safeId,
        pincode,
        recipientName,
        mobile,
        altMobile,
        addressLine,
        street,
        locality,
        landmark,
        city,
        state,
        country: 'India',
        isDefault: addresses.length === 0,
      };
      updatedAddresses.push(newAddress);
    }

    startTransition(async () => {
      try {
        const payload: any = { shippingAddress: updatedAddresses };
        if (!customer?.mobile || customer.mobile.trim() === '') {
          payload.mobile = mobile;
        }
        const updated = await updateMe(payload);
        setCustomer(updated);
        setAddresses(updatedAddresses);
        setSuccess(formMode === 'edit' ? 'Shipping address updated successfully.' : 'Shipping address added successfully.');
        resetForm();

        if (nextUrl && formMode === 'add') {
          // Force a hard refresh to bust Next.js router cache when going back to checkout
          window.location.assign(nextUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save address');
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setError(null);
    setSuccess(null);

    const updatedAddresses = addresses.filter(a => a.id !== id);
    if (updatedAddresses.length > 0 && addresses.find(a => a.id === id)?.isDefault) {
      updatedAddresses[0].isDefault = true;
    }

    startTransition(async () => {
      try {
        const updated = await updateMe({ shippingAddress: updatedAddresses });
        setCustomer(updated);
        setAddresses(updatedAddresses);
        setSuccess('Address deleted.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete address');
      }
    });
  }

  async function handleSetDefault(id: string) {
    setError(null);
    setSuccess(null);

    const updatedAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));

    startTransition(async () => {
      try {
        const updated = await updateMe({ shippingAddress: updatedAddresses });
        setCustomer(updated);
        setAddresses(updatedAddresses);
        
        if (nextUrl) {
          // If we came from checkout, setting a default means we selected it for checkout.
          window.location.assign(nextUrl);
        } else {
          setSuccess('Default address updated.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update default address');
      }
    });
  }


  if (loading) {
    return <div className="py-16 text-sm text-gray-500">Loading your address book…</div>;
  }

  if (!customer) return null;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="font-domine text-xl text-[#032C5E] font-bold">Address Book</h2>
        {!formMode && (
          <button 
            onClick={() => { resetForm(); setFormMode('add'); }}
            className="text-xs font-bold text-[#f1592a] uppercase tracking-wide hover:underline"
          >
            + Add New Address
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-6">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-3 py-2 mb-6">
          {success}
        </p>
      ) : null}

      {!formMode ? (
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-100 rounded-xl">
              <p className="text-gray-500 text-sm mb-4">You have no saved addresses.</p>
              <button 
                onClick={() => { resetForm(); setFormMode('add'); }}
                className="bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded hover:bg-opacity-90"
              >
                Add Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address, index) => (
                <div key={address.id || index} className={`relative p-5 bg-white border rounded-xl ${address.isDefault ? 'border-[#f1592a] shadow-sm' : 'border-gray-200'}`}>
                  {address.isDefault && (
                    <span className="absolute top-0 right-0 bg-[#f1592a] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-bl-lg rounded-tr-xl">
                      Default
                    </span>
                  )}
                  <p className="font-medium text-sm text-[#222] mb-1">{address.recipientName || customer.name}</p>
                  <div className="text-sm text-gray-600 leading-relaxed space-y-0.5 mb-4">
                    <p>{address.addressLine}</p>
                    {address.street && <p>{address.street}</p>}
                    {address.locality && <p>{address.locality}</p>}
                    <p>{address.city}, {address.state} {address.pincode}</p>
                    <p>{address.country}</p>
                    <p className="pt-2 text-gray-500">Mobile: {address.mobile || customer.mobile}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100 text-[12px] font-semibold">
                    {!address.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(address.id!)}
                        disabled={isPending}
                        className="text-[#032C5E] hover:underline uppercase tracking-wide"
                      >
                        {nextUrl === '/checkout' ? 'Use this Address' : 'Set as Default'}
                      </button>
                    )}
                    {address.isDefault && nextUrl === '/checkout' && (
                      <button 
                        onClick={() => window.location.assign(nextUrl)}
                        className="text-green-600 font-bold uppercase tracking-wide"
                      >
                        ✓ Selected for Checkout
                      </button>
                    )}
                    <div className="ml-auto flex gap-3">
                      <button 
                        onClick={() => handleEdit(address)}
                        disabled={isPending}
                        className="text-gray-500 hover:underline uppercase tracking-wide"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(address.id!)}
                        disabled={isPending}
                        className="text-red-500 hover:underline uppercase tracking-wide"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl p-6 max-w-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#222]">
              {formMode === 'edit' ? 'Edit Address' : 'Add New Address'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value="India"
                disabled
                className="w-full border border-gray-200 rounded-md px-4 py-2 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                Pin Code
              </label>
              <input
                type="text"
                id="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="6 digits [0-9] PIN code"
                pattern="[0-9]{6}"
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
              <p className="text-xs text-gray-400 mt-1">
                {fetchingPincode ? 'Fetching details...' : 'Enter pin code and details will be populated automatically.'}
              </p>
            </div>

            <div>
              <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient's Name
              </label>
              <input
                type="text"
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  pattern="[0-9]{10}"
                  className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-md border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="altMobile" className="block text-sm font-medium text-gray-700 mb-1">
                Alternate Number (Optional)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  id="altMobile"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  pattern="[0-9]{10}"
                  className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-md border border-gray-300 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="addressLine" className="block text-sm font-medium text-gray-700 mb-1">
                Address (Apartment/House/Flat No.)
              </label>
              <input
                type="text"
                id="addressLine"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Street/Colony/Area Name
              </label>
              <input
                type="text"
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div>
              <label htmlFor="locality" className="block text-sm font-medium text-gray-700 mb-1">
                Locality / Town
              </label>
              <input
                type="text"
                id="locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div>
              <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">
                Landmark (Optional)
              </label>
              <input
                type="text"
                id="landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City / District
              </label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#032C5E] focus:border-[#032C5E]"
              />
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-100 flex gap-4">
              <button
                type="submit"
                disabled={isPending}
                className="bg-[#032C5E] text-white font-semibold uppercase tracking-wide text-sm px-6 py-2.5 rounded hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving...' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wide text-sm px-6 py-2.5 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
