'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ParticipantDetail } from '@/types';

/**
 * Participant Detail Page
 * Phase 12: View single participant with all responses and coding stats
 */

export default function ParticipantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const participantId = params.id as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete participant state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Load participant details
      const detailResponse = await api.admin.participants.getById(participantId);
      setDetail(detailResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load participant details');
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

  const handleViewResponse = (responseId: string) => {
    router.push(`/admin/responses/${responseId}`);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.admin.participants.delete(participantId);
      router.push('/admin/participants');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete participant');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin || !detail) {
    return null;
  }

  const { participant, responses, codings, stats } = detail;

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/participants')}
              className="mb-4"
            >
              ← Back to Participants
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900">Participant Details</h1>
            <p className="mt-2 text-gray-600">
              Viewing complete participant information and responses
            </p>
          </div>

          <div className="sm:self-end">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-300 hover:border-transparent transition-colors shadow-sm"
              title="Delete this participant"
            >
              🗑️ Delete Participant
            </button>
          </div>
        </div>

        {deleteError && (
          <Alert variant="error" className="mb-6">
            <div className="flex justify-between items-center">
              <span>{deleteError}</span>
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                className="text-xs font-semibold underline ml-3"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Responses" value={stats.totalResponses} color="blue" />
          <StatCard title="Coded Responses" value={stats.codedResponses} color="green" />
          <StatCard title="Uncoded Responses" value={stats.uncodedResponses} color="yellow" />
        </div>

        {/* Participant Information */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Participant Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <InfoRow label="Name" value={participant.name} />
                <InfoRow label="Username" value={`@${participant.username}`} />
                <InfoRow label="Age" value={`${participant.age} years`} />
                <InfoRow label="Gender" value={participant.gender} />
                <InfoRow label="University" value={participant.university} />
                <InfoRow label="Department" value={participant.department} />
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <InfoRow 
                  label="Condition" 
                  value={<ConditionBadge condition={participant.condition} />} 
                />
                <InfoRow 
                  label="Status" 
                  value={<StatusBadge status={participant.status} />} 
                />
                <InfoRow 
                  label="Consent Given" 
                  value={participant.consentGiven ? 'Yes' : 'No'} 
                />
                {participant.consentAt && (
                  <InfoRow 
                    label="Consent Date" 
                    value={new Date(participant.consentAt).toLocaleString()} 
                  />
                )}
                <InfoRow 
                  label="Registered" 
                  value={new Date(participant.createdAt).toLocaleString()} 
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Responses Table */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Video Responses ({responses.length})
            </h2>

            {responses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No responses submitted yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Video
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Response Preview
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Coded
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {responses.map((response) => {
                      const isCoded = codings.some(c => c.response === response._id);
                      return (
                        <tr key={response._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">#{response.video?.order || 'N/A'}</div>
                              <div className="text-xs text-gray-500">
                                {response.video?.title || 'Unknown'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                            <div className="truncate">
                              {response.responseText.substring(0, 100)}
                              {response.responseText.length > 100 && '...'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(response.submittedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <CodingBadge coded={isCoded} />
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResponse(response._id)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Coding Summary */}
        {codings.length > 0 && (
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Coding Summary ({codings.length} Coded)
              </h2>

              <div className="space-y-4">
                {codings.map((coding) => (
                  <div key={coding._id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Sentiment</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {coding.sentiment || 'Not coded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Aggression</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {coding.aggression?.category || 'Not coded'}
                          {coding.aggression?.level && ` (Level: ${coding.aggression.level})`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Cyberbullying</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {coding.cyberbullying?.present 
                            ? coding.cyberbullying.type || 'Present' 
                            : 'Not present'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {coding.codedBy?.name 
                          ? `Coded by ${coding.codedBy.name}${coding.codedBy.username ? ` (@${coding.codedBy.username})` : ''}`
                          : (coding as any).aiCoding 
                            ? 'AI Generated Suggestion'
                            : 'Coder: System / Unassigned'}
                        {coding.codedAt ? ` on ${new Date(coding.codedAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => !isDeleting && setDeleteModalOpen(false)}
          title="Delete Participant"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this participant? This will permanently remove the participant record along with all their responses, codings, and research data. This action cannot be undone.
            </p>
            {participant && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">Name: </span>
                  <span className="text-gray-900 font-medium">{participant.name}</span>
                  <span className="ml-1 text-gray-500 font-mono">(@{participant.username})</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Condition: </span>
                  <span className="text-gray-900 capitalize">{participant.condition}</span>
                  {participant.gender && (
                    <span className="ml-2 text-gray-500">Gender: <span className="capitalize text-gray-700">{participant.gender}</span></span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">University: </span>
                  <span className="text-gray-900">{participant.university} - {participant.department}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Responses: </span>
                  <span className="text-gray-900">{stats.totalResponses} responses ({stats.codedResponses} coded)</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              >
                {isDeleting ? 'Deleting...' : 'Delete Participant'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color as keyof typeof colors]}`}>
      <p className="text-xs font-medium opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const isAnonymous = condition === 'anonymous';
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      isAnonymous ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
    }`}>
      {isAnonymous ? 'Anonymous' : 'Identifiable'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    incomplete: 'bg-yellow-100 text-yellow-800',
    withdrawn: 'bg-red-100 text-red-800'
  };

  const labels = {
    active: 'Active',
    completed: 'Completed',
    incomplete: 'Incomplete',
    withdrawn: 'Withdrawn'
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function CodingBadge({ coded }: { coded: boolean }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      coded ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`}>
      {coded ? 'CODED' : 'UNCODED'}
    </span>
  );
}
