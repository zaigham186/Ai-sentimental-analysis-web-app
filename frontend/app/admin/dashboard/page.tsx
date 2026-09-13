'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, DashboardStats } from '@/types';

/**
 * Admin Dashboard Page
 * Phase 8: Research Progress Overview
 * Displays statistics from database
 */

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load admin info and dashboard data in parallel
      const [adminResponse, statsResponse] = await Promise.all([
        api.admin.me(),
        api.admin.dashboard()
      ]);

      setAdmin(adminResponse.data);
      setStats(statsResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        // Not authenticated - redirect to login
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load dashboard');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !admin || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="error">
          {error || 'Failed to load dashboard'}
        </Alert>
      </div>
    );
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Research progress overview and statistics
          </p>
        </div>

        {/* Participants Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Participants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Participants"
              value={stats.participants.total}
              color="blue"
            />
            <StatCard
              title="Anonymous Condition"
              value={stats.participants.anonymous}
              color="purple"
            />
            <StatCard
              title="Identifiable Condition"
              value={stats.participants.identifiable}
              color="indigo"
            />
            <StatCard
              title="Completed"
              value={stats.participants.completed}
              color="green"
            />
            <StatCard
              title="Incomplete"
              value={stats.participants.incomplete}
              color="yellow"
            />
            <StatCard
              title="Withdrawn"
              value={stats.participants.withdrawn}
              color="red"
            />
          </div>
        </div>

        {/* Experiment Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Video Response Experiment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Total Video Responses"
              value={stats.experiment.totalResponses}
              color="blue"
            />
            <StatCard
              title="Completed Experiments"
              value={stats.experiment.completedExperiments}
              color="green"
            />
          </div>
        </div>

        {/* Coding Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Response Coding
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Responses"
              value={stats.coding.totalResponses}
              color="blue"
            />
            <StatCard
              title="Coded"
              value={stats.coding.codedResponses}
              color="green"
            />
            <StatCard
              title="Pending Coding"
              value={stats.coding.pendingResponses}
              color="yellow"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

function StatCard({ title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
