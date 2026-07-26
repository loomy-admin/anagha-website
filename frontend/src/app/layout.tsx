import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anagha | Exquisite Jewelry for Every Occasion',
  description:
    'Experience the elegance of Anagha. Handcrafted jewelry, solitaires, and luxury collections inspired by timeless beauty.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
