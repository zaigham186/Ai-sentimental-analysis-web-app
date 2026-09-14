'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin } from '@/types';

interface AdminRootLayoutProps {
  children: ReactNode;
}

/**
 * Admin Root Layout & Mandatory Authentication Guard
 * 
 * CRITICAL PRIVACY & SECURITY ENFORCEMENT:
 * 1. Opening /admin or /admin/login ALWAYS presents the Admin Login form directly.
 * 2. If a participant or unauthenticated user navigates to ANY deeper admin route
 *    (/admin/dashboard, /admin/responses, /admin/coding, etc.):
 *    - Child components are NEVER mounted before authentication is verified.
 *    - NO participant data, responses, or coding records are ever requested.
 *    - The user is immediately redirected to the Admin Login form.
 */
export default function AdminRootLayout({ children }: AdminRootLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [admin, setAdmin] = useState<Admin | null>(null);

  // Public admin entry points that directly display the login form
  const isPublicAdminRoute = pathname === '/admin' || pathname === '/admin/login';

  const verifyAdminAuth = useCallback(async () => {
    // If accessing the login form or root admin, no verification barrier needed
    if (isPublicAdminRoute) {
      setAuthStatus('unauthenticated');
      return;
    }

    try {
      setAuthStatus('checking');
      const response = await api.admin.me();
      
      if (response.success && response.data) {
        setAdmin(response.data);
        setAuthStatus('authenticated');
      } else {
        throw new Error('Admin session invalid');
      }
    } catch (err) {
      setAdmin(null);
      setAuthStatus('unauthenticated');
      const targetUrl = pathname || '/admin/dashboard';
      router.replace(`/admin/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  }, [isPublicAdminRoute, pathname, router]);

  useEffect(() => {
    if (!isPublicAdminRoute) {
      verifyAdminAuth();
    }
  }, [isPublicAdminRoute, pathname, verifyAdminAuth]);

  // Public admin routes (/admin, /admin/login) render directly without auth barrier
  if (isPublicAdminRoute) {
    return <>{children}</>;
  }

  // Verification in progress: child page components are NEVER mounted
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-base font-semibold text-gray-800">
            Verifying Administrator Access...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Checking authenticated research credentials
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated: redirecting to login form, child components NEVER mounted
  if (authStatus === 'unauthenticated' || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-base font-semibold text-gray-800">
            Redirecting to Admin Login...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Authentication is required to access the research administration portal.
          </p>
        </div>
      </div>
    );
  }

  // Only render protected children once admin session is authenticated
  return <>{children}</>;
}
