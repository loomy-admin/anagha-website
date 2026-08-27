import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Invoice | Anagha',
  robots: { index: false, follow: false },
};

export default async function BillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const id = decodeURIComponent(billId || '').trim();
  if (!id) return null;
  redirect(`/api/site/invoice/${encodeURIComponent(id)}`);
}
