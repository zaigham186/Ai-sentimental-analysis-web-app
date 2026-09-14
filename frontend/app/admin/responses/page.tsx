'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseWithDetails, ResponseStatistics } from '@/types';

/**
 * Response Management Page
 * Phase 12: View and manage all video responses
 */

export default function AdminResponsesPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [responses, setResponses] = useState<ResponseWithDetails[]>([]);
  const [stats, setStats] = useState<ResponseStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [codedFilter, setCodedFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Participant-based pagination
  const [participantPageSize] = useState(30); // Participants per range
  const [participantPage, setParticipantPage] = useState(1);
  const [totalParticipants, setTotalParticipants] = useState(0);
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, [conditionFilter, codedFilter, searchQuery, currentPage, participantPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Calculate participant range
      const rangeStart = (participantPage - 1) * participantPageSize + 1;
      const rangeEnd = participantPage * participantPageSize;

      // Build filter params
      const params: any = {
        page: currentPage,
        limit: pageSize,
        participantRangeStart: rangeStart,
        participantRangeEnd: rangeEnd,
        participantPageSize: participantPageSize
      };
      if (conditionFilter) params.condition = conditionFilter;
      if (codedFilter) params.coded = codedFilter;
      if (searchQuery) params.search = searchQuery;

      // Load responses and stats in parallel
      const [responsesResponse, statsResponse] = await Promise.all([
        api.admin.responses.getAll(params),
        api.admin.responses.stats()
      ]);

      setResponses(responsesResponse.data.responses);
      setTotalPages(responsesResponse.data.pagination.pages);
      setTotalParticipants(responsesResponse.data.pagination.totalParticipants || 0);
      setStats(statsResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load responses');
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

  const handleViewParticipant = (participantId: string) => {
    router.push(`/admin/participants/${participantId}`);
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
          <h1 className="text-3xl font-bold text-gray-900">Response Management</h1>
          <p className="mt-2 text-gray-600">
            View and manage all participant video responses
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard title="Total Responses" value={stats.total} color="blue" />
            <StatCard title="Coded" value={stats.coded} color="green" />
            <StatCard title="Uncoded" value={stats.uncoded} color="yellow" />
            <StatCard title="Anonymous" value={stats.byCondition.anonymous} color="purple" />
            <StatCard title="Identifiable" value={stats.byCondition.identifiable} color="indigo" />
          </div>
        )}

        {/* Participant Range Navigation */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Viewing Participants:</span>{' '}
                <span className="font-bold text-blue-600">
                  {(participantPage - 1) * participantPageSize + 1}–
                  {Math.min(participantPage * participantPageSize, totalParticipants)}
                </span>
                {' '}of{' '}
                <span className="font-bold">{totalParticipants}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParticipantPage(p => Math.max(1, p - 1));
                    setCurrentPage(1);
                  }}
                  disabled={participantPage === 1}
                >
                  ← Previous {participantPageSize}
                </Button>
                <div className="text-sm text-gray-600 px-2">
                  Range {participantPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const maxPage = Math.ceil(totalParticipants / participantPageSize);
                    setParticipantPage(p => Math.min(maxPage, p + 1));
                    setCurrentPage(1);
                  }}
                  disabled={participantPage * participantPageSize >= totalParticipants}
                >
                  Next {participantPageSize} →
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {stats && (
              <span>
                Coding Rate: <strong>{stats.codingRate}%</strong>
              </span>
            )}
          </div>
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
                  Search Response Text
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search in responses..."
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

              {/* Coding Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coding Status
                </label>
                <select
                  value={codedFilter}
                  onChange={(e) => {
                    setCodedFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Responses</option>
                  <option value="false">Uncoded Only</option>
                  <option value="true">Coded Only</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Responses Table */}
        <Card>
          <CardBody>
            {responses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery || conditionFilter || codedFilter
                    ? 'No responses match your filters'
                    : 'No responses found'}
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
                          Condition
                        </th>
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
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {responses.map((response) => (
                        <tr key={response._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{response.participant.name}</div>
                              <button
                                onClick={() => handleViewParticipant(response.participant._id)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                @{response.participant.username}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <ConditionBadge condition={response.participant.condition} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div>
                              <div className="font-medium">#{response.video.order}</div>
                              <div className="text-xs text-gray-500">
                                {response.video.title}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                            <div className="truncate">
                              {response.responseText.substring(0, 80)}
                              {response.responseText.length > 80 && '...'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(response.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <CodingStatusBadge coded={response.coded} />
                          </td>
                          <td className="px-4 py-3 text-sm text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResponse(response._id)}
                            >
                              {response.coded ? 'View' : 'Code'}
                            </Button>
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
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
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

function CodingStatusBadge({ coded }: { coded: boolean }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      coded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {coded ? 'CODED' : 'UNCODED'}
    </span>
  );
}
