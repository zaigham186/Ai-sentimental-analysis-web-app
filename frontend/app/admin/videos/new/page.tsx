'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin } from '@/types';

/**
 * Add New Video Page
 * Phase 9: Video Stimulus Management
 */

export default function AddVideoPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    description: '',
    videoUrl: '',
    duration: '',
    order: '',
    active: true,
    version: '1.0',
    category: '',
    tags: '',
    notes: ''
  });

  useEffect(() => {
    loadAdmin();
  }, []);

  const loadAdmin = async () => {
    try {
      const response = await api.admin.me();
      setAdmin(response.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load admin data');
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.topic.trim()) {
        throw new Error('Topic is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.videoUrl.trim()) {
        throw new Error('Video URL is required');
      }
      if (!formData.duration || parseInt(formData.duration) <= 0) {
        throw new Error('Valid duration is required');
      }
      if (!formData.order || parseInt(formData.order) <= 0) {
        throw new Error('Valid order is required');
      }

      // Prepare data
      const videoData = {
        title: formData.title.trim(),
        topic: formData.topic.trim(),
        description: formData.description.trim(),
        videoUrl: formData.videoUrl.trim(),
        duration: parseInt(formData.duration),
        order: parseInt(formData.order),
        active: formData.active,
        version: formData.version.trim() || '1.0',
        metadata: {
          category: formData.category.trim() || undefined,
          tags: formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()) : undefined,
          notes: formData.notes.trim() || undefined
        }
      };

      await api.admin.videos.create(videoData);

      // Redirect to videos list
      router.push('/admin/videos');
    } catch (err: any) {
      setError(err.message || 'Failed to create video');
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/videos')}
            >
              ← Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Video</h1>
          <p className="mt-2 text-gray-600">
            Add a new video stimulus to the library
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Basic Information
                </h2>
                
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      maxLength={200}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="Video title"
                    />
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleChange}
                      required
                      maxLength={100}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="Video topic"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      maxLength={1000}
                      rows={4}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="Description of the video scenario"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.description.length}/1000 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Video Details
                </h2>
                
                <div className="space-y-4">
                  {/* Video URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleChange}
                      required
                      maxLength={500}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="https://..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Cloudinary or approved video hosting URL
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (seconds) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        required
                        min="1"
                        max="3600"
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        placeholder="45"
                      />
                    </div>

                    {/* Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="order"
                        value={formData.order}
                        onChange={handleChange}
                        required
                        min="1"
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        placeholder="1"
                      />
                    </div>

                    {/* Version */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        name="version"
                        value={formData.version}
                        onChange={handleChange}
                        maxLength={20}
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                        placeholder="1.0"
                      />
                    </div>
                  </div>

                  {/* Active */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="active"
                      id="active"
                      checked={formData.active}
                      onChange={handleChange}
                      disabled={submitting}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                      Set as active
                    </label>
                  </div>
                </div>
              </div>

              {/* Metadata (Optional) */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Metadata (Optional)
                </h2>
                
                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      maxLength={100}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="e.g., Social media, Gaming, etc."
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="cyberbullying, social media, comment"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      maxLength={500}
                      rows={3}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      placeholder="Internal notes (not shown to participants)"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/videos')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Video'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Information */}
        <Alert variant="info" className="mt-6">
          <p className="text-sm">
            <strong>Note:</strong> New videos are created with "Candidate" status. 
            They must be approved before being shown to participants.
          </p>
        </Alert>
      </div>
    </AdminLayout>
  );
}
