'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useContactInfo } from '@/lib/contact';
import Link from 'next/link';

export default function FraudWarningPage() {
  const { email } = useContactInfo();
  return (
    <>
      <Header />
      <main className="w-full bg-[#f5f5f5] min-h-screen font-sans">

        {/* Breadcrumb */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6 pb-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            <Link href="/" className="hover:text-[#f1592a] transition-colors">Home</Link>
            {' '}/ <span className="text-gray-600">Fraud Warning Disclaimer</span>
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-16 items-start">

            {/* LEFT: Title + Image */}
            <div className="lg:sticky lg:top-28 flex flex-col items-start pt-8">
              <h1 className="font-domine font-bold text-[38px] md:text-[46px] lg:text-[50px] leading-[1.1] text-[#032C5E] mb-8">
                Fraud<br />Warning<br />Disclaimer
              </h1>
              <div className="mt-2">
                <img
                  src="/terms.webp"
                  alt="Fraud Warning Disclaimer illustration"
                  className="h-[140px] w-auto object-contain"
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="pt-8 text-[13px] text-[#222] leading-relaxed space-y-8">
              
              <div className="space-y-6">
                <p>
                  Please be aware that certain individuals might approach you by falsely presenting themselves as our employees, affiliates, agents, or representatives. Under this false pretense, they might try to acquire money or other valuables from you or to gain access to your personal information by offering you a gift or any other sales or business opportunities by claiming that they are contacting you on our behalf. The contacting individual or organization may, for example, invite you to click on a link they provide or ask to make a purchase for receiving gifts or forward messages with fraudulent links to your groups or friends. Such fraudulent offers and claims are usually received via email, the internet, text message, phone, etc. These claims and offers are fraudulent and invalid, and you are strongly advised to exercise great caution and disregard such offers and invitations. Please exercise caution when encountering messages that request you to click on links or divulge personal information.
                </p>

                <p>
                  Criminal and/or civil liabilities may arise from such actions and we intend to cooperate with competent law enforcement authorities and to ask them to take appropriate action whenever such phenomena occur. Accordingly, we would ask you to immediately get in touch with us via email at{' '}
                  <a href={`mailto:${email}`} className="text-[#1a73e8] underline">{email}</a>
                  {' '}upon receiving a suspicious offer or invitation and additionally notify the police or other competent authority.
                </p>

                <p>
                  Please note that under no circumstances shall Anagha Jewellery and Lifestyle Limited and/or its affiliates and subsidiaries be held liable or responsible for any claims, losses, damages, expenses, or other inconvenience resulting from or in any way connected to the actions of these imposters.
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
