'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Section {
  title: string;
  body: string;
}

export default function PrivacyPolicyPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/site/policies')
      .then(res => res.json())
      .then(data => {
        if (data && data.privacyPolicy && data.privacyPolicy.length > 0) {
          setSections(data.privacyPolicy);
        } else {
          // Fallback static if empty
          setSections([{
            title: "1. Introduction",
            body: "We, Anagha Jewellery and Lifestyle Limited (\"Anagha\", \"we\", \"us\" or \"our\"), carry out our business from our retail stores and our website (www.anagha.com) and our mobile app (collectively \"Platform\"). At Anagha, we respect your privacy and are committed to take reasonable precautions to protect your information and comply with our obligations related to privacy.\n\nThis policy (\"Privacy Policy\") outlines the manner in which your information is collected by us through various interactions with you on the Platform, and the manner in which the information so collected is used by us."
          }]);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const renderBody = (body: string) => {
    const lines = body.split('\n');
    let elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1.5 mb-3">
            {currentList.map((li, idx) => <li key={idx}>{li}</li>)}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('- ')) {
        currentList.push(line.substring(2));
      } else {
        flushList();
        if (line.trim()) {
          elements.push(<p key={idx} className="mb-3">{line}</p>);
        }
      }
    });
    flushList();

    return elements;
  };

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
            <div className="pt-8 text-[13px] text-[#222] leading-relaxed space-y-8 min-h-[500px]">
              {isLoading ? (
                <div className="text-gray-500 animate-pulse">Loading policies...</div>
              ) : sections.map((section, idx) => (
                <div key={idx}>
                  {section.title && (
                    <h2 className="text-[#f1592a] font-semibold text-[13px] mb-2">{section.title}</h2>
                  )}
                  {renderBody(section.body)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
