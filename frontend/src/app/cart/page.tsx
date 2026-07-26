import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartPage from '@/components/CartPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shopping cart | Anagha',
};

export default function CartRoute() {
  return (
    <>
      <Header />
      <main className="w-full bg-[#f9f9f9] min-h-screen font-sans pb-16">
        <CartPage />
      </main>
      <Footer />
    </>
  );
}
