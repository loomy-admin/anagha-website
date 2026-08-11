'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useContactInfo } from '@/lib/contact';
import Link from 'next/link';

export default function TermsConditionsPage() {
  const { email } = useContactInfo();
  return (
    <>
      <Header />
      <main className="w-full bg-[#f5f5f5] min-h-screen font-sans">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            <Link href="/" className="hover:text-[#f1592a] transition-colors">Home</Link>
            {' '}/ <span className="text-gray-600">Terms &amp; Conditions</span>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-16 items-start">
            {/* LEFT: Title + Image */}
            <div className="lg:sticky lg:top-28 flex flex-col items-start pt-8">
              <h1 className="font-domine font-bold text-[38px] md:text-[46px] lg:text-[50px] leading-[1.1] text-[#032C5E] mb-8">
                Terms &amp;<br />Conditions
              </h1>
              <div className="mt-2">
                <img
                  src="/images/footer/terms.webp"
                  alt="Terms & Conditions illustration"
                  className="h-[140px] w-auto object-contain"
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="pt-8 text-[13px] text-[#222] leading-relaxed space-y-8">
              
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Offer Details</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Current promotional offers are valid only on selected designs.</li>
                  <li>Discount values and the eligible designs are subject to change without prior notice.</li>
                  <li>Applicability of existing offers in conjunction with other vouchers is at the sole discretion of Anagha.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Use of the Website</h2>
                <p>By accessing the website, you warrant and represent to the website owner that you are legally entitled to do so and to make use of information made available via the website.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Trademarks</h2>
                <p>The trademarks, names, logos and service marks (collectively "trademarks") displayed on this website are registered and unregistered trademarks of the website owner. Nothing contained on this website should be construed as granting any license or right to use any trademark without the prior written permission of the website owner.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">External links</h2>
                <p>External links may be provided for your convenience, but they are beyond the control of the website owner and no representation is made as to their content. Use or reliance on any external links and the content thereon provided is at your own risk.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Warranties</h2>
                <p>The website owner makes no warranties, representations, statements or guarantees (whether express, implied in law or residual) regarding the website.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Prices</h2>
                <p className="mb-2">Our pricing is calculated using current precious metal and gem prices to give you the best possible value. These prices do change from time to time, owing to the fluctuations in prices of precious metal and gem prices, so our prices change as well.</p>
                <p>Prices on anagha.com are subject to change without notice. Please expect to be charged the price for the Anagha merchandise you buy as it is listed on the day of purchase.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Disclaimer of liability</h2>
                <p className="mb-2">The website owner shall not be responsible for and disclaims all liability for any loss, liability, damage (whether direct, indirect or consequential), personal injury or expense of any nature whatsoever which may be suffered by you or any third party (including your company), as a result of or which may be attributable, directly or indirectly, to your access and use of the website, any information contained on the website, your or your company's personal information or material and information transmitted over our system. In particular, neither the website owner nor any third party or data or content provider shall be liable in any way to you or to any other person, firm or corporation whatsoever for any loss, liability, damage (whether direct or consequential), personal injury or expense of any nature whatsoever arising from any delays, inaccuracies, errors in, or omission of any share price information or the transmission thereof, or for any actions taken in reliance thereon or occasioned thereby or by reason of non-performance or interruption, or termination thereof.</p>
                <p>We as a merchant shall be under no liability whatsoever in respect of any loss or damage arising directly or indirectly out of the decline of authorization for any Transaction, on Account of the Cardholder having exceeded the preset limit mutually agreed by us with our acquiring bank from time to time.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Conflict of terms</h2>
                <p>If there is a conflict or contradiction between the provisions of these website terms and conditions and any other relevant terms and conditions, policies or notices, the other relevant terms and conditions, policies or notices which relate specifically to a particular section or module of the website shall prevail in respect of your use of the relevant section or module of the website.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Severability</h2>
                <p>Any provision of any relevant terms and conditions, policies and notices, which is or becomes unenforceable in any jurisdiction, whether due to being void, invalidity, illegality, unlawfulness or for any reason whatever, shall, in such jurisdiction only and only to the extent that it is so unenforceable, be treated as void and the remaining provisions of any relevant terms and conditions, policies and notices shall remain in full force and effect.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Cancellation &amp; Returns</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>You can cancel your order for a product at no cost (this does not apply to Custom Solitaires) any time before we send the Dispatch Confirmation E-mail relating to that product. You can cancel one order item within an order without cancelling the entire order if the order contains 2 or more order items.</li>
                  <li>For prepaid orders, the amount will be credited to your Blue Cash account which can be used for another purchase or refunded to the payment source (Credit Card/Debit Card /Net Banking).</li>
                  <li>Custom Solitaires: If you cancel an order for a Custom Solitaire, 10% of the Solitaire Price will be issued as a voucher (valid for 12 months and redeemable only on diamond‑studded jewellery). The remaining amount will be refunded to your Blue Cash account.</li>
                  <li>Other Customized Orders: If you cancel a Customized Order, 10% of the product value will be refunded to you as Blue Credits and the remaining amount will be refunded to your Blue Cash account.</li>
                  <li>Once the product is returned under our 30 Day Money Back policy (not applicable on Solitaires above INR 3 lakh, Custom Solitaires, Coins and Customized Orders) the refund will be credited to your Blue Cash account. You may choose to either make another purchase using the same or get the amount refunded to your bank account.</li>
                  <li>For cash on delivery orders, the refund will be processed to your bank account.</li>
                  <li>Upon cancellation/ return of orders placed using gift cards, the gift card amount will be refunded back to the gift card.</li>
                  <li>Please visit <Link href="/shipping-returns" className="text-[#1a73e8] underline">Shipping &amp; Returns</Link> for more details about our Returns Policy.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Applicable laws</h2>
                <p className="mb-2">Use of this website shall in all respects be governed by the laws of the state of Telangana, India, regardless of the laws that might be applicable under principles of conflicts of law. The parties agree that the courts located in India country, Telangana, shall have exclusive jurisdiction over all controversies arising under this agreement and agree that venue is proper in those courts.</p>
                <p>As per the current guidelines mandated by the Government of India, a customer has to provide the Permanent Account Number (PAN) for all purchases above INR 2 lakh.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Contests</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The winners of contests and giveaways will be selected at the company's discretion.</li>
                  <li>The prizes/ gifts/ giveaways are non-returnable/ exchangeable.</li>
                  <li>Any additional facilities provided by the company to winners and selectees of any contest is at the company's discretion</li>
                  <li>Anagha reserves the right to change the terms and conditions of contests/ giveaways without prior intimation.</li>
                  <li>All disputes will be resolved at <a href={`mailto:${email}`} className="text-[#1a73e8] underline">{email}</a></li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Visa Terms and Conditions</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Offer details as shown are based on information provided by the Merchant. No warranties are made by Visa that the information is correct. Please check directly with Merchant to confirm availability and validity of the Offer.</li>
                  <li>The Merchant is the sole provider of all goods and/or services under this offer. Accordingly, the Visa Cardholder understands, acknowledges and agrees that the procurement by him/her of any goods and/or services under this Offer shall constitute a contract solely between the merchant and him/her, and Visa is not, nor will become, a party thereto.</li>
                  <li>By utilizing or attempting to utilize any of the goods and services under this Offer, the Visa Cardholder understands, acknowledges and agrees that:
                    <ul className="list-[circle] pl-5 mt-1.5 space-y-1.5">
                      <li>Any claim, complaint or dispute of any nature arising out of or in relation to the procurement, or attempted procurement by the cardholder of any goods and/or services under this offer (each a "Claim") shall be settled by the Visa Cardholder directly with the Merchant, and Visa Cardholder shall not make any Claim against Visa.</li>
                      <li>Without prejudice to the foregoing, and to the fullest extent permitted by law, Visa shall not be liable to any person for any loss, damage, expenses or claim (whether direct or indirect) in relation to any personal injury, death, false representation, damage or omission arising from or in connection with the usage or attempted usage of the Offer or goods and/or services provided under the Offer.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Blue Cash</h2>
                <p>Your Blue Cash is valid only for one year (365 days) from the day you receive the same. Blue Cash will expire after 365 days from the day it's credited in your account.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Blue Credits</h2>
                <p>Blue Credits expire as per the timelines mentioned to you when these are provided to you. Your Blue Credits are valid at most for one year (365 days) from the day you receive the same. Blue Credits will expire after 365 days from the day it's credited in your account.</p>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Free Gift</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>All free gifts are treated as discounts.</li>
                  <li>In Case of Partial Cancellation or Returns of Orders with a Free gift, the Amount refunded will not include the discount attributed to the Free Gift.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Other conditions</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Any updates to account details may take up to 7 business days to be processed</li>
                  <li>All Disney merchandise orders to be shipped within India, international orders cannot be fulfilled for this collection</li>
                  <li>Sign up credits cannot be used for purchase of coins</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Offer Terms &amp; Conditions</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Special offer is valid only on select designs on jewellery.</li>
                  <li>Anagha may change (add to, delete, or amend) these terms from time to time.</li>
                  <li>All disputes, with respect to the products and services offered in this connection, are subject to Hyderabad jurisdiction.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Gold Mine 10+1 Monthly Installment Plan</h2>
                <div className="space-y-4">
                  <h3 className="font-semibold text-[#222]">Subscription</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>You can subscribe for our Gold Mine 10+1 Plan by selecting a fixed monthly installment amount. Minimum installment amount is INR 1000 and the monthly installment amount can be any amount in multiples of INR 100. At the end of the 11th month you will be eligible for a special discount equivalent to one-month amount.</li>
                    <li>Any person subscribing to the Gold Mine 10+1 Plan should be 18 years or above and should be a resident Indian.</li>
                    <li>Your Gold Mine plan is not transferable. However, in the event of the death of the subscriber, the nominee specified at the time of subscription will have the right to pay the balance installment amount(s) (if any) and buy products using the Gold Mine 10+1 Plan of the user.</li>
                    <li>The Company reserves the right to cancel and refund the money towards your Gold Mine 10+1 Plan installment if there is any discrepancy in the details submitted by you or you do not submit valid ID proof within 30 days of enrollment or you breach the terms and conditions. In such cases, the amount paid by you towards subscription will be refunded. The refund need not be in the same payment mode used by the subscriber at the time of making the payment. It will be as per company policy.</li>
                    <li>In any case whatsoever, we will not pay any interest on the installment amount.</li>
                  </ul>
                  
                  <h3 className="font-semibold text-[#222]">Payment and Redemption</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>The monthly installment amount needs to be paid on or before the monthly due date. Payments can be made at any our stores or online.</li>
                    <li>Under Gold Mine 10+1 Plan you will be entitled to purchase diamond studded, gemstone studded, plain gold and preset soltaire jewellery. You cannot purchase coins or solitaires under this plan.</li>
                    <li>Your Gold Mine 10+1 Plan will be auto redeemed on the maturity date. A voucher (the value of which depends on number of installments paid and the date they are paid on) will be issued to you against your plan and will be valid for 7 months. You can use the voucher to make your purchase at any of our stores or online.</li>
                    <li>If you wish to redeem your Gold Mine 10+1 Plan early, you can do so from the 6th month onwards. Please note that you will be entitled to lower special discount if you choose to do so.</li>
                  </ul>
                  
                  <h3 className="font-semibold text-[#222]">Discount</h3>
                  <p>You are eligible for discounts from the 6th month onwards and after 5 installment are paid on time.</p>
                  <div className="overflow-x-auto my-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-100">
                          <th className="p-2 font-semibold">You pay for</th>
                          <th className="p-2 font-semibold">Discount</th>
                          <th className="p-2 font-semibold">Redemption month</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">10 months</td>
                          <td className="p-2">100% of one installment + 1st installment discount</td>
                          <td className="p-2">11th month</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">7 months</td>
                          <td className="p-2">50% of one installment + 1st installment discount</td>
                          <td className="p-2">8th month</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">5 months</td>
                          <td className="p-2">25% of one installment + 1st installment discount</td>
                          <td className="p-2">6th month</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="italic text-gray-500">Note: You are not eligible for any discount (including 1st installment discount) if you pay less than 5 installments or make more than 2 late payments.</p>
                  
                  <h3 className="font-semibold text-[#222]">Delay in Installment Payments</h3>
                  <p>If you miss paying more than 2 installments within the due date you will not be eligible for any discount. The voucher amount will be the same as the sum of installment amounts paid by you.</p>

                  <h3 className="font-semibold text-[#222]">Cancellation/Termination</h3>
                  <p className="mb-2">If you choose to cancel/terminate the Gold Mine 10+1 Plan, you will be entitled to receive a voucher for the total amount paid by you against the plan. This voucher can be used to purchase diamond studded, gemstone studded, plain gold and preset soltaire jewellery. You cannot purchase coins or solitaires under this plan. You will not be entitled for a refund of the monthly installments or any portion thereof, paid by you towards the plan.</p>
                  <p>Any discount given under the Gold Mine 10+1 Plan will be deducted at the time of cancellation/termination.</p>
                </div>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Gift Card</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The Gift Card will be activated 48 hours after purchase.</li>
                  <li>You can redeem Gift Card(s) on anagha.com, the Anagha app and offline stores.</li>
                  <li>Gift Card(s) bought from anagha.com can be redeemed on all jewellery, all solitaires and all coins.</li>
                  <li>Gift Card(s) bought from other platforms can be used on specific categories only. Please check the type of Gift Card before confirming the type of jewellery or coin that can be bought via it.</li>
                  <li>On the Cart page, click on the link "I have a voucher code/gift card" and enter your 16-digit Gift Card number and pin for redemption.</li>
                  <li>Multiple Gift Card(s) can be used in a single transaction. You may combine Gift Card(s) with any other payment type.</li>
                  <li>Gift Card(s) can also be partially redeemed, as often as a user wishes to, till its balance is consumed or it expires.</li>
                  <li>Gift Card(s) are valid for a period of 6 months from the date of issuance to the recipient.</li>
                  <li>Gift Card(s) cannot be used to purchase another Gift Card.</li>
                  <li>Payment mode will be Net Banking, Credit/Debit Card, UPI, Blue Cash.</li>
                  <li>Gift Card(s), once bought online, shall be considered as sold and cannot be Cancelled, Exchanged or Refunded.</li>
                  <li>If lost or misused, the Gift Card(s) cannot be replaced. Gift Card(s) are void if resold, cannot be exchanged for credit(s) or cash, and cannot be re-validated once expired.</li>
                  <li>In addition to these Terms and Conditions, Anagha Gift Card(s) and their use on our website are also subject to Anagha's general Terms of Use &amp; Anagha's decision will be final in case of any dispute.</li>
                  <li>Anagha may change (add to, delete, or amend) these terms from time to time. Unless stated otherwise, the changes will apply to any new Anagha gift card. Any Gift Card(s) you purchase are for personal, non-commercial use and enjoyment only. The same may be shared with family and friends but may not be advertised, sold or used as promotional items by the purchaser or anyone else without Anagha's prior written consent.</li>
                  <li>All disputes concerning the products and services offered in this connection are subject to Hyderabad jurisdiction.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Big Gold Upgrade</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The Old Gold must be plain gold jewellery, biscuits, bars, or coins. This offer does not cover Old Gold with diamonds or gemstones.</li>
                  <li>You may avail the Big Gold Upgrade benefit to get an instant 1% benefit over the current market gold rate on all purities.</li>
                  <li>The value of the Old Gold will be calculated based on its purity and weight. To avail this offer, the customer must consent to the cutting/melting of the products. Anagha's Karatmeters will generate the purity reading.</li>
                  <li>Once all participating parties agree on purity, weight and valuation, the offered value against the Old Gold jewellery will be credited to the customer's OTP-verified Anagha account in the form of Blue Credits.</li>
                  <li>Once the value is credited to your Anagha account, the Old Gold cannot be returned to you.</li>
                  <li>Your Blue Credits are valid at most for one year (365 days) from the day you receive them and can be used to purchase any jewellery from Anagha except Coins and Solitaires.</li>
                  <li>You'll be required to sign a collection receipt at the store. It indicates that you have read, understood and accepted the terms and conditions of our Big Gold Upgrade/Old Gold Exchange programme.</li>
                  <li>PAN Card is mandatory for Big Gold Upgrade/Old Gold Exchange. The name on the PAN Card should match the customer's name.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">True Blue</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The True Blue loyalty program subscription is valid only for a year from the date of enrollment.</li>
                  <li>The True Blue loyalty program subscription will exhaust after three usages or a year from the date of enrollment, whichever is earlier.</li>
                  <li>The True Blue loyalty program subscription has to be enrolled at a physical Anagha store, but the redemption of benefits can be done at a store, or online on the Anagha app or website.</li>
                  <li>The True Blue loyalty program can either be bought as a standalone program by paying the above amount or can be bought while billing a product (in which case a discount will be applied on the product, and the enrollment fee will be charged).</li>
                  <li>Customers can choose a program by paying ₹2,000, ₹5,000, or ₹10,000 during billing.</li>
                  <li>The program benefits can be applied to three invoices in total (each invoice needs to be in separate calendar months.)</li>
                  <li>The True Blue loyalty program benefits are available on all item categories except coins and solitaires.</li>
                  <li>Diamond-studded and platinum diamond-studded jewellery will have up to 50% off on making charges, and other jewellery will have up to 20% off on making charges, up to the amount paid during enrollment.</li>
                  <li>The voucher(s) for plain gold jewellery will be capped at 20% off on offered making charges, up to the amount paid during enrollment (after ongoing discounts).</li>
                  <li>The voucher(s) for diamond jewellery will be capped at 50% off on offered making charges, up to the amount paid during enrollment (after ongoing discounts).</li>
                  <li>Discounts can be clubbed with ongoing discounts and vouchers, (but not the Gold Mine 10+1 program.)</li>
                  <li>Discounts up to the amount initially paid; can be used a total of three times (once per calendar month).</li>
                  <li>You can also use the discount along with a voucher for Gold Mine 10+1 program for one billing, and get an additional 20% off on making charges for diamond-studded jewellery, and 10% off on making charges for other categories.</li>
                  <li>Milestone rewards will be offered on purchases of 1 lakh, 2 lakhs and 3 lakhs.</li>
                  <li>Milestone reward for a total purchase of 1 lakh will be a surprise gift.</li>
                  <li>Milestone reward for a total purchase of 2 lakhs will be a free diamond jewellery voucher (worth ₹3,000).</li>
                  <li>Milestone reward for a total purchase of 3 lakhs will be a free diamond jewellery voucher (worth ₹5,000).</li>
                  <li>Milestones must be achieved within three uses of the subscription.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Gold Reserve Plan</h2>
                <div className="space-y-4">
                  <p className="font-semibold text-[#222]">Effective Date: November 17, 2025</p>
                  
                  <h3 className="font-semibold text-[#222]">Definitions:</h3>
                  <p>Unless the contrary intention appears, capitalised terms used in these Terms and Conditions (“T&amp;C”) shall have the meaning ascribed to them below. In addition to the below terms, certain other capitalised terms have been defined within the body of these T&amp;C in bold letters and enclosed within quotes (“”), which shall, unless the contrary intention appears, have the meaning as ascribed therein.</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong>2.1. “Applicable Law”</strong> means all applicable laws, regulations, rules, orders, notifications, circulars and directions of any governmental or regulatory authority in India.</li>
                    <li><strong>2.2. “Blue Cash”</strong> means the cash balance available in Subscriber’s account maintained with Anagha, usable only on the Company’s website, Company’s mobile application, or at Company Stores, subject to its applicable terms and validity. Blue Cash is refundable upon the Subscriber’s instructions.</li>
                    <li><strong>2.3. “Company”, “we”, “us” or “our”</strong> means Anagha Jewellery and Lifestyle Limited.</li>
                    <li><strong>2.4. “Grace Period”</strong> means a period of 15 days after the Monthly Due Date for payment of the relevant Installment.</li>
                    <li><strong>2.5. “Gold Rate”</strong> means the 24 karat gold selling rate published by the Company and applicable at the time of the relevant event (payment, maturity or termination, as the case may be). The Gold Rate may differ from market or third‑party rates and may vary intraday.</li>
                    <li><strong>2.6. “Installment”</strong> means each monthly amount selected at Subscription and payable for the Plan.</li>
                    <li><strong>2.7. “Maturity Date”</strong> means the date falling in the next month after the 10th installment Due Date that bears the same numerical day as the Start Date; if such day does not exist in that month (for example, February 30 or February 31), the Maturity Date shall be the last calendar day of that month. On the Maturity Date, the Plan auto-redeems.</li>
                    <li><strong>2.8. “Nominee”</strong> means the person nominated by the Subscriber at Subscription who may utilise the Plan on the Subscriber’s death.</li>
                    <li><strong>2.9. “Plan”</strong> means the Anagha Gold Reserve plan governed by these T&amp;C.</li>
                    <li><strong>2.10. “Primary Voucher”</strong> means the e‑voucher issued at maturity equal to the value of total Reserved Gold Units at the Gold Rate on the Maturity Date.</li>
                    <li><strong>2.11. “Reserved Gold Units”</strong> means the notional gold units accumulated for the Plan by dividing each Installment amount by the applicable Gold Rate at payment time. No physical gold is purchased, held, or allocated.</li>
                    <li><strong>2.12. Special Benefit Voucher”</strong> means the additional e‑voucher described in clause 3 below, subject to eligibility and delay rules.</li>
                    <li><strong>2.13. “Start Date”</strong> means the date on which the first Installment is successfully paid.</li>
                    <li><strong>2.14. “Subscriber”, “you” or “your”</strong> means the person enrolled in the Plan.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">3. Nature of Plan:</h3>
                  <p>The Plan is a retail installment scheme under which the subscriber pays monthly Installments and accumulates Reserved Gold Units solely for calculating the Primary Voucher at maturity. No physical gold is purchased, held, allocated, or delivered to the Subscriber at any time, and no bailment, trust or custodial relationship arises. The Plan is not a deposit, chit fund, collective investment scheme, portfolio management service or investment product. No interest, yield or investment return is payable by the Company.</p>

                  <h3 className="font-semibold text-[#222]">4. Subscription:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>4.1. Any person may subscribe to the Plan by selecting a monthly Installment amount. The minimum Installment amount is INR 2,000, and the monthly Installment amount can be any amount in multiples of INR 100. Under the Plan, the Subscriber pays a fixed monthly Installment and accumulates Reserved Gold Units calculated as the Installment amount divided by the Gold Rate at the time of payment. On the Maturity Date, the total Reserved Gold Units are converted into a Primary Voucher based on the Gold Rate on that date. Subject to clause 5 below, an optional Special Benefit Voucher may be available at purchase.</li>
                    <li>4.2. You must be at least 18 years of age and a resident of India to subscribe.</li>
                    <li>4.3. The Plan is non‑transferable. Upon the Subscriber’s death, the Nominee recorded at Subscription may, subject to KYC completion, pay any outstanding Installments and utilise the Plan.</li>
                    <li>4.4. The Company reserves the right to suspend or cancel the Plan and refund amounts received (in a mode determined by the Company) if there is any discrepancy in the details submitted by the Subscriber, if valid KYC (including government photo ID and, where applicable, PAN) is not completed within 30 days of enrollment, if you breach these T&amp;C, or as required by Applicable Law or a competent authority.</li>
                    <li>4.5. No interest is payable on any Installment amount.</li>
                    <li>4.6. You cannot switch between Gold Reserve and Gold Mine plans or merge two Gold Reserve Plans.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">5. Payment and Redemption:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>5.1. Each monthly Installment is due on the same calendar day as the Start Date (Monthly Due Date). For example, if the Plan begins on 5 January, each Installment is due on the 5th of the subsequent months. If, in any month, such calendar day does not exist (for example, February 30 or February 31), the Installment for that month shall be due on the last calendar day of that month. For the avoidance of doubt, this date‑adjustment rule applies to all references to any ‘Installment Date’ or ‘Monthly Due Date’ in these T&amp;C.</li>
                    <li>5.2. Payments can be made at any of our stores or online.</li>
                    <li>5.3. Installments may be paid from the 1st day of each month up to the Monthly Due Date. A Grace Period of 15 days applies after the Monthly Due Date. Payments received after the Grace Period are “Delayed Payments.” For each day of total delay beyond the Grace Period (aggregated across Installments), the Special Benefit Voucher value is reduced by 1/30th. If total delay exceeds 30 days, you are ineligible for any Special Benefit Voucher.</li>
                    <li>5.4. Under the Plan, you may purchase diamond‑studded jewellery, gemstone‑studded jewellery, Plain Gold Jewellery, Plain Platinum Jewellery and preset solitaire jewellery. The Subscriber cannot purchase coins or solitaires under this Plan.</li>
                    <li>5.5. The Plan auto‑redeems on the Maturity Date (date falling in the next month after the 10th installment Due Date that bears the same numerical day as the Start Date, or if such date does not exist, the last day of that month). A Primary Voucher equal to the value of your total Reserved Gold Units at the Gold Rate on the Maturity Date will be issued and will be valid for 7 months. The Primary Voucher may be used partially within its validity.</li>
                    <li>5.6. Early redemption is permitted from the second month onwards. Early redemption disqualifies you from any Special Benefit Voucher.</li>
                    <li>5.7. Cash payments across all Installments for a Plan must not exceed INR 2,00,000 in aggregate, subject to Applicable Law.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">6. Special Benefit Vouchers:</h3>
                  <ul className="list-none space-y-1.5">
                    <li>6.1. Subject to payment of all 10 Installments and the delay rules in clause 5.3 above, you may choose, at the time of purchase, one of the following Special Benefit Vouchers:
                      <ul className="list-[lower-alpha] pl-5 mt-1.5 space-y-1.5">
                        <li>a. Plain Gold Voucher, valued at 50% of one Installment amount, applicable only on Plain Gold Jewellery.</li>
                        <li>b. Non-Plain Gold Voucher, valued at 100% of one Installment amount, applicable on diamond-studded, gemstone-studded, plain platinum, and preset solitaire jewellery.</li>
                      </ul>
                    </li>
                    <li>6.2. At the time of purchase, the subscriber must choose one of the two vouchers. Once a voucher is selected and applied, the alternate voucher becomes unavailable.</li>
                    <li>6.3. Coins and solitaires cannot be purchased using any Special Benefit Voucher.</li>
                    <li>6.4. Special Benefit Vouchers cannot be combined or applied across both Plain Gold and Non-Plain Gold categories (diamond-studded, gemstone-studded, plain platinum, and preset solitaire) simultaneously.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">7. Cancellation/Termination:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>7.1. If you cancel the Plan within the first 30 days and before paying the second Installment, you will receive Blue Cash equal to the total amount paid. No vouchers will be issued and the Plan will end.</li>
                    <li>7.2. If you cancel after 30 days or after paying the second Installment, you will receive a voucher equal to the value of your Reserved Gold Units at the Gold Rate on the date of termination. No cash refund is provided. Purchases remain limited to the categories in clause 4.4; Coins and Solitaires cannot be purchased. Any discounts previously availed will be adjusted at cancellation.</li>
                    <li>7.3. The Company may cancel or suspend the Plan where required by Applicable Law, for suspected fraud, misuse, KYC/AML or sanctions concerns, operational exigencies, or system errors. Treatment of Plan value will follow clause 4.4.</li>
                    <li>7.4. Vouchers may be combined with other Company vouchers or promotional offers only as permitted by their respective terms. Vouchers from different plans under the same Anagha account may be clubbed, subject to their terms. Vouchers from different Anagha accounts cannot be clubbed.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">8. Errors; reversals; communications; privacy</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>8.1. The Company may rectify any erroneous credit or debit to the Plan or any Voucher and may reverse benefits credited in error.</li>
                    <li>8.2. If a payment is debited from your funding source but not received by the Company, the amount will be applied upon receipt or refunded in accordance with Company policy.</li>
                    <li>8.3. By enrolling, you consent to receive operational communications (including e‑mail/SMS/telephone/app notifications) regarding the Plan. Marketing communications are subject to your consent preferences.</li>
                    <li>8.4. The Company will process personal data in accordance with its Privacy Policy.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">9. Limitation of liability:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>9.1. The Company is not liable for any indirect, incidental, special, consequential or punitive damages, loss of profit, or losses arising from fluctuations in gold prices or changes to the Gold Rate.</li>
                    <li>9.2. The Company is not liable for delay or non‑performance due to events beyond its reasonable control, including network failures, system outages, regulatory actions, or acts of God.</li>
                  </ul>

                  <h3 className="font-semibold text-[#222]">10. Amendments; notices; miscellaneous:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>10.1. The Company may amend these T&amp;C or programme features prospectively by posting an updated version on the Website and/or notifying you. Material changes will not adversely affect rights already accrued (e.g., value already vested in a Primary Voucher), except as required by Applicable Law.</li>
                    <li>10.2. Notices may be given electronically to your registered e mail address or via in account notifications.</li>
                    <li>10.3. If any provision is held invalid or unenforceable, the remainder shall continue in full force. No failure or delay to enforce constitutes a waiver. These T&amp;C constitute the entire agreement regarding the Plan.</li>
                    <li>10.4. These T&amp;C are governed by the laws of India.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2 uppercase tracking-wide">Fair Use Policy</h2>
                <p className="mb-2">At Anagha, we aim to maintain a fair, safe and enjoyable shopping experience for all customers. To do this, we have a policy that prohibits certain types of misuse of our services. The policy prohibits behaviours such as excessively ordering or returning products beyond normal personal or household use, frequently cancelling or returning items on the false grounds, serial returning, using services for commercial purposes, engaging in fraud (including fake or altered returns), exploiting promotions or referral programmes, coupons, cashbacks, or any limited-time offers, creating multiple /proxies accounts to bypass limit or extract extra benefits and behaving abusively, threateningly, or unethically towards our staff, delivery partners, or vendors . Examples include repeatedly ordering multiple versions of the same high-value item with the intent to return most of them, attempting to manipulate refunds, non-cooperation with return or pickup processes (including repeated non-availability for scheduled pickup attempts), or using our services for resale or rental.</p>
                <p className="mb-2">This policy does not prevent you from exercising your legal rights under Indian law or your rights under Anagha’s own terms and policies. You can still return or exchange defective, damaged, or incorrect items in line with our Returns Policy and reasonably use services like 30-Day Returns, Lifetime Exchange and Buy back for genuine personal use.</p>
                <p>We may assess non-compliance with this policy by analysing patterns in your account activity, including order volume and value, your history and reasons for returns, exchanges and cancellations, and any attempts to bypass our limits or policies. We reserve the right to take appropriate action if you do not comply with this policy, including issuing warnings, restricting access to certain features (such as promotions or easy returns), refusing orders or returns, cancelling pending orders, closing accounts, and, in serious cases (such as suspected fraud), reporting matters to law enforcement or pursuing legal action.</p>
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
