import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BillEmbed from '@/components/BillEmbed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bill | Anagha',
  robots: { index: false, follow: false },
};

export default async function BillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const id = decodeURIComponent(billId || '').trim();

  return (
    <>
      <Header />
      <main className="w-full bg-white min-h-[70vh]">
        {id ? (
          <div className="w-full h-[calc(100vh-12rem)] min-h-[70vh]">
            <BillEmbed billId={id} />
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
