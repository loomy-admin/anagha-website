'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProductRedirect({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/upload/jewellery/${categorySlug}?add=1`);
  }, [categorySlug, router]);
  return (
    <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-label="Loading">
      <span className="w-10 h-10 border-2 border-navy/15 border-t-navy rounded-full animate-spin" />
    </div>
  );
}
