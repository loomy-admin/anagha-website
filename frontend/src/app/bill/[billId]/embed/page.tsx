import BillEmbed from '@/components/BillEmbed';

export const dynamic = 'force-dynamic';

export default async function BillEmbedPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const id = decodeURIComponent(billId || '').trim();

  return (
    <main className="h-screen w-full bg-white overflow-hidden">
      {id ? <BillEmbed billId={id} /> : null}
    </main>
  );
}
