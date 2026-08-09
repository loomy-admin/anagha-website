import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WishlistPage from '@/components/WishlistPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Wishlist | Anagha',
};

export default function WishlistRoute() {
  return (
    <>
      <Header />
      <main className="w-full bg-[#f9f9f9] min-h-screen font-sans pb-16">
        <WishlistPage />
      </main>
      <Footer />
    </>
  );
}
