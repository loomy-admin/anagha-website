import JewelleryListing from '@/components/JewelleryListing';

export const metadata = {
  title: 'All Jewellery | Anagha',
  description: 'Explore our complete collection of exquisite jewellery.',
};

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; article?: string; search?: string; price_min?: string; price_max?: string }>;
}) {
  const sp = await searchParams;
  return (
    <JewelleryListing
      key={`all-${sp.search || ''}-${sp.price_min || ''}-${sp.price_max || ''}`}
      audience={sp.type}
      article={sp.article}
      search={sp.search}
      priceMin={sp.price_min ? Number(sp.price_min) : undefined}
      priceMax={sp.price_max ? Number(sp.price_max) : undefined}
    />
  );
}
