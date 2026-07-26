import JewelleryListing from '@/components/JewelleryListing';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
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
  searchParams: Promise<{ article?: string; type?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  return (
    <JewelleryListing
      category={category}
      article={sp.article}
      audience={sp.type}
    />
  );
}
