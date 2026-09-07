import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cyberbullying Research Platform - SBBWU',
  description: 'An Experimental Investigation of Anonymity in Cyberbullying Perpetration',
  keywords: ['research', 'psychology', 'cyberbullying', 'anonymity'],
  authors: [{ name: 'SBBWU Research Team' }],
  robots: 'noindex, nofollow', // Prevent search engine indexing of research platform
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
