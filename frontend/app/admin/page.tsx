'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Admin Root Page
 * Redirects to admin login page
 * Phase 8: Admin Authentication
 */

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin login page
    router.push('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Redirecting to admin login...</p>
      </div>
    </div>
  );
}
