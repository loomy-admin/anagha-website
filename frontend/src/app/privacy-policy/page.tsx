'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useContactInfo } from '@/lib/contact';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const { email } = useContactInfo();
  return (
    <>
      <Header />
      <main className="w-full bg-[#f5f5f5] min-h-screen font-sans">

        {/* Breadcrumb */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            <Link href="/" className="hover:text-[#f1592a] transition-colors">Home</Link>
            {' '}/ <span className="text-gray-600">Privacy Policy</span>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-16 items-start">

            {/* LEFT: Title + Image */}
            <div className="lg:sticky lg:top-28 flex flex-col items-start pt-8">
              <h1 className="font-domine font-bold text-[38px] md:text-[46px] lg:text-[50px] leading-[1.1] text-[#032C5E] mb-8">
                Privacy<br />Policy
              </h1>
              <div className="mt-2">
                <img
                  src="/images/footer/privacy.webp"
                  alt="Privacy Policy illustration"
                  className="h-[140px] w-auto object-contain"
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="pt-8 text-[13px] text-[#222] leading-relaxed space-y-8">

              {/* 1. Introduction */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">1. Introduction</h2>
                <p className="mb-3">
                  We, Anagha Jewellery and Lifestyle Limited ("Anagha", "we", "us" or "our"), carry out our business from our retail stores and our website (www.anagha.com) and our mobile app (collectively "Platform"). At Anagha, we respect your privacy and are committed to take reasonable precautions to protect your information and comply with our obligations related to privacy.
                </p>
                <p className="mb-3">
                  This policy ("Privacy Policy") outlines the manner in which your information is collected by us through various interactions with you on the Platform, and the manner in which the information so collected is used by us.
                </p>
                <p className="mb-3">
                  Please note that this Privacy Policy may be amended or updated from time to time to reflect changes in our practices with respect to processing of personal data or changes in applicable law. We encourage you to read this Privacy Policy carefully, and to regularly check it to review any changes that we might make to it.
                </p>
                <p>
                  By accessing the services provided by the Platform, you agree to the collection, use, sharing and storage of your information by Anagha in the manner provided in this Privacy Policy.
                </p>
              </div>

              {/* 2. Collection of Information */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">2. Collection of Information</h2>
                <p className="mb-3">
                  We collect the details provided by you on registration (if any) together with information we learn about you from your use of our service and your visits to the Platform.
                </p>
                <p className="mb-2">We may collect the following personally identifiable information about you when you are transacting on the Platform:</p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>First and last name</li>
                  <li>Email addresses</li>
                  <li>Contact details including mobile phone numbers</li>
                  <li>PIN/ZIP code</li>
                  <li>Demographic profile (such as your age, gender, date of birth, date of anniversary, date of spouse birthday and address)</li>
                  <li>Your opinion on services, products, features, etc. on our Platform</li>
                </ul>
                <p className="mb-2">We also collect certain data as you access and use our services on the Platform which include the following:</p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>Device information</li>
                  <li>Domain server</li>
                  <li>Location information</li>
                  <li>IP address</li>
                  <li>Type of web browser you are using</li>
                  <li>Network carrier</li>
                </ul>
                <p className="mb-2">We may also collect information about:</p>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li>The pages you visit/access</li>
                  <li>The links you click on our Platform</li>
                  <li>The number of times you access the page</li>
                  <li>Things you view, add to bag, add to wish list</li>
                </ul>
                <p className="mb-3">
                  If you make a purchase, we collect sensitive personal data in connection with the purchase. This data includes your payment data, such as your credit or debit card number and other card information or bank/account details, and other account and authentication information, as well as billing, shipping, and contact details.
                </p>
                <p>
                  We may collect additional information in connection with your participation in any schemes, promotions or contests offered by us and information you provide when giving us feedback or completing profile forms. We may also monitor customer traffic patterns and Platform use, which enable us to improve the service we provide to customers.
                </p>
              </div>

              {/* 3. Use of Information */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">3. Use of Information</h2>
                <p>
                  We use personal information to provide the product and services on the Platform and for general business purposes. Collection of email enables us to improve your shopping experience. Further, we use your personal information and your contact information to send you registration confirmation, special offers, recommendations (based on your previous orders, your browsing history and your interests), changes in the service policies or terms of use, event-based communications such as order information, renewal notices, invites, reminders, etc., to troubleshoot problems, to collect monies owed, to measure interest in our products and services, and to inform you about online and offline offers and customize your experience. In our efforts to continually improve our product and service offerings, we analyse demographic information and profile data about users' activity on the Platform. We identify and use your IP address to help diagnose problems with our server and to administer the Platform.
                </p>
                <p className="mt-3">All personal data and information collected by us is used only for the purpose specified in this Privacy Policy.</p>
              </div>

              {/* 4. Cookies */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">4. Cookies and Similar Technologies</h2>
                <p className="mb-3">
                  We may use cookies and other technologies to provide, protect, and improve our products and services, such as by personalizing content, offering and measuring advertisements, understanding user behaviour, and providing a safer experience.
                </p>
                <p>
                  You can remove or reject cookies using your browser or device settings, but in some cases doing so may affect your ability to use the Platform/our services.
                </p>
              </div>

              {/* 5. Disclosure */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">5. Disclosure of Personal Information</h2>
                <p className="mb-3">
                  We may share your personal information (on a need-to-know basis) with third parties that provide services on our behalf and/or generally in connection with our Platform offerings, such as website hosting, email services, marketing, fulfilling customer orders, transaction processing, data analytics, providing customer service, and conducting customer research and satisfaction surveys. These service providers are obligated to protect your data under law.
                </p>
                <p className="mb-3">
                  We may also disclose personal information such as name, email, mobile phone number, device information, location, network carrier, etc. available to certain third-party service providers, on a need-to-know basis. This information is shared with the third-party service providers so that we can (a) personalize the Platform for you and (b) perform behavioural analytics.
                </p>
                <p className="mb-3">
                  We reserve the right to disclose your personal identifiable information as required by law and/or when we believe that disclosure is necessary to protect our rights and/or comply with a judicial proceeding, legal process or a court order served on us.
                </p>
                <p>
                  We do not sell, share or distribute any personal information with third parties for their own marketing or advertising purposes without your prior express consent.
                </p>
              </div>

              {/* 6. Consent */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">6. Your Consent</h2>
                <p>
                  By using our Platform and/or by providing your information, you consent to the collection, sharing, storage and use of the information you disclose on the Platform in accordance with the Privacy Policy, including but not limited to your consent for sharing of your information as per this Privacy Policy.
                </p>
              </div>

              {/* 7. Links */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">7. Link to Other Websites</h2>
                <p>
                  Our Platform may contain links to other websites. However, please note that once you have used these links to leave our site, we do not have control over those websites. We are not responsible for the protection and privacy of any information that you provide whilst visiting such sites. This Privacy Policy does not govern such sites. Please exercise caution and look at the privacy policy applicable to the website in question prior to sharing any personal information.
                </p>
              </div>

              {/* 8. Your Rights */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">8. Your Rights</h2>
                <p className="mb-3">
                  You have the right to access or correct the personal information that we collect. You are also entitled to restrict or object, at any time, to the further processing of your personal information. You may write to us at{' '}
                  <a href={`mailto:${email}`} className="underline">{email}</a>
                  {' '}regarding the personal information collected by us.
                </p>
                <p className="mb-3">
                  If you believe that any information we are holding on you is incorrect or incomplete, you may write to us at the above-mentioned email address. We will promptly correct any information which is incorrect in our records.
                </p>
                <p>
                  For any of the uses of your personal information described in the Privacy Policy that require your consent, note that you may withdraw your consent by writing to us at the above-mentioned email address. In the event you refuse to share any information or withdraw consent to process information that you have previously given to us, we reserve the right to restrict or deny access to the Platform and the provision of our services for which we consider such information to be necessary.
                </p>
              </div>

              {/* 9. Data Retention */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">9. Data Retention</h2>
                <p>
                  We store and retain the personal data provided by the users for such period of time as is required to fulfil the purposes for which such information is collected, as outlined in this Privacy Policy, subject to such longer periods of retention as may be required under applicable laws.
                </p>
              </div>

              {/* 10. Security */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">10. Security Precautions</h2>
                <p>
                  Our Platform has in place security measures and standards (as required under applicable law) to protect the loss, misuse, and alteration of the information under our control. Whenever you access your registered account on the Platform or process a transaction on our Platform, we offer the use of a secure server. Please beware that, despite our best efforts, no security system is impenetrable.
                </p>
              </div>

              {/* 11. Opt-Out */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">11. Choice / Opt-Out</h2>
                <p>
                  Our Platform provides all users with the opportunity to opt out of receiving non-essential (promotional, marketing-related) communications from us on behalf of our partners, and from us in general, after setting up an account. You may delete certain non-mandatory information. You can write to us at the contact information provided below to assist you with these requests.
                </p>
              </div>

              {/* 12. Profile Deactivation */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">12. Profile Deactivation</h2>
                <p>
                  Our Platform enables you to temporarily freeze your profile. This temporary action will leave you without a Anagha account and without access to speedy checkout, information about your past orders, wishlists, and all other personalised Anagha products and services.
                </p>
              </div>

              {/* 13. Profile Deletion */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">13. Profile Deletion</h2>
                <p>
                  Our Platform enables you to request to permanently erase your Anagha account. Once requested to delete, all associated information like past orders, wishlists, saved addresses, and any pending benefits will no longer be accessible to you. The Profile Deletion will require you to forfeit future account creation with the same email address, any claims to policies like Lifetime Exchange & Buyback, 30-Day Returns and Refund, and any other policies or services offered by us. In the event that your account has any open orders, payments, grievances, shipments, or instalment plans, then we may refuse or delay the deletion of your account.
                </p>
              </div>

              {/* 14. Grievance Officer */}
              <div>
                <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">14. Grievance Officer</h2>
                <p>
                  Anagha has appointed a Grievance Officer for addressing complaints or grievances relating to the processing of personal data. You may reach out to us at{' '}
                  <a href={`mailto:${email}`} className="underline">{email}</a>.
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
