import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * Shared chrome for all /jewellery/* routes so Header stays mounted
 * when moving between listing, category, and product pages.
 */
export default function JewelleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
