import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'My Account | Anagha',
};

export default function AccountDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="w-full bg-[#f9f9f9] min-h-screen font-sans pb-16 pt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h1 className="font-domine text-[22px] sm:text-[28px] text-[#032C5E] font-bold mb-6 sm:mb-8">My Account</h1>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 shrink-0 bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
              <nav className="flex flex-col">
                <Link
                  href="/account/orders"
                  className="px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  Order History
                </Link>
                <Link
                  href="/account/address"
                  className="px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  Addresses
                </Link>
                <Link
                  href="/account/profile"
                  className="px-6 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  My Profile
                </Link>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-w-0">
              {children}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
