'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import AdminLoginPage from './login/page';

/**
 * Admin Root Page (/admin)
 * Checks if user is already authenticated and redirects to dashboard,
 * otherwise shows login form.
 */
export default function AdminRootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to get current admin session
      const response = await api.admin.me();
      if (response.success) {
        // Already logged in - redirect to dashboard
        router.push('/admin/dashboard');
      } else {
        // Not logged in - show login form
        setChecking(false);
      }
    } catch (error) {
      // Not authenticated - show login form
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <AdminLoginPage />;
}

