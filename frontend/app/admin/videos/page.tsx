'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, VideoManagement, StimulusSetValidation, VideoStatistics } from '@/types';

/**
 * Video Management Page
 * Phase 9: Video Stimulus Management
 * Researcher can view, add, edit, approve/reject videos
 */

export default function AdminVideosPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [videos, setVideos] = useState<VideoManagement[]>([]);
  const [validation, setValidation] = useState<StimulusSetValidation | null>(null);
  const [stats, setStats] = useState<VideoStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, activeFilter, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Build filter params
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (activeFilter) params.active = activeFilter === 'true';
      if (searchQuery) params.search = searchQuery;

      // Load videos, validation, and stats in parallel
      const [videosResponse, validationResponse, statsResponse] = await Promise.all([
        api.admin.videos.getAll(params),
        api.admin.videos.validateSet(),
        api.admin.videos.stats()
      ]);

      setVideos(videosResponse.data);
      setValidation(validationResponse.data);
      setStats(statsResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load videos');
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

  const handleApprove = async (videoId: string) => {
    if (!confirm('Approve this video for use in the experiment?')) return;

    try {
      await api.admin.videos.approve(videoId);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to approve video');
    }
  };

  const handleReject = async (videoId: string) => {
    const notes = prompt('Enter rejection reason (required):');
    if (!notes || notes.trim().length === 0) {
      alert('Rejection notes are required');
      return;
    }

    try {
      await api.admin.videos.reject(videoId, notes);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to reject video');
    }
  };

  const handleToggleActive = async (video: VideoManagement) => {
    const action = video.active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this video?`)) return;

    try {
      await api.admin.videos.update(video.id, { active: !video.active });
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || `Failed to ${action} video`);
    }
  };

  const handleDelete = async (video: VideoManagement) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;

    try {
      await api.admin.videos.delete(video.id);
      await loadData(); // Reload data
    } catch (err: any) {
      alert(err.message || 'Failed to delete video');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Video Management</h1>
          <p className="mt-2 text-gray-600">
            Manage video stimuli for the cyberbullying experiment
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Stimulus Set Validation */}
        {validation && (
          <Alert 
            variant={validation.valid ? 'success' : 'warning'} 
            className="mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <strong>{validation.message}</strong>
                {!validation.valid && (
                  <p className="text-sm mt-1">
                    The experiment requires exactly 10 approved active videos.
                  </p>
                )}
              </div>
              <div className="text-2xl font-bold">
                {validation.count}/10
              </div>
            </div>
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard title="Total" value={stats.total} color="blue" />
            <StatCard title="Candidate" value={stats.byStatus.candidate} color="gray" />
            <StatCard title="Under Review" value={stats.byStatus.underReview} color="yellow" />
            <StatCard title="Approved" value={stats.byStatus.approved} color="green" />
            <StatCard title="Rejected" value={stats.byStatus.rejected} color="red" />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => router.push('/admin/videos/new')}
          >
            + Add Video
          </Button>
          
          <Button
            variant="outline"
            onClick={() => loadData()}
          >
            🔄 Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, topic, or description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="candidate">Candidate</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Active Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Videos Table */}
        <Card>
          <CardBody>
            {videos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No videos found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/admin/videos/new')}
                >
                  Add First Video
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Topic
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Active
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Version
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {videos.map((video) => (
                      <tr key={video.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {video.order}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {video.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {video.topic}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {video.duration}s
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge status={video.validationStatus} />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <ActiveBadge active={video.active} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          v{video.version}
                        </td>
                        <td className="px-4 py-3 text-sm text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/videos/${video.id}`)}
                          >
                            View
                          </Button>
                          
                          {video.validationStatus === 'candidate' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(video.id)}
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(video.id)}
                              >
                                ✗ Reject
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(video)}
                          >
                            {video.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color as keyof typeof colors]}`}>
      <p className="text-xs font-medium opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    candidate: 'bg-gray-100 text-gray-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const labels = {
    candidate: 'Candidate',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
