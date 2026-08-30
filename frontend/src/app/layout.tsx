import type { Metadata, Viewport } from 'next';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anagha | Exquisite Jewelry for Every Occasion',
  description:
    'Experience the elegance of Anagha. Handcrafted jewelry, solitaires, and luxury collections inspired by timeless beauty.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

  return (
    <html lang="en">
      <body className="antialiased overflow-x-clip">
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
