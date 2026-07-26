import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AccountOrders from '@/components/AccountOrders';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order history | Anagha',
};

export default function AccountOrdersPage() {
  return (
    <>
      <Header />
      <main className="w-full bg-[#f9f9f9] min-h-screen font-sans pb-16">
        <AccountOrders />
      </main>
      <Footer />
    </>
  );
}
