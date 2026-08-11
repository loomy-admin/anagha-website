'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useContactInfo } from '@/lib/contact';
import Link from 'next/link';

export default function ShippingReturnsPage() {
  const { email } = useContactInfo();
  return (
    <>
      <Header />
      <main className="w-full bg-[#f5f5f5] min-h-screen font-sans">

        {/* Breadcrumb */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            <Link href="/" className="hover:text-[#f1592a] transition-colors">Home</Link>
            {' '}/ <span className="text-gray-600">Shipping &amp; Returns Policy</span>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-16 items-start">

            {/* LEFT: Title + Image */}
            <div className="lg:sticky lg:top-28 flex flex-col items-start pt-8">
              <h1 className="font-domine font-bold text-[38px] md:text-[46px] lg:text-[50px] leading-[1.1] text-[#032C5E] mb-8">
                Shipping &amp;<br />Returns<br />Policy
              </h1>
              <div className="mt-2">
                <img
                  src="/images/footer/shipping.webp"
                  alt="Shipping & Returns illustration"
                  className="h-[140px] w-auto object-contain"
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="pt-8 text-[13px] text-[#222] leading-relaxed space-y-8">

              {/* 30-day money back */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">30-day money back policy*</h2>
                <p className="mb-3">
                  Once the product is returned under our 30-day money back policy (* not applicable on Solitaires above INR 3 lakh, Coins and Customized orders) 100% refund will be credited to your Anagha account.
                </p>
                <ul className="space-y-1 pl-1">
                  <li>- <strong>Blue Cash</strong> — You can refund the amount to your last payment sources or bank account as the case may be.</li>
                  <li>- <strong>Blue Credits</strong> — You can use it for a future purchase. The amount cannot be refunded.</li>
                  <li>- <strong>Voucher/Gift card</strong> — Based on the terms and conditions of the voucher/gift card (for e.g. one-time use vouchers, discount vouchers are not applicable for refund), the amount will be refunded back to the same voucher/gift card.</li>
                </ul>
              </div>

              {/* Free return shipping */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Will I have to pay for shipping the product back to you under the 30-day money back policy?</h2>
                <p>We offer FREE return shipping across India for all products within the 30-day money back policy.</p>
              </div>

              {/* How to return */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">How do I return the product to Anagha within 30 days?</h2>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Select the item in your order that you want to return.</li>
                  <li>Ready your jewellery in the original packing material along with the certificate.
                    <ol className="list-[lower-alpha] pl-5 mt-1.5 space-y-1.5">
                      <li>If the product value is less than Rs. 35,000, then please hand over the product to the person coming for pickup.</li>
                      <li>If the product value is Rs. 35,000 or above and a Anagha employee is picking the product, then please hand over the product to the person coming for pickup.</li>
                      <li>If the product value is Rs. 35,000 or above and if the return pickup has been arranged via one of our 3rd party logistics partners; first you will receive a tamper-proof packet from us. Please secure your jewellery in it and seal it before the pickup person arrives at your doorstep. Once sealed, the packet cannot be opened unless destroyed. We will arrange for the pickup once you have received the tamper-proof packet. On the date when the pickup is scheduled, please hand over the packet with the product to the person.</li>
                    </ol>
                  </li>
                  <li>Please collect an acknowledgement (pickup receipt on paper / photo of tracking number / SMS confirmation of pickup).</li>
                  <li>Once we receive the product at our warehouse, your refund will be processed to your Anagha account in 2–3 working days after a quality check.</li>
                </ol>
              </div>

              {/* Lifetime Exchange & Buy-Back */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Lifetime Exchange &amp; Buy-Back Policy</h2>
                <p className="mb-3">
                  We offer Lifetime Exchange &amp; Buy Back on all purchases* made from Anagha within India, applicable after the expiry of return period under the 30-day money back policy. You may avail Lifetime Exchange &amp; Buy Back by presenting your purchase at a store or raising a request online. The exchange/buy back value will be calculated as per the current market value on the day the exchange request is raised. ₹500 processing charges for shipping and handling, along with any applicable deductions, will be applicable if the LTE/LBB is initiated online. If the product is handed over at the store, ₹500 processing charges will not be applicable.
                </p>
                <p className="mb-3">
                  If you received a discount or any gift while making your purchase, we will deduct the equivalent value, as applicable. You can also choose to return the gift received.
                </p>
                <p>
                  For solitaire jewellery, if the solitaire certificate(s) is missing, then a standard deduction of ₹3,500 will be applicable per certificate. For larger solitaires, the deduction may be higher than ₹3,500 based on the size.
                </p>
              </div>

              {/* Lifetime Exchange */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Lifetime Exchange</h2>
                <p>
                  If you choose to avail Lifetime Exchange on your purchase, the final exchange value will be loaded as Blue Credits in your Anagha account after Quality Check (QC). The Blue Credits will remain valid for 365 days and can be used to purchase jewellery (except Coins and Solitaires) with us. You cannot encash the amount.
                </p>
              </div>

              {/* Lifetime Buy-Back */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Lifetime Buy-Back</h2>
                <p>
                  If you choose to avail Lifetime Buy Back on your purchase, the final buy-back value will be loaded as Blue Cash in your Anagha account after Quality Check (QC). The Blue Cash will remain valid for 365 days and can be used to purchase anything with us or be encashed.
                </p>
              </div>

              {/* Note */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Note</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>You will be required to visit the Order History page within 15 days of receiving the valuation to approve or reject the calculation. Once you accept the valuation, the amount will be refunded to your Anagha account. In case of non-approval beyond 15 days, the amount will be auto-refunded to your Anagha account. In case of rejection, we will ship the jewellery back to you.</li>
                  <li>Based on our quality inspection, we reserve the right to change the exchange/buy back amount of the product.</li>
                  <li>For Anagha products not bought from Anagha Stores/Website/App, an additional deduction of 5% would be charged over and above the above mentioned Lifetime Exchange &amp; Buy Back policy.</li>
                  <li>Anagha products bought from non-Anagha Offline Stores will not be eligible for exchange/buy back.</li>
                </ul>
              </div>

              {/* Free Shipping */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Free Shipping</h2>
                <p>We provide free delivery/shipping on all items within India.</p>
              </div>

              {/* Transit Insurance */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Transit Insurance</h2>
                <p>All goods will be fully insured by Anagha until they reach you, so your purchase is 100% safe.</p>
              </div>

              {/* Customer Delight */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">Customer Delight</h2>
                <p className="mb-2">Need help? Think we could have done something better?</p>
                <p className="mb-2">We are listening and happy to do what we can to improve. Please let us know.</p>
                <p className="mb-2">
                  We can be reached at{' '}
                  <a href={`mailto:${email}`} className="underline">{email}</a>
                  {' '}or at 18004190066 between 9 am–10 pm, 7 days a week.
                </p>
                <p className="mb-1">Our registered office address is:</p>
                <p className="leading-[1.7]">
                  Anagha Jewellery and Lifestyle Limited<br />
                  No. 8-2-293/82/A/270, Road No. 36,<br />
                  Jubilee Hills, Hyderabad – 500033<br />
                  Telangana, India
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
