'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
 * Phase 12: View and manage all participant video responses
 */

export default function AdminResponsesPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [responses, setResponses] = useState<ResponseWithDetails[]>([]);
  const [stats, setStats] = useState<ResponseStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Search
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [codedFilter, setCodedFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sorting options (Requirement 4)
  // Default: participant name A-Z, secondary: video number ascending
  const [sortByOption, setSortByOption] = useState<string>('name_asc');

  // Pagination (Requirement 1: 10 per page)
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResponses, setTotalResponses] = useState(0);

  // Real-time search debounce (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Parse sort field and direction from sortByOption
      let sortBy = 'name';
      let sortOrder = 'asc';
      if (sortByOption === 'name_asc') { sortBy = 'name'; sortOrder = 'asc'; }
      else if (sortByOption === 'name_desc') { sortBy = 'name'; sortOrder = 'desc'; }
      else if (sortByOption === 'video_asc') { sortBy = 'video'; sortOrder = 'asc'; }
      else if (sortByOption === 'date_desc') { sortBy = 'date'; sortOrder = 'desc'; }
      else if (sortByOption === 'date_asc') { sortBy = 'date'; sortOrder = 'asc'; }
      else if (sortByOption === 'status_asc') { sortBy = 'status'; sortOrder = 'asc'; }
      else if (sortByOption === 'status_desc') { sortBy = 'status'; sortOrder = 'desc'; }
      else if (sortByOption === 'condition_asc') { sortBy = 'condition'; sortOrder = 'asc'; }
      else if (sortByOption === 'condition_desc') { sortBy = 'condition'; sortOrder = 'desc'; }

      // Build filter params (10 per page, Requirement 1 & 5)
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder
      };
      if (conditionFilter) params.condition = conditionFilter;
      if (codedFilter) params.coded = codedFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      // Load responses and stats in parallel
      const [responsesResponse, statsResponse] = await Promise.all([
        api.admin.responses.getAll(params),
        api.admin.responses.stats()
      ]);

      const resData = responsesResponse.data;
      setResponses(resData.responses || []);
      setTotalPages(resData.pagination?.pages || 1);
      setTotalResponses(resData.pagination?.total || 0);
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
  }, [conditionFilter, codedFilter, debouncedSearch, currentPage, pageSize, sortByOption, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Clear search helper (Requirement 2)
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Column header sort helper
  const handleHeaderSort = (field: 'name' | 'video' | 'date' | 'status' | 'condition') => {
    setCurrentPage(1);
    if (field === 'name') {
      setSortByOption(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc');
    } else if (field === 'video') {
      setSortByOption('video_asc');
    } else if (field === 'date') {
      setSortByOption(prev => prev === 'date_desc' ? 'date_asc' : 'date_desc');
    } else if (field === 'status') {
      setSortByOption(prev => prev === 'status_asc' ? 'status_desc' : 'status_asc');
    } else if (field === 'condition') {
      setSortByOption(prev => prev === 'condition_asc' ? 'condition_desc' : 'condition_asc');
    }
  };

  if (loading && !responses.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  // Calculate Viewing range for display (Requirement 1: "Viewing 1-10 of X total")
  const viewingStart = totalResponses === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const viewingEnd = Math.min(currentPage * pageSize, totalResponses);

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Response Management</h1>
          <p className="mt-2 text-gray-600">
            View and manage all participant video responses across experimental conditions
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard title="Total Responses" value={stats.total} color="blue" />
            <StatCard title="Coded" value={stats.coded} color="green" />
            <StatCard title="Uncoded" value={stats.uncoded} color="yellow" />
            <StatCard title="Anonymous" value={stats.byCondition.anonymous} color="purple" />
            <StatCard title="Identifiable" value={stats.byCondition.identifiable} color="indigo" />
          </div>
        )}

        {/* 1. PAGINATION BAR (Requirement 1: 10 per page, "Viewing 1-10 of X total", Previous 10 / Next 10 buttons) */}
        <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
          <CardBody className="py-3 px-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-blue-700">
                  {totalResponses === 0 ? 'Viewing 0 of 0 total' : `Viewing ${viewingStart}–${viewingEnd} of ${totalResponses} total`}
                </span>
                {debouncedSearch.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <span>Participant: "{debouncedSearch.trim()}" (All Videos)</span>
                    <button
                      onClick={handleClearSearch}
                      className="text-blue-500 hover:text-blue-800 font-bold ml-1"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="font-medium text-xs px-3 py-1.5"
                >
                  ← Previous 10
                </Button>
                <div className="text-xs font-semibold text-gray-600 px-2 min-w-[80px] text-center">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || loading}
                  className="font-medium text-xs px-3 py-1.5"
                >
                  Next 10 →
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Action bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600 font-medium">
            {stats && (
              <span>
                Coding Rate: <strong className="text-gray-900">{stats.codingRate}%</strong>
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="text-xs"
          >
            🔄 Refresh
          </Button>
        </div>

        {/* 2. SEARCH BAR & 4. SORTING OPTIONS */}
        <Card className="mb-6 border border-gray-200 shadow-sm bg-white">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Real-time search (Requirement 2) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Search Participant (Name or Username)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by participant name or @username..."
                    className="w-full pl-9 pr-20 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    🔍
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                      title="Clear search"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Real-time search across all videos for that participant
                </p>
              </div>

              {/* Sorting Options (Requirement 4) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Sort Responses
                </label>
                <select
                  value={sortByOption}
                  onChange={(e) => {
                    setSortByOption(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="name_asc">Participant Name (A–Z) — Default</option>
                  <option value="name_desc">Participant Name (Z–A)</option>
                  <option value="video_asc">Video Number (#1, #2, #3, #4...)</option>
                  <option value="date_desc">Submission Date (Newest First)</option>
                  <option value="date_asc">Submission Date (Oldest First)</option>
                  <option value="status_asc">Coding Status (Uncoded First)</option>
                  <option value="status_desc">Coding Status (Coded First)</option>
                  <option value="condition_asc">Condition (Anonymous First)</option>
                  <option value="condition_desc">Condition (Identifiable First)</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Secondary: video number ascending (#1, #2...)
                </p>
              </div>

              {/* Filter Status & Condition */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Filter Responses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={codedFilter}
                    onChange={(e) => {
                      setCodedFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="false">Uncoded Only</option>
                    <option value="true">Coded Only</option>
                  </select>
                  <select
                    value={conditionFilter}
                    onChange={(e) => {
                      setConditionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Conditions</option>
                    <option value="anonymous">Anonymous</option>
                    <option value="identifiable">Identifiable</option>
                  </select>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 3. RESPONSES TABLE WITH ALL REQUIRED FIELDS & SEQUENTIAL ORDER */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white">
          <CardBody className="p-0">
            {responses.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-sm">
                  {searchQuery || conditionFilter || codedFilter
                    ? 'No responses match your search filters'
                    : 'No responses found in dataset'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSearch}
                    className="mt-3 text-xs"
                  >
                    Reset Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th 
                          onClick={() => handleHeaderSort('name')}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Participant {sortByOption.startsWith('name') && (sortByOption.endsWith('asc') ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('condition')}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Condition {sortByOption.startsWith('condition') && (sortByOption.endsWith('asc') ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('video')}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Video Stimulus {sortByOption === 'video_asc' && '↑'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                          Response Preview
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('date')}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Submitted {sortByOption.startsWith('date') && (sortByOption.endsWith('asc') ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleHeaderSort('status')}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          Coding Status {sortByOption.startsWith('status') && (sortByOption.endsWith('asc') ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {responses.map((response, index) => {
                        // Check if this response starts a new participant group
                        const prevResponse = index > 0 ? responses[index - 1] : null;
                        const isNewParticipant = !prevResponse || 
                          (prevResponse.participant?._id !== response.participant?._id &&
                           prevResponse.participant?.username !== response.participant?.username);

                        return (
                          <React.Fragment key={response._id || (response as any).id || index}>
                            {/* Visual participant group separator when search is active or grouped */}
                            {isNewParticipant && debouncedSearch.trim() && (
                              <tr className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-transparent border-t-2 border-b border-blue-200">
                                <td colSpan={7} className="px-4 py-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold text-blue-950">
                                      👤 {response.participant?.name || 'Anonymous Participant'}
                                    </span>
                                    <span className="font-mono text-[11px] text-blue-700 bg-white/90 px-2 py-0.5 rounded border border-blue-200">
                                      @{response.participant?.username || 'unknown'}
                                    </span>
                                    <ConditionBadge condition={response.participant?.condition || 'anonymous'} />
                                    <span className="text-[11px] text-blue-600 font-medium ml-auto">
                                      Sequential Video Responses (#1, #2, #3, #4...)
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}

                            <tr className="hover:bg-blue-50/30 transition-colors">
                              {/* Field 1: Participant name + username */}
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {response.participant?.name || 'N/A'}
                                  </div>
                                  {response.participant?._id ? (
                                    <button
                                      onClick={() => handleViewParticipant(response.participant._id)}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-mono transition-colors"
                                      title="View Participant Details"
                                    >
                                      @{response.participant?.username || 'unknown'}
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 text-xs font-mono">
                                      @{response.participant?.username || 'unknown'}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Field 2: Condition (Identifiable/Anonymous) */}
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <ConditionBadge condition={response.participant?.condition || 'anonymous'} />
                              </td>

                              {/* Field 3: Video number + scenario name (Sequential: Video #1, #2...) */}
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
                                    Video #{response.video?.order ?? '—'}
                                  </span>
                                  <div className="text-xs text-gray-600 truncate max-w-[150px] font-medium" title={response.video?.title}>
                                    {response.video?.title || 'Scenario Stimulus'}
                                  </div>
                                </div>
                              </td>

                              {/* Field 4: Response preview text */}
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                <div className="truncate font-sans text-xs" title={response.responseText}>
                                  {response.responseText}
                                </div>
                              </td>

                              {/* Field 5: Submission date */}
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                {response.submittedAt ? new Date(response.submittedAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </td>

                              {/* Field 6: Coding status (CODED/UNCODED) */}
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <CodingStatusBadge coded={response.coded} />
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewResponse(response._id || (response as any).id)}
                                  className="text-xs font-medium"
                                >
                                  {response.coded ? 'View Coding' : 'Code Response'}
                                </Button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination Controls (Requirement 1) */}
                <div className="py-4 px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                  <div className="text-xs font-semibold text-gray-600">
                    {totalResponses === 0 ? 'Viewing 0 of 0 total' : `Viewing ${viewingStart}–${viewingEnd} of ${totalResponses} total`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className="text-xs px-3 py-1.5"
                    >
                      ← Previous 10
                    </Button>
                    <span className="text-xs font-semibold text-gray-600 px-2">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages || loading}
                      className="text-xs px-3 py-1.5"
                    >
                      Next 10 →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}

// -------------------------------------------------------------
// HELPER PRESENTATIONAL COMPONENTS
// -------------------------------------------------------------

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };

  return (
    <div className={`border rounded-lg p-4 shadow-sm ${colors[color as keyof typeof colors]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const isAnonymous = condition === 'anonymous';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
      isAnonymous ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
    }`}>
      {isAnonymous ? 'Anonymous' : 'Identifiable'}
    </span>
  );
}

function CodingStatusBadge({ coded }: { coded: boolean }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${
      coded ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
    }`}>
      {coded ? 'CODED' : 'UNCODED'}
    </span>
  );
}
