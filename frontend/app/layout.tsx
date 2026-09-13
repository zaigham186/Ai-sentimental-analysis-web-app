import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Online Behavior Experiment',
  description: 'An Experimental Investigation of Anonymity in Cyberbullying Perpetration',
  keywords: ['research', 'psychology', 'cyberbullying', 'anonymity'],
  authors: [{ name: 'Online Behavior Experiment' }],
  robots: 'noindex, nofollow', // Prevent search engine indexing of research platform
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress MetaMask connection errors
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('MetaMask')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && e.reason.message.includes('MetaMask')) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
