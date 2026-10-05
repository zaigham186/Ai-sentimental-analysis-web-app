'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ParticipantWithStats, ParticipantStatistics } from '@/types';

/**
 * Participant Management Page
 * Phase 12: View and manage all participants
 */

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithStats[]>([]);
  const [stats, setStats] = useState<ParticipantStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete action states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<ParticipantWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Filters
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, [conditionFilter, statusFilter, genderFilter, searchQuery, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Build filter params
      const params: any = {
        page: currentPage,
        limit: pageSize
      };
      if (conditionFilter) params.condition = conditionFilter;
      if (statusFilter) params.status = statusFilter;
      if (genderFilter) params.gender = genderFilter;
      if (searchQuery) params.search = searchQuery;

      // Load participants and stats in parallel
      const [participantsResponse, statsResponse] = await Promise.all([
        api.admin.participants.getAll(params),
        api.admin.participants.stats()
      ]);

      setParticipants(participantsResponse.data.participants);
      setTotalPages(participantsResponse.data.pagination.pages);
      setStats(statsResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load participants');
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

  const handleViewParticipant = (participantId: string) => {
    router.push(`/admin/participants/${participantId}`);
  };

  const handleDeleteClick = (participant: ParticipantWithStats) => {
    console.log('Delete clicked for participant:', {
      id: participant._id,
      name: participant.name,
      username: participant.username
    });
    setParticipantToDelete(participant);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!participantToDelete) return;
    const participantId = participantToDelete._id;
    
    if (!participantId) {
      setDeleteError('Invalid participant ID');
      return;
    }

    console.log('Attempting to delete participant with ID:', participantId);
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const response = await api.admin.participants.delete(participantId);
      console.log('Delete response:', response);
      
      setSuccessMessage(`Participant "${participantToDelete.name}" and all associated responses/data were deleted successfully.`);
      setParticipants(prev => prev.filter(p => p._id !== participantToDelete._id));
      setDeleteModalOpen(false);
      setParticipantToDelete(null);
      
      // Refresh stats
      try {
        const statsResponse = await api.admin.participants.stats();
        setStats(statsResponse.data);
      } catch (e) {
        console.error('Failed to refresh stats:', e);
      }
    } catch (err: any) {
      console.error('Delete participant error:', err);
      const errorMessage = err.message || err.data?.message || 'Failed to delete participant';
      setDeleteError(errorMessage);
      
      // If 404, explain that the participant might not exist
      if (err.status === 404 || errorMessage.includes('not found') || errorMessage.includes('Not found')) {
        setDeleteError('This participant was not found in the database. It may have been already deleted. The page will refresh.');
        setTimeout(() => {
          loadData(); // Refresh the list
          setDeleteModalOpen(false);
          setParticipantToDelete(null);
        }, 2000);
      }
    } finally {
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

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Participant Management</h1>
          <p className="mt-2 text-gray-600">
            View and manage all research participants
          </p>
        </div>

        {successMessage && (
          <Alert variant="success" className="mb-6">
            <div className="flex justify-between items-center">
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-xs font-semibold underline ml-3"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        )}

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

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <StatCard title="Total" value={stats.total} color="blue" />
            <StatCard title="Anonymous" value={stats.byCondition.anonymous} color="purple" />
            <StatCard title="Identifiable" value={stats.byCondition.identifiable} color="indigo" />
            <StatCard title="Active" value={stats.byStatus.active} color="green" />
            <StatCard title="Completed" value={stats.byStatus.completed} color="teal" />
            <StatCard title="Withdrawn" value={stats.byStatus.withdrawn} color="red" />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end items-center mb-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Name, username, or department..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={conditionFilter}
                  onChange={(e) => {
                    setConditionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Conditions</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="identifiable">Identifiable</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => {
                    setGenderFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Participants Table */}
        <Card>
          <CardBody>
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery || conditionFilter || statusFilter || genderFilter
                    ? 'No participants match your filters'
                    : 'No participants found'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Participant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Demographics
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Condition
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Responses
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Coded
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Registered
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {participants.map((participant) => (
                        <tr key={participant._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{participant.name}</div>
                              <div className="text-gray-500 text-xs">
                                @{participant.username}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="text-xs">
                              <div>{participant.age} years, {participant.gender}</div>
                              <div className="text-gray-500">{participant.department}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <ConditionBadge condition={participant.condition} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge status={participant.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="font-medium text-gray-900">
                              {participant.responseCount}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="font-medium text-gray-900">
                              {participant.codedCount}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {participant.createdAt ? new Date(participant.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewParticipant(participant._id)}
                              >
                                View Details
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(participant)}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors"
                                title="Delete participant"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Delete Participant Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => !isDeleting && setDeleteModalOpen(false)}
          title="Delete Participant"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this participant? This will permanently delete the participant and all their associated responses, codings, and records. This action cannot be undone.
            </p>
            {participantToDelete && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">Name: </span>
                  <span className="text-gray-900 font-medium">{participantToDelete.name}</span>
                  <span className="ml-1 text-gray-500 font-mono">(@{participantToDelete.username})</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Condition: </span>
                  <span className="text-gray-900 capitalize">{participantToDelete.condition}</span>
                  {participantToDelete.gender && (
                    <span className="ml-2 text-gray-500">Gender: <span className="capitalize text-gray-700">{participantToDelete.gender}</span></span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">University: </span>
                  <span className="text-gray-900">{participantToDelete.university} - {participantToDelete.department}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Responses: </span>
                  <span className="text-gray-900">{participantToDelete.responseCount || 0} responses ({participantToDelete.codedCount || 0} coded)</span>
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
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color as keyof typeof colors]}`}>
      <p className="text-xs font-medium opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
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
