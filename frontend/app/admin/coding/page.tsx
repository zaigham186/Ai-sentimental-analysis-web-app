'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseWithCoding, CodingStatistics, PendingReviewItem } from '@/types';

/**
 * Response Coding Management Page
 * Phase 5: NLP Results & Sentimental Coding UI Integration
 * 
 * CRITICAL RESEARCH PRINCIPLES:
 * - AI suggestions are decision-support aids only; researcher holds final authority
 * - Sentiment &ne; Aggression &ne; Cyberbullying
 * - Full visibility of pending AI reviews and bulk processing
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
  
  // Pending review state
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);

  // Phase 6: Research Validation & Calibration state
  const [validationData, setValidationData] = useState<any>(null);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Filters
  const [codedFilter, setCodedFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Participant-based pagination
  const [participantPageSize] = useState(30); // Participants per range
  const [participantPage, setParticipantPage] = useState(1);
  const [totalParticipants, setTotalParticipants] = useState(0);
  
  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const loadData = useCallback(async () => {
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
      if (codedFilter) params.coded = codedFilter === 'true';
      if (conditionFilter) params.condition = conditionFilter;
      if (searchQuery) params.search = searchQuery;

      // Load responses, stats, pending count, and research validation status in parallel
      const [responsesResponse, statsResponse, pendingResponse, valResponse] = await Promise.all([
        api.admin.coding.getResponses(params),
        api.admin.coding.stats(),
        api.admin.coding.getPendingReview({ page: 1, limit: 1 }).catch(() => null),
        api.admin.coding.validationStatus().catch(() => null)
      ]);

      setResponses(responsesResponse.data.responses);
      setTotalPages(responsesResponse.data.pagination.pages);
      setTotalParticipants(responsesResponse.data.pagination.totalParticipants || 0);
      setStats(statsResponse.data);
      if (pendingResponse?.data?.pagination?.total !== undefined) {
        setPendingTotal(pendingResponse.data.pagination.total);
      }
      if (valResponse?.data) {
        setValidationData(valResponse.data);
      }
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load responses');
      }
    } finally {
      setLoading(false);
    }
  }, [codedFilter, conditionFilter, searchQuery, currentPage, pageSize, participantPage, participantPageSize, router]);

  const loadPendingReviews = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await api.admin.coding.getPendingReview({ page: 1, limit: 50 });
      setPendingReviews(res.data.codings || []);
      setPendingTotal(res.data.pagination.total || 0);
    } catch (err: any) {
      console.error('Failed to load pending reviews:', err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (showPendingReview) {
      loadPendingReviews();
    }
  }, [showPendingReview, loadPendingReviews]);

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

  // Bulk AI Analysis
  const handleBulkAnalyze = async () => {
    if (!confirm('Analyze all uncoded responses with AI? This will run the NLP pipeline in the background.')) return;
    
    try {
      setBulkAnalyzing(true);
      setError(null);
      setSuccess(null);

      const filters: any = {};
      if (conditionFilter) filters.condition = conditionFilter;

      const result = await api.admin.coding.bulkAnalyze(filters);
      setSuccess(`Bulk AI analysis completed! ${result.data.success} responses analyzed and queued for researcher review.`);
      
      // Reload list and pending reviews
      await loadData();
      if (showPendingReview) {
        await loadPendingReviews();
      }
    } catch (err: any) {
      setError('Bulk analysis encountered an issue. Please try again or analyze individual responses.');
    } finally {
      setBulkAnalyzing(false);
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
      <div className="max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Response Coding</h1>
          <p className="mt-1 text-gray-600">
            Research-grade coding system for sentiment, aggression (Xu et al., 2020), and cyberbullying perpetration
          </p>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <strong>Scientific Protocol Reminder:</strong> Negative sentiment does not equate to toxicity or cyberbullying. All AI suggestions require explicit human researcher vetting (Accept, Modify, or Reject).
            </div>
          </div>
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

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Responses" value={stats.total} color="blue" />
            <StatCard title="Coded & Finalized" value={stats.coded} color="green" />
            <StatCard title="Uncoded Responses" value={stats.uncoded} color="yellow" />
            <StatCard 
              title="Coding Progress" 
              value={`${stats.progress}%`} 
              color="purple" 
            />
          </div>
        )}

        {/* AI-Assisted Coding Banner */}
        <Card className="mb-6 border-2 border-indigo-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-indigo-950">
                    ⚡ AI-Assisted NLP Coding Pipeline
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-200 text-indigo-900 rounded">
                    Phase 5 Active
                  </span>
                </div>
                <p className="text-indigo-900 text-sm mb-2">
                  Accelerate coding workflows with real transformer models (XLM-RoBERTa sentiment, Detoxify multilingual, and Xu et al. aggression lexicon).
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-700">
                  <span>✓ Deterministic Evidence</span>
                  <span>✓ Multi-category Toxicity</span>
                  <span>✓ Strict Human-in-the-Loop</span>
                  <span>✓ Transparent Audit Trail</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  onClick={handleBulkAnalyze}
                  disabled={bulkAnalyzing || stats?.uncoded === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap px-4 py-2"
                >
                  {bulkAnalyzing ? '⏳ Running NLP Pipeline...' : `🤖 Bulk Analyze (${stats?.uncoded || 0} uncoded)`}
                </Button>
                <Button
                  variant={showPendingReview ? 'primary' : 'outline'}
                  onClick={() => setShowPendingReview(!showPendingReview)}
                  className={`whitespace-nowrap px-4 py-2 ${
                    showPendingReview 
                      ? 'bg-purple-700 text-white' 
                      : 'border-purple-300 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  {showPendingReview ? '📋 View All Responses' : `⚡ Pending AI Reviews (${pendingTotal})`}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

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

        {/* Phase 6: Research Validation & Accuracy Calibration Status */}
        {validationData && (
          <Card className="mb-6 border border-emerald-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-6 py-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔬</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">
                      Research NLP Validation & Calibration Status
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      validationData.is_validated 
                        ? (validationData.is_synthetic_benchmark ? 'bg-emerald-100 text-emerald-800' : 'bg-green-100 text-green-800')
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {validationData.validation_status || (validationData.is_validated ? 'Validated' : 'Not Validated')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {validationData.is_validated 
                      ? `Evaluated against ${validationData.sample_count} annotated samples (${validationData.is_synthetic_benchmark ? 'Synthetic Benchmark Dataset' : 'Human Gold Labels'})`
                      : 'Validation pending independently human-coded gold labels'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {validationData.is_validated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowValidationDetails(!showValidationDetails)}
                    className="text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                  >
                    {showValidationDetails ? '▲ Hide Details' : '▼ Calibration & Error Details'}
                  </Button>
                )}
              </div>
            </div>

            <CardBody className="p-5">
              {/* Models & Systems Availability Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sentiment Model</div>
                  <div className="text-xs font-bold text-gray-800 mt-1 flex items-center gap-1">
                    <span className="text-green-600">✓</span> XLM-RoBERTa
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">CardiffNLP Twitter</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Toxicity Model</div>
                  <div className="text-xs font-bold text-gray-800 mt-1 flex items-center gap-1">
                    <span className="text-green-600">✓</span> Detoxify
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Multilingual RoBERTa</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Aggression Framework</div>
                  <div className="text-xs font-bold text-gray-800 mt-1 flex items-center gap-1">
                    <span className="text-green-600">✓</span> Xu et al. (2020)
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Lexicon & Targeting</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cyberbullying</div>
                  <div className="text-xs font-bold text-gray-800 mt-1 flex items-center gap-1">
                    <span className="text-green-600">✓</span> Operational Criteria
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Multi-signal Assessment</div>
                </div>
              </div>

              {/* Validation Summary Metrics */}
              {validationData.is_validated && validationData.summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <div className="text-[11px] font-semibold text-emerald-800 uppercase">Cyberbullying F1 & κ</div>
                    <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                      {validationData.summary.cyberbullying?.f1 !== undefined ? validationData.summary.cyberbullying.f1 : 'N/A'}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Cohen's κ: {validationData.summary.cyberbullying?.cohen_kappa !== undefined ? validationData.summary.cyberbullying.cohen_kappa : 'N/A'} (Precision: {validationData.summary.cyberbullying?.precision})
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="text-[11px] font-semibold text-blue-800 uppercase">Sentiment Accuracy</div>
                    <div className="text-lg font-extrabold text-blue-900 mt-0.5">
                      {validationData.summary.sentiment?.accuracy !== undefined ? `${Math.round(validationData.summary.sentiment.accuracy * 100)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-blue-700 mt-0.5">
                      Macro F1: {validationData.summary.sentiment?.macro_f1} | κ: {validationData.summary.sentiment?.cohen_kappa}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                    <div className="text-[11px] font-semibold text-purple-800 uppercase">Optimal Threshold</div>
                    <div className="text-lg font-extrabold text-purple-900 mt-0.5">
                      {validationData.threshold_calibration?.cyberbullying_optimal !== undefined ? `${validationData.threshold_calibration.cyberbullying_optimal}` : '0.50'}
                    </div>
                    <div className="text-[10px] text-purple-700 mt-0.5">
                      Calibrated for Cyberbullying F1 ({validationData.threshold_calibration?.cyberbullying_best_f1})
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div className="text-[11px] font-semibold text-indigo-800 uppercase">Inter-Rater Reliability</div>
                    <div className="text-lg font-extrabold text-indigo-900 mt-0.5">
                      {validationData.inter_rater?.cohen_kappa?.cyberbullying !== undefined ? `κ = ${validationData.inter_rater.cohen_kappa.cyberbullying}` : '1 Coder'}
                    </div>
                    <div className="text-[10px] text-indigo-700 mt-0.5">
                      Human vs. Human agreement across {validationData.inter_rater?.sample_count || 0} dual-coded items
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span><strong>Human Gold Labels Required:</strong> Real empirical accuracy metrics remain pending until an independently human-coded validation dataset is evaluated.</span>
                </div>
              )}

              {/* Collapsible Calibration & Error Details */}
              {showValidationDetails && validationData.is_validated && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">Error Discrepancy Breakdown ({validationData.error_summary?.total_discrepancies || 0} total)</h4>
                      <ul className="space-y-1">
                        {validationData.error_summary?.breakdown && Object.entries(validationData.error_summary.breakdown).map(([cat, count]: any) => (
                          <li key={cat} className="flex justify-between py-1 border-b border-gray-100 text-gray-700">
                            <span className="font-mono text-[11px]">{cat}</span>
                            <span className="font-bold">{count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">Research Methodology Principles</h4>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1.5 text-gray-600 text-[11px]">
                        <div>• <strong>Negative Sentiment ≠ Cyberbullying:</strong> Content critique is non-bullying.</div>
                        <div>• <strong>Toxicity ≠ Cyberbullying:</strong> Vulgarity without targeted harassment is separate.</div>
                        <div>• <strong>Human Authority:</strong> AI outputs are suggestions; human review is mandatory.</div>
                        <div>• <strong>Roman Urdu Nuances:</strong> Dialect code-switching requires empirical validation.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* VIEW 1: PENDING REVIEWS LIST */}
        {showPendingReview ? (
          <Card className="border border-purple-200">
            <CardBody>
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div>
                  <h2 className="text-xl font-bold text-purple-950">
                    Pending AI Reviews ({pendingReviews.length} shown of {pendingTotal})
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Responses analyzed by the NLP service awaiting researcher review (Accept, Modify, or Reject).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPendingReviews()}
                  disabled={loadingPending}
                >
                  🔄 Refresh Reviews
                </Button>
              </div>

              {loadingPending ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-base font-medium">No pending AI reviews found.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    All analyzed responses have been reviewed or no responses have been analyzed with AI yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.map((item) => (
                    <div 
                      key={item.codingId || item.responseId}
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 shadow-sm transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-bold text-gray-900 text-sm">{item.participant?.name || 'Participant'}</span>
                          <span className="text-xs text-gray-500">(@{item.participant?.username || 'unknown'})</span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            item.participant?.condition === 'anonymous' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.participant?.condition || 'condition'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Video #{item.video?.order}
                          </span>
                          {item.aiSuggestion?.metadata?.fallback_used && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                              Fallback Heuristic
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-700 font-sans line-clamp-2 bg-gray-50 p-2 rounded border border-gray-100 mb-2">
                          &ldquo;{item.responseText}&rdquo;
                        </p>

                        {/* AI Suggestions Summary Tags */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-gray-500">AI Suggested:</span>
                          
                          {/* Sentiment tag */}
                          <span className={`px-2 py-0.5 font-medium rounded ${
                            item.aiSuggestion?.sentiment?.label === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                            item.aiSuggestion?.sentiment?.label === 'negative' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            Sentiment: {item.aiSuggestion?.sentiment?.label || 'neutral'}
                          </span>

                          {/* Toxicity tag if available */}
                          {item.aiSuggestion?.metadata?.toxicity_score !== undefined && (
                            <span className={`px-2 py-0.5 font-medium rounded ${
                              item.aiSuggestion.metadata.is_toxic ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Toxicity: {(item.aiSuggestion.metadata.toxicity_score * 100).toFixed(0)}%
                            </span>
                          )}

                          {/* Aggression tag */}
                          <span className="px-2 py-0.5 font-medium bg-purple-100 text-purple-800 rounded">
                            Aggression: {item.aiSuggestion?.aggression?.label || 'none'} (lvl {item.aiSuggestion?.aggression?.level ?? 0})
                          </span>

                          {/* Cyberbullying tag */}
                          <span className={`px-2 py-0.5 font-medium rounded ${
                            item.aiSuggestion?.cyberbullying?.present ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Cyberbullying: {item.aiSuggestion?.cyberbullying?.present ? 'Present' : 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Button
                          onClick={() => handleViewResponse(item.responseId)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs whitespace-nowrap py-2 px-3.5"
                        >
                          Review & Code &rarr;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          /* VIEW 2: ALL RESPONSES TABLE */
          <>
            {/* Filters */}
            <Card className="mb-6 border border-gray-200">
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Search Response Text
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search participant responses..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Coding Status Filter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Coding Status
                    </label>
                    <select
                      value={codedFilter}
                      onChange={(e) => {
                        setCodedFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Responses</option>
                      <option value="false">Uncoded Only</option>
                      <option value="true">Coded Only</option>
                    </select>
                  </div>

                  {/* Condition Filter */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Experimental Condition
                    </label>
                    <select
                      value={conditionFilter}
                      onChange={(e) => {
                        setConditionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Conditions</option>
                      <option value="anonymous">Anonymous Condition</option>
                      <option value="identifiable">Identifiable Condition</option>
                    </select>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Responses Table */}
            <Card className="border border-gray-200">
              <CardBody>
                {responses.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {searchQuery || codedFilter || conditionFilter
                        ? 'No responses match your search filters'
                        : 'No responses available in dataset'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Participant
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Condition
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Video
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Response Preview
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Submitted
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                              Status
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {responses.map((response) => (
                            <tr key={response.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div>
                                  <div className="font-semibold">{response.participant?.name || 'N/A'}</div>
                                  <div className="text-gray-500 text-xs font-mono">
                                    @{response.participant?.username || 'unknown'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <ConditionBadge condition={response.participant?.condition || 'anonymous'} />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div>
                                  <div className="font-semibold">#{response.video?.order || 'N/A'}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-[140px]">
                                    {response.video?.title || 'Unknown'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                <div className="truncate font-sans text-xs">
                                  {response.responseText}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(response.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                <CodingStatusBadge coded={response.coded} />
                              </td>
                              <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewResponse(response.id)}
                                  className="text-xs"
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
                        <span className="text-xs text-gray-600 font-medium">
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
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// -------------------------------------------------------------
// HELPER PRESENTATIONAL COMPONENTS
// -------------------------------------------------------------

function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
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
      isAnonymous ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
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
      {coded ? 'Coded' : 'Uncoded'}
    </span>
  );
}
