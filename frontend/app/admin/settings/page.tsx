'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin } from '@/types';

/**
 * Admin Settings & Security Configuration Page
 */
export default function AdminSettingsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.admin.me();
      setAdmin(response.data);
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.admin.logout();
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System &amp; Security Settings</h1>
          <p className="mt-2 text-gray-600">
            Security policies, administrative session settings, and research configuration.
          </p>
        </div>

        {/* Administrator Profile Card */}
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Administrator Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 font-medium">Username:</span>
                <p className="text-gray-900 font-semibold">{admin.username}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Email:</span>
                <p className="text-gray-900 font-semibold">{admin.email}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Role:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase">
                  {admin.role}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Full Name:</span>
                <p className="text-gray-900 font-semibold">{admin.name}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Authentication Policies */}
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy &amp; Access Controls</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="text-green-600 mr-2 font-bold">&check;</span>
                <span><strong>Mandatory Layout Guard:</strong> All <code>/admin/*</code> routes strictly blocked for unauthenticated users.</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 font-bold">&check;</span>
                <span><strong>Zero Pre-Authentication Leakage:</strong> Participant data and coding endpoints are never queried before authentication.</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 font-bold">&check;</span>
                <span><strong>Backend API Enforcement:</strong> All <code>/api/admin/*</code> endpoints strictly require valid <code>adminSession</code> cookies.</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 font-bold">&check;</span>
                <span><strong>Zero Automatic Loading:</strong> Visiting <code>/admin</code> or <code>/admin/login</code> always presents the Admin Login form.</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
