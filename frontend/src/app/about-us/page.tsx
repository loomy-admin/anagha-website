import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'About Us | Anagha',
  description: 'Learn more about Anagha, India\'s leading destination for high-quality fine jewellery.',
};

const DEFAULT_ABOUT = [
  { title: 'Anagha Jewellery Store - A Stellar Omnichannel Presence', text: "Anagha, founded in 2011, is one of India's largest e-commerce portals for fine jewellery. By seamlessly integrating online and physical retail channels, Anagha has transformed the way consumers experience jewellery shopping. With over 344 retail stores spread across the nation, we are committed to making exquisite fine jewellery accessible. Our omnichannel approach ensures that customers can explore Anagha's extensive collection of fine jewellery at our online jewellery store or a retail store near them. Whether browsing through the curated selection on the website or visiting one of our retail stores, customers have access to a wide range of exquisite designs crafted with precision and attention to detail." },
  { title: 'Redefining the Jewellery Shopping Experience', text: "At Anagha, we're dedicated to enhancing your jewellery shopping experience with unmatched convenience through a highly developed team that ensures every question about your products gets answered. We also have a Lifetime Exchange and Buyback Policy ensuring you can shop with the peace of mind that your investment lasts a lifetime. If you're bored of hoarding outdated gold jewellery, our Big Gold Upgrade enables you to get an instant 1% benefit over the current market gold rate on all purities, while exploring Anagha's exquisite curated collections. To benchmark your jewellery shopping experience a step further, we offer free shipping on all online orders. And in case things don't work out as planned, you can rely on a hassle-free 30 Day Free Returns Policy so you can shop without a care in the world." },
  { title: '7000+ Certified Jewellery Designs', text: "Our jewellery is certified by prestigious authorities such as BIS Hallmark, SGL, IGI, and GSI to ensure the authenticity and quality of every piece. Our extensive range of 7000+ contemporary creations across 100+ collections tells a unique story, each inspired by different facets of life. From gold and platinum to diamonds and gemstones, Anagha offers 100% certified jewellery designs, promising something to suit every mood, moment, and budget. Explore our wide range of categories, which includes gold and diamond rings, earrings, pendants, mangalsutras, bangles, engagement rings, bracelets and more." }
];

export default async function AboutUsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:4001';
  const meta: { about?: { title: string; text: string }[] } = await fetch(`${API_URL}/api/site/landing/content`, { next: { revalidate: 0 } }).then(res => res.json()).catch(() => ({}));
  const aboutCols = meta.about && meta.about.length === 3 ? meta.about : DEFAULT_ABOUT;

  return (
    <>
      <Header />
      <main className="w-full bg-[#fcfcfc] font-domine min-h-screen py-10 sm:py-16 lg:py-24">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          {/* Title Section */}
          <div className="flex flex-col items-center justify-center mb-16">
            <h1 className="text-[26px] md:text-[32px] font-domine font-bold tracking-wide text-[#222] uppercase text-center mb-4">
              ABOUT <span className="text-[#f1592a]">US</span>
            </h1>

            {/* Decorative separator */}
            <div className="flex items-center w-full max-w-[600px] gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="w-[7px] h-[7px] rounded-full bg-[#f1592a] shrink-0"></div>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
          </div>

          {/* Dynamic Content Section */}
          <div className="space-y-16 text-[#4a4a4a] text-[15px] leading-[1.85] text-justify font-sans bg-white p-8 md:p-12 lg:p-16 rounded-2xl shadow-sm border border-gray-100">
            {aboutCols.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-[44px] h-[44px] shrink-0 bg-[#fff5f2] rounded-full flex items-center justify-center">
                    <span className="text-[#f1592a] font-bold text-xl">{idx + 1}</span>
                  </div>
                  <h2 className="text-[20px] md:text-[22px] font-domine font-bold text-[#715c62]">{col.title}</h2>
                </div>
                <p className="whitespace-pre-line text-[14.5px] text-gray-600 ml-0 md:ml-[60px]">
                  {col.text}
                </p>
                {idx !== aboutCols.length - 1 && (
                  <div className="h-px w-full bg-gray-100 mt-10 ml-0 md:ml-[60px]"></div>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
