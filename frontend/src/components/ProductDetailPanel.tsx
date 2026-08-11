'use client';

import { useState } from 'react';

import AddToCartButton from '@/components/AddToCartButton';
import BuyNowButton from '@/components/BuyNowButton';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import { useContactInfo } from '@/lib/contact';

type Props = {
  name: string;
  tagNumber: string;
  displayPrice?: number | null;
  imageUrl?: string | null;
  groupSlug?: string | null;
  netWeight?: number | string | null;
  grossWeight?: number | string | null;
  description?: string | null;
  purity?: string | null;
  metalType?: string | null;
  group?: string | null;
};

export default function ProductDetailPanel({
  name,
  tagNumber,
  displayPrice,
  imageUrl,
  groupSlug,
  netWeight,
  grossWeight,
  description,
  purity,
  metalType,
  group,
}: Props) {
  const { whatsapp, phone } = useContactInfo();
  const [openSection, setOpenSection] = useState<string | null>('auth');
  // const [customizeOpen, setCustomizeOpen] = useState(false);
  const weight = netWeight ?? grossWeight;
  const weightLabel =
    weight != null && weight !== ''
      ? `${Number(weight)}g`
      : null;
  const priceLabel = formatDisplayPrice(displayPrice);
  const whatsappText = encodeURIComponent(
    `Hi, I'm interested in ${name} (Tag: ${tagNumber}).`,
  );
  const desc =
    description?.trim() ||
    `Premium ${name} crafted with the finest materials. This exquisite piece features intricate detailing, perfect for elevating your everyday style or making a statement at special events.`;

  const cartItem = {
    tag_number: tagNumber,
    name,
    display_price: displayPrice,
    image_url: imageUrl,
    type_slug: groupSlug || undefined,
  };

  return (
    <div className="flex-1 lg:pl-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="font-domine text-[#222] text-2xl font-bold min-w-0">{name}</h1>
        {displayPrice != null && Number(displayPrice) > 0 ? (
          <div className="shrink-0 pt-1">
            <AddToCartButton item={cartItem} />
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-0.5">
          <div className="text-2xl font-bold text-[#222]">{priceLabel}</div>
        </div>
        <p className="text-gray-400 text-[11px]">MRP Incl. of all taxes</p>
      </div>

      <div className="bg-[#f9fafb] border border-gray-100 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[12px]">
          <div className="flex flex-col">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Product Code</span>
            <span className="font-medium text-[#222]">{tagNumber}</span>
          </div>
          {group && (
            <div className="flex flex-col">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Category</span>
              <span className="font-medium text-[#222] capitalize">{group.toLowerCase()}</span>
            </div>
          )}
          {metalType && (
            <div className="flex flex-col">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Metal</span>
              <span className="font-medium text-[#222] capitalize">{metalType}</span>
            </div>
          )}
          {purity && (
            <div className="flex flex-col">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Purity</span>
              <span className="font-medium text-[#222]">{purity}</span>
            </div>
          )}
          {weightLabel && (
            <div className="flex flex-col">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Weight</span>
              <span className="font-medium text-[#222]">{weightLabel}</span>
            </div>
          )}
          {description && description.trim() !== '' && description.length < 20 && (
            <div className="flex flex-col">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold mb-0.5">Design Code</span>
              <span className="font-medium text-[#222]">{description.trim()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customize / size — revisit later
      <button
        type="button"
        onClick={() => setCustomizeOpen((v) => !v)}
        className="w-full border-y border-gray-100 py-3 mb-6 flex items-center justify-between group"
      >
        <span className="text-[12px] text-[#222] font-bold uppercase tracking-wide group-hover:text-[#032C5E] transition-colors">
          Customize this design
        </span>
        <span className="text-lg text-gray-400 group-hover:text-[#032C5E] transition-colors">
          {customizeOpen ? '−' : '+'}
        </span>
      </button>
      {customizeOpen ? (
        <p className="text-[12px] text-gray-500 -mt-4 mb-6 leading-relaxed">
          Tell us your preferred size, finish, or personalization on WhatsApp — our team will confirm feasibility and timeline.
        </p>
      ) : null}

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <select className="w-full border border-gray-200 rounded px-3 py-2 text-[12px] outline-none appearance-none cursor-pointer bg-white">
            <option>Select Size</option>
            <option>Free size</option>
            <option>Custom</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <button type="button" className="text-[12px] text-[#032C5E] hover:underline whitespace-nowrap">
          Not sure about the size?
        </button>
      </div>
      */}

      <div className="flex flex-row gap-3 mb-6">
        {displayPrice != null && Number(displayPrice) > 0 ? (
          <BuyNowButton item={cartItem} className="flex-1" />
        ) : null}
        <a
          href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 px-4 rounded-full hover:bg-[#128C7E] transition-colors uppercase tracking-widest text-[11px] sm:text-[12px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>
      </div>

      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-5 h-5 flex items-center justify-center text-[#00a699]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-[12px] text-gray-500">
          Schedule video call{' '}
          <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="text-[#032C5E] font-medium underline underline-offset-4">
            Book Now
          </a>
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-[13px] font-bold text-[#222] mb-2 uppercase tracking-widest border-b border-gray-200 pb-2">Description</h3>
        <p className="text-[12px] text-gray-600 leading-relaxed">
          {description && description.trim() !== '' && description.length >= 20 ? description.trim() : `Premium ${name} crafted with the finest materials. This exquisite piece features intricate detailing, perfect for elevating your everyday style or making a statement at special events.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-b border-gray-300 pt-1.5 pb-1.5 mb-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-7 h-7 flex items-center justify-center mb-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#032C5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-[11px] text-[#032C5E] uppercase font-bold leading-tight px-1 tracking-tight">
            Lifetime Exchange &amp; Buy-Back
          </span>
        </div>
        <div className="flex flex-col items-center text-center border-l border-gray-300">
          <div className="w-7 h-7 flex items-center justify-center mb-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#032C5E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-[11px] text-[#032C5E] uppercase font-bold tracking-tight">Certified Jewellery</span>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="mt-8 border-t border-gray-200">

        {/* Section 2: Authenticity Guarantee */}
        <div className="border-b border-gray-200">
          <button
            type="button"
            className="w-full py-4 flex items-center justify-between text-left group"
            onClick={() => setOpenSection(openSection === 'auth' ? null : 'auth')}
          >
            <span className="text-[14px] font-bold text-[#222] uppercase tracking-wide group-hover:text-[#032C5E] transition-colors">
              Authenticity Guarantee
            </span>
            <span className="text-gray-400 group-hover:text-[#032C5E] transition-colors font-medium text-lg">
              {openSection === 'auth' ? '−' : '+'}
            </span>
          </button>
          {openSection === 'auth' && (
            <div className="pb-5 pt-1 text-[13px] text-gray-600 leading-relaxed">
              <p className="mb-2">Every piece of Anagha Jewellery is strictly quality-checked and certified.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Premium Silver:</strong> Minimum 92.5% purity guaranteed.</li>
                <li><strong>Quality Craftsmanship:</strong> Handcrafted with precision and care.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-[12px] text-gray-500 font-medium">
          Any Questions? Please feel free to reach us at:{' '}
          <a href={`tel:${phone.replace(/[^0-9]/g, '')}`} className="text-[#032C5E] font-bold hover:underline whitespace-nowrap">
            {phone}
          </a>
        </p>
      </div>

    </div>
  );
}
