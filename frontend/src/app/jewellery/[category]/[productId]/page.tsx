import ProductGallery from '@/components/ProductGallery';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  
  const gallery: string[] = [];
  if (product.pos_image_url) gallery.push(product.pos_image_url);
  if (product.image_url && product.image_url !== product.pos_image_url) gallery.push(product.image_url);
  if (Array.isArray(product.website_images)) {
    product.website_images.forEach((img: string) => {
      if (!gallery.includes(img)) gallery.push(img);
    });
  }

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
            imageUrl={gallery[0] || null}
            groupSlug={groupSlug}
            netWeight={product.net_weight}
            grossWeight={product.gross_weight}
            description={product.description}
            purity={product.purity}
            metalType={product.metal_type}
            group={product.group}
          />
        </div>
      </div>
    </main>
  );
}
