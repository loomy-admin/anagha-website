import JewelleryListing from '@/components/JewelleryListing';

export const metadata = {
  title: 'All Jewellery | Anagha',
  description: 'Explore our complete collection of exquisite jewellery.',
};

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; article?: string }>;
}) {
  const sp = await searchParams;
  return <JewelleryListing audience={sp.type} article={sp.article} />;
}
