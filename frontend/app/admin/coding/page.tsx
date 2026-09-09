'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseWithCoding, CodingStatistics } from '@/types';

/**
 * Response Coding Page
 * Phase 10: Response Coding System + Phase 10 Enhancement: AI-Assisted Coding
 * Researcher can view and code participant responses
 * CRITICAL: Never modifies original responseText
 * CRITICAL: AI provides SUGGESTIONS only, human makes final decision
 */

export default function AdminCodingPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [responses, setResponses] = useState<ResponseWithCoding[]>([]);
  const [stats, setStats] = useState<CodingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [codedFilter, setCodedFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPendingReview, setShowPendingReview] = useState(false);
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadData();
  }, [codedFilter, conditionFilter, searchQuery, currentPage]);

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
      if (codedFilter) params.coded = codedFilter === 'true';
      if (conditionFilter) params.condition = conditionFilter;
      if (searchQuery) params.search = searchQuery;

      // Load responses and stats in parallel
      const [responsesResponse, statsResponse] = await Promise.all([
        api.admin.coding.getResponses(params),
        api.admin.coding.stats()
      ]);

      setResponses(responsesResponse.data.responses);
      setTotalPages(responsesResponse.data.pagination.pages);
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
    router.push(`/admin/coding/${responseId}`);
  };

  // Phase 10 Enhancement: Bulk AI Analysis
  const handleBulkAnalyze = async () => {
    if (!confirm('Analyze all uncoded responses with AI? This may take a few moments.')) return;
    
    try {
      setBulkAnalyzing(true);
      setError(null);
      setSuccess(null);

      const filters: any = {};
      if (conditionFilter) filters.condition = conditionFilter;

      const result = await api.admin.coding.bulkAnalyze(filters);
      
      setSuccess(`Bulk analysis completed! ${result.data.success} responses analyzed successfully.`);
      
      // Reload data
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to perform bulk analysis');
    } finally {
      setBulkAnalyzing(false);
    }
  };

  // Phase 10 Enhancement: View pending reviews
  const handleViewPendingReviews = () => {
    setShowPendingReview(true);
    setCodedFilter('');
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
          <h1 className="text-3xl font-bold text-gray-900">Response Coding</h1>
          <p className="mt-2 text-gray-600">
            Code participant responses for aggression and cyberbullying analysis
          </p>
          <Alert variant="warning" className="mt-4">
            <strong>⚠️ Research Protocol:</strong> All coding categories require researcher/supervisor approval. 
            Do not automatically equate negative sentiment with aggression or cyberbullying.
          </Alert>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Responses" value={stats.total} color="blue" />
            <StatCard title="Coded" value={stats.coded} color="green" />
            <StatCard title="Uncoded" value={stats.uncoded} color="yellow" />
            <StatCard 
              title="Progress" 
              value={`${stats.progress}%`} 
              color="purple" 
            />
          </div>
        )}

        {/* AI-Assisted Coding Banner */}
        <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  🤖 AI-Assisted Coding (Phase 10 Enhancement)
                </h3>
                <p className="text-blue-800 text-sm mb-3">
                  Speed up your coding workflow with AI suggestions. AI analyzes responses and provides evidence-based 
                  coding suggestions for sentiment, aggression, and cyberbullying. You review and make the final decision.
                </p>
                <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                  <li><strong>Context-aware:</strong> Not keyword-based, analyzes full context</li>
                  <li><strong>Evidence-based:</strong> Provides rationale for suggestions</li>
                  <li><strong>Human-in-the-loop:</strong> You always make the final decision (Accept/Modify/Reject)</li>
                  <li><strong>Transparent:</strong> Full audit trail of AI vs human coding</li>
                </ul>
              </div>
              <div className="ml-6 flex flex-col gap-2">
                <Button
                  onClick={handleBulkAnalyze}
                  disabled={bulkAnalyzing || stats?.uncoded === 0}
                  className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                >
                  {bulkAnalyzing ? '🔄 Analyzing...' : `🤖 Bulk Analyze (${stats?.uncoded || 0} uncoded)`}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleViewPendingReviews}
                  className="whitespace-nowrap border-purple-300"
                >
                  📋 View Pending Reviews
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

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
            </div>
          </CardBody>
        </Card>

        {/* Responses Table */}
        <Card>
          <CardBody>
            {responses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery || codedFilter || conditionFilter
                    ? 'No responses match your filters'
                    : 'No responses available for coding'}
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
                        <tr key={response.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{response.participant.name}</div>
                              <div className="text-gray-500 text-xs">
                                @{response.participant.username}
                              </div>
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
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                            <div className="truncate">
                              {response.responseText.substring(0, 100)}
                              {response.responseText.length > 100 && '...'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(response.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <CodingStatusBadge coded={response.coded} />
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResponse(response.id)}
                            >
                              {response.coded ? 'View Coding' : 'Code Response'}
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

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
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
      isAnonymous ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
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
