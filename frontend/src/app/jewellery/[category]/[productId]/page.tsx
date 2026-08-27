import ProductGallery from '@/components/ProductGallery';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { itemGalleryUrls, type CatalogItem } from '@/lib/erpCatalog';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4001';

async function loadItem(tag: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/catalog/items/${encodeURIComponent(tag)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data || null;
  } catch {
    return null;
  }
}

async function loadRelated(groupSlug: string, excludeTag: string): Promise<CatalogItem[]> {
  try {
    const qs = new URLSearchParams({
      group: groupSlug,
      limit: '12',
      offset: '0',
    });
    const res = await fetch(`${BACKEND_URL}/api/catalog?${qs}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const body = await res.json();
    const items = Array.isArray(body?.data?.items) ? (body.data.items as CatalogItem[]) : [];
    return items.filter((item) => item.tag_number !== excludeTag).slice(0, 8);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; productId: string }>;
}) {
  const { productId } = await params;
  const item = await loadItem(productId);
  return {
    title: item ? `${item.name} | Anagha` : 'Product | Anagha',
    description: item?.description || 'View details of our exquisite jewellery collection.',
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; productId: string }>;
}) {
  const { category, productId } = await params;
  const product = await loadItem(productId);

  if (!product) {
    notFound();
  }

  const groupSlug = product.group_slug || category;
  const related = await loadRelated(groupSlug, product.tag_number);

  const gallery = itemGalleryUrls(product);

  return (
    <main className="w-full bg-white min-h-screen font-sans pb-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-2">
        <p className="text-[11px] text-gray-400 uppercase tracking-widest break-words leading-relaxed">
          <Link href="/" className="hover:text-[#f1592a] transition-colors">Home</Link>
          {' '}/ <Link href="/jewellery" className="hover:text-[#f1592a] transition-colors">Jewellery</Link>
          {' '}/{' '}
          <Link href={`/jewellery/${groupSlug}`} className="hover:text-[#f1592a] transition-colors capitalize">
            {(product.group || category).replace(/-/g, ' ')}
          </Link>
          {' '}/ <span className="text-gray-600">{product.name}</span>
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-20">
          <div className="w-full lg:w-[45%] flex flex-col items-center">
            <ProductGallery images={gallery} alt={product.name} product={product} />
          </div>

          <ProductDetailPanel
            name={product.name}
            tagNumber={product.tag_number}
            displayPrice={product.display_price}
            mrp={product.mrp}
            imageUrl={gallery[0] || null}
            groupSlug={groupSlug}
            netWeight={product.net_weight}
            grossWeight={product.gross_weight}
            totalWeight={product.total_weight}
            description={product.description}
            purity={product.purity}
            metalType={product.metal_type}
            group={product.group}
            article={product.article}
          />
        </div>
      </div>

      {related.length ? (
        <section className="max-w-[1400px] mx-auto px-4 md:px-8 mt-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[#f1592a] font-bold mb-1">
                More in this collection
              </p>
              <h2 className="font-domine text-2xl text-[#032C5E] font-bold capitalize">
                {(product.group || category).replace(/-/g, ' ')}
              </h2>
            </div>
            <Link
              href={`/jewellery/${encodeURIComponent(groupSlug)}`}
              className="text-[11px] font-bold uppercase tracking-widest text-[#032C5E] hover:underline whitespace-nowrap"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {related.map((item) => (
              <ProductCard key={item.tag_number} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
