'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Response Management Route Alias
 * Automatically points to /admin/responses.
 */
export default function AdminResponseManagementAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/responses');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium">Redirecting to Response Management...</p>
      </div>
    </div>
  );
}
