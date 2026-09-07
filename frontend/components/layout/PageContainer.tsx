import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

/**
 * Reusable Page Container
 * Includes header, footer, and consistent page structure
 */

export function PageContainer({ children, title, description }: PageContainerProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {(title || description) && (
          <div className="bg-primary-50 border-b border-primary-100 py-8">
            <div className="container-custom">
              {title && (
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-lg text-gray-700">{description}</p>
              )}
            </div>
          </div>
        )}
        
        <div className="container-custom py-8">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
