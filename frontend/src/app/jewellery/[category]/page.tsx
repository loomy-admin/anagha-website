import JewelleryListing from '@/components/JewelleryListing';

export const dynamic = 'force-dynamic';

console.log('generateMetadata run'); export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const title = category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${title} | Anagha`,
    description: `Shop our exclusive ${title} collection from live store inventory.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ article?: string; type?: string; search?: string; price_min?: string; price_max?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  return (
    <JewelleryListing
      key={`cat-${category}-${sp.search || ''}-${sp.price_min || ''}-${sp.price_max || ''}`}
      category={category}
      article={sp.article}
      audience={sp.type}
      search={sp.search}
      priceMin={sp.price_min ? Number(sp.price_min) : undefined}
      priceMax={sp.price_max ? Number(sp.price_max) : undefined}
    />
  );
}
