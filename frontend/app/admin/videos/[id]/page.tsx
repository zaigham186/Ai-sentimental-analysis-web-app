'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, VideoManagement } from '@/types';

/**
 * Video Detail/Edit Page
 * Phase 9: Video Stimulus Management
 */

export default function VideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [video, setVideo] = useState<VideoManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  
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
    loadData();
  }, [videoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [adminResponse, videoResponse] = await Promise.all([
        api.admin.me(),
        api.admin.videos.getById(videoId)
      ]);

      setAdmin(adminResponse.data);
      setVideo(videoResponse.data);

      // Populate form data
      const v = videoResponse.data;
      setFormData({
        title: v.title,
        topic: v.topic,
        description: v.description,
        videoUrl: v.videoUrl,
        duration: v.duration.toString(),
        order: v.order.toString(),
        active: v.active,
        version: v.version,
        category: v.metadata?.category || '',
        tags: v.metadata?.tags?.join(', ') || '',
        notes: v.metadata?.notes || ''
      });
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load video');
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
      if (!formData.duration || parseInt(formData.duration) <= 0) {
        throw new Error('Valid duration is required');
      }
      if (!formData.order || parseInt(formData.order) <= 0) {
        throw new Error('Valid order is required');
      }

      // Prepare data
      const updateData = {
        title: formData.title.trim(),
        topic: formData.topic.trim(),
        description: formData.description.trim(),
        videoUrl: formData.videoUrl.trim(),
        duration: parseInt(formData.duration),
        order: parseInt(formData.order),
        active: formData.active,
        version: formData.version.trim(),
        metadata: {
          category: formData.category.trim() || undefined,
          tags: formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()) : undefined,
          notes: formData.notes.trim() || undefined
        }
      };

      await api.admin.videos.update(videoId, updateData);

      // Reload data
      await loadData();
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update video');
    } finally {
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

  const handleApprove = async () => {
    if (!confirm('Approve this video for use in the experiment?')) return;

    try {
      await api.admin.videos.approve(videoId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve video');
    }
  };

  const handleReject = async () => {
    const notes = prompt('Enter rejection reason (required):');
    if (!notes || notes.trim().length === 0) {
      alert('Rejection notes are required');
      return;
    }

    try {
      await api.admin.videos.reject(videoId, notes);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject video');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${video?.title}"? This cannot be undone.`)) return;

    try {
      await api.admin.videos.delete(videoId);
      router.push('/admin/videos');
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

  if (!admin || !video) {
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
              ← Back to Videos
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {editMode ? 'Edit Video' : 'Video Details'}
          </h1>
          <p className="mt-2 text-gray-600">
            {editMode ? 'Update video information' : 'View video stimulus details'}
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-4 mb-6">
          <StatusBadge status={video.validationStatus} />
          <ActiveBadge active={video.active} />
          <span className="text-sm text-gray-600">Order: {video.order}</span>
          <span className="text-sm text-gray-600">Version: {video.version}</span>
        </div>

        {/* Actions */}
        {!editMode && (
          <div className="flex gap-2 mb-6">
            <Button onClick={() => setEditMode(true)}>
              Edit
            </Button>
            
            {video.validationStatus === 'candidate' && (
              <>
                <Button variant="outline" onClick={handleApprove}>
                  ✓ Approve
                </Button>
                <Button variant="outline" onClick={handleReject}>
                  ✗ Reject
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        )}

        {/* Video Preview */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Video Preview
            </h2>
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                src={video.videoUrl}
                controls
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Duration: {video.duration} seconds
            </p>
          </CardBody>
        </Card>

        {/* Form or Display */}
        <Card>
          <CardBody>
            {editMode ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Basic Information
                  </h2>
                  
                  <div className="space-y-4">
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
                      />
                    </div>

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
                      />
                    </div>

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
                      />
                    </div>

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
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        />
                      </div>

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
                        />
                      </div>

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
                        />
                      </div>
                    </div>

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
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Metadata
                  </h2>
                  
                  <div className="space-y-4">
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
                      />
                    </div>

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
                      />
                    </div>

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
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      loadData(); // Reset form
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Basic Information
                  </h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="text-base text-gray-900">{video.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Topic</dt>
                      <dd className="text-base text-gray-900">{video.topic}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Description</dt>
                      <dd className="text-base text-gray-900">{video.description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Video URL</dt>
                      <dd className="text-base text-gray-900 break-all">{video.videoUrl}</dd>
                    </div>
                  </dl>
                </div>

                {/* Validation Information */}
                {video.validationNotes && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Validation Information
                    </h2>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                        <dd className="text-base text-gray-900">{video.validationNotes}</dd>
                      </div>
                      {video.validationDate && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Date</dt>
                          <dd className="text-base text-gray-900">
                            {new Date(video.validationDate).toLocaleString()}
                          </dd>
                        </div>
                      )}
                      {video.validatedBy && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Validated By</dt>
                          <dd className="text-base text-gray-900">
                            {typeof video.validatedBy === 'object' ? (video.validatedBy?.name || 'Administrator') : video.validatedBy}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Metadata */}
                {(video.metadata?.category || video.metadata?.tags || video.metadata?.notes) && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Metadata
                    </h2>
                    <dl className="space-y-3">
                      {video.metadata.category && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Category</dt>
                          <dd className="text-base text-gray-900">{video.metadata.category}</dd>
                        </div>
                      )}
                      {video.metadata.tags && video.metadata.tags.length > 0 && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Tags</dt>
                          <dd className="text-base text-gray-900">
                            {video.metadata.tags.join(', ')}
                          </dd>
                        </div>
                      )}
                      {video.metadata.notes && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Internal Notes</dt>
                          <dd className="text-base text-gray-900">{video.metadata.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    System Information
                  </h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-base text-gray-900">
                        {new Date(video.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-base text-gray-900">
                        {new Date(video.updatedAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
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
    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
      active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
