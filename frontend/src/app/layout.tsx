import type { Metadata } from 'next';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
      <body className="antialiased">
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
