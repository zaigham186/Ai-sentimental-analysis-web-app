'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseWithCoding, CodingStatistics, PendingReviewItem, ParticipantNavInfo } from '@/types';

/**
 * Response Coding Management Page
 * Phase 5 & 10: NLP Results & Sentimental Coding UI Integration
 * 
 * CRITICAL RESEARCH PRINCIPLES:
 * - AI suggestions are decision-support aids only; researcher holds final authority
 * - Sentiment ≠ Aggression ≠ Cyberbullying
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

  // Filters & Search
  const [codedFilter, setCodedFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Sorting options (Requirement 4)
  // Default: participant name A-Z, secondary: video number ascending
  const [sortByOption, setSortByOption] = useState<string>('name_asc');

  // Navigation mode: 'participant' (default: navigate participant by participant) or 'all' (raw responses paged)
  const [viewMode, setViewMode] = useState<'participant' | 'all'>('participant');

  // Participant Navigation State (Participant #, previous/next, jump to typed number)
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(1);
  const [inputParticipantNumber, setInputParticipantNumber] = useState<string>('1');
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantNavInfo | null>(null);
  const [participantsList, setParticipantsList] = useState<ParticipantNavInfo[]>([]);

  // Raw Response Pagination (Used when in 'all' viewMode or search)
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

      // Build filter params
      const params: any = {
        sortBy,
        sortOrder
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
        params.page = currentPage;
        params.limit = pageSize;
      } else if (viewMode === 'participant') {
        params.participantIndex = currentParticipantIndex;
        params.participantRangeStart = currentParticipantIndex;
        params.participantRangeEnd = currentParticipantIndex;
        params.limit = 50; // Load all video responses for this participant
      } else {
        params.page = currentPage;
        params.limit = pageSize;
      }

      if (codedFilter) params.coded = codedFilter;
      if (conditionFilter) params.condition = conditionFilter;

      // Load responses, stats, pending count, and research validation status in parallel
      const [responsesResponse, statsResponse, pendingResponse, valResponse] = await Promise.all([
        api.admin.coding.getResponses(params),
        api.admin.coding.stats(),
        api.admin.coding.getPendingReview({ page: 1, limit: 1 }).catch(() => null),
        api.admin.coding.validationStatus().catch(() => null)
      ]);

      const resData = responsesResponse.data;
      const rawResponses = resData.responses || [];

      // Guarantee participant isolation and sequential video order
      let displayResponses = rawResponses;
      if (viewMode === 'participant' && !debouncedSearch.trim() && displayResponses.length > 0) {
        const targetPid = displayResponses[0]?.participant?._id || displayResponses[0]?.participant?.id;
        if (targetPid) {
          displayResponses = displayResponses.filter((r: any) => 
            (r.participant?._id || r.participant?.id) === targetPid
          );
        }
        displayResponses.sort((a: any, b: any) => (a.video?.order ?? 999) - (b.video?.order ?? 999));
      }

      setResponses(displayResponses);
      setTotalPages(resData.pagination?.pages || 1);
      setTotalResponses(displayResponses.length || resData.pagination?.total || 0);
      setStats(statsResponse.data);

      setTotalParticipants(resData.pagination?.totalParticipants ?? 0);

      // Resolve participant info
      const firstParticipant = displayResponses[0]?.participant;
      const resolvedParticipant = resData.pagination?.currentParticipant || (firstParticipant ? {
        index: currentParticipantIndex,
        id: firstParticipant._id || firstParticipant.id,
        name: firstParticipant.name || 'Participant #' + currentParticipantIndex,
        username: firstParticipant.username || 'unknown',
        condition: firstParticipant.condition || 'anonymous'
      } : null);

      setCurrentParticipant(resolvedParticipant);

      if (resData.pagination?.participantsList?.length) {
        setParticipantsList(resData.pagination.participantsList);
      } else if (participantsList.length === 0) {
        api.admin.participants.getAll({ limit: 100 }).then(pRes => {
          const pList = (pRes.data?.participants || []).map((p: any, idx: number) => ({
            index: idx + 1,
            id: p._id || p.id,
            name: p.name || 'Unnamed Participant',
            username: p.username || 'unknown',
            condition: p.condition || 'anonymous'
          }));
          if (pList.length > 0) {
            setParticipantsList(pList);
            setTotalParticipants(prev => (prev > 0 ? prev : pList.length));
          }
        }).catch(() => {});
      }

      if (resData.pagination?.currentParticipantIndex) {
        setCurrentParticipantIndex(resData.pagination.currentParticipantIndex);
        setInputParticipantNumber(String(resData.pagination.currentParticipantIndex));
      }

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
  }, [codedFilter, conditionFilter, debouncedSearch, currentPage, pageSize, sortByOption, currentParticipantIndex, viewMode, router]);

  // Participant Navigation Helpers
  const handlePrevParticipant = () => {
    if (currentParticipantIndex > 1) {
      const prev = currentParticipantIndex - 1;
      setCurrentParticipantIndex(prev);
      setInputParticipantNumber(String(prev));
    }
  };

  const handleNextParticipant = () => {
    if (currentParticipantIndex < totalParticipants) {
      const next = currentParticipantIndex + 1;
      setCurrentParticipantIndex(next);
      setInputParticipantNumber(String(next));
    }
  };

  const handleJumpToParticipant = () => {
    const num = parseInt(inputParticipantNumber, 10);
    if (isNaN(num) || num < 1) {
      setInputParticipantNumber('1');
      setCurrentParticipantIndex(1);
      return;
    }
    const max = totalParticipants > 0 ? totalParticipants : 1;
    const clamped = Math.min(num, max);
    setInputParticipantNumber(String(clamped));
    setCurrentParticipantIndex(clamped);
  };

  const handleSelectParticipant = (idx: number) => {
    setCurrentParticipantIndex(idx);
    setInputParticipantNumber(String(idx));
  };

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

        {/* Phase 6: Research Validation Status */}
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

              {validationData.is_validated && validationData.summary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <div className="text-[11px] font-semibold text-emerald-800 uppercase">Cyberbullying F1 & κ</div>
                    <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                      {validationData.summary.cyberbullying?.f1 !== undefined ? validationData.summary.cyberbullying.f1 : 'N/A'}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Cohen's κ: {validationData.summary.cyberbullying?.cohen_kappa !== undefined ? validationData.summary.cyberbullying.cohen_kappa : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="text-[11px] font-semibold text-blue-800 uppercase">Sentiment Accuracy</div>
                    <div className="text-lg font-extrabold text-blue-900 mt-0.5">
                      {validationData.summary.sentiment?.accuracy !== undefined ? `${Math.round(validationData.summary.sentiment.accuracy * 100)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-blue-700 mt-0.5">
                      Macro F1: {validationData.summary.sentiment?.macro_f1}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                    <div className="text-[11px] font-semibold text-purple-800 uppercase">Optimal Threshold</div>
                    <div className="text-lg font-extrabold text-purple-900 mt-0.5">
                      {validationData.threshold_calibration?.cyberbullying_optimal !== undefined ? `${validationData.threshold_calibration.cyberbullying_optimal}` : '0.50'}
                    </div>
                    <div className="text-[10px] text-purple-700 mt-0.5">
                      Calibrated for Best F1 ({validationData.threshold_calibration?.cyberbullying_best_f1})
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div className="text-[11px] font-semibold text-indigo-800 uppercase">Inter-Rater Agreement</div>
                    <div className="text-lg font-extrabold text-indigo-900 mt-0.5">
                      {validationData.inter_rater?.cohen_kappa?.cyberbullying !== undefined ? `κ = ${validationData.inter_rater.cohen_kappa.cyberbullying}` : '1 Coder'}
                    </div>
                    <div className="text-[10px] text-indigo-700 mt-0.5">
                      Dual-coded items: {validationData.inter_rater?.sample_count || 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span><strong>Human Gold Labels Required:</strong> Empirical accuracy metrics pending independently human-coded validation evaluation.</span>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* PARTICIPANT RECORD & RANGE NAVIGATION BAR */}
        <Card className="mb-6 border-2 border-blue-200 shadow-sm bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white">
          <CardBody className="py-3 px-5">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Left Side: Participant Record Number, Input, and Details */}
              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Toggle */}
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('participant');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      viewMode === 'participant' && !debouncedSearch.trim()
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    👤 By Participant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('all');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      viewMode === 'all' || debouncedSearch.trim()
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📋 All Responses
                  </button>
                </div>

                {viewMode === 'participant' && !debouncedSearch.trim() ? (
                  <>
                    {/* Participant Number Jump Input */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Participant #
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={totalParticipants || 1}
                        value={inputParticipantNumber}
                        onChange={(e) => setInputParticipantNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJumpToParticipant();
                        }}
                        onBlur={handleJumpToParticipant}
                        className="w-12 text-center font-extrabold text-blue-700 text-sm py-0.5 px-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50/50"
                        title="Type participant number (1 to total) and press Enter"
                      />
                      <span className="text-xs font-bold text-gray-500">
                        of {totalParticipants || 0}
                      </span>
                      <button
                        type="button"
                        onClick={handleJumpToParticipant}
                        className="text-[11px] font-bold px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition shadow-sm"
                        title="Jump to typed participant number"
                      >
                        Go
                      </button>
                    </div>

                    {/* Participant Details Badge */}
                    {currentParticipant && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm text-xs">
                        <span className="font-bold text-gray-900">{currentParticipant.name}</span>
                        <span className="text-gray-500 font-mono">@{currentParticipant.username}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          currentParticipant.condition === 'anonymous'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {currentParticipant.condition === 'anonymous' ? 'Anonymous' : 'Identifiable'}
                        </span>
                        <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {responses.length} responses
                        </span>
                      </div>
                    )}

                    {/* Quick Jump Dropdown */}
                    {participantsList.length > 0 && (
                      <select
                        value={currentParticipantIndex || 1}
                        onChange={(e) => handleSelectParticipant(parseInt(e.target.value, 10))}
                        className="text-xs py-1.5 px-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700 shadow-sm max-w-[200px] truncate"
                        title="Select participant from list"
                      >
                        {participantsList.map((p) => (
                          <option key={p.id} value={p.index}>
                            #{p.index}: {p.name} (@{p.username})
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-700 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-blue-700">
                      {totalResponses === 0 ? 'Viewing 0 of 0 total' : `Viewing ${viewingStart}–${viewingEnd} of ${totalResponses} total`}
                    </span>
                    {debouncedSearch.trim() && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <span>Search: "{debouncedSearch.trim()}"</span>
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
                )}
              </div>

              {/* Right Side: Previous / Next Navigation Buttons */}
              <div className="flex items-center gap-2">
                {viewMode === 'participant' && !debouncedSearch.trim() ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevParticipant}
                      disabled={currentParticipantIndex <= 1 || loading}
                      className="font-bold text-xs px-3 py-1.5 bg-white hover:bg-gray-50 border-gray-300 shadow-sm disabled:opacity-40"
                    >
                      ← Previous Participant
                    </Button>
                    <div className="text-xs font-bold text-blue-800 px-2 min-w-[70px] text-center bg-white py-1 rounded border border-blue-200 shadow-sm">
                      #{currentParticipantIndex} of {totalParticipants || 0}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextParticipant}
                      disabled={currentParticipantIndex >= totalParticipants || loading}
                      className="font-bold text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800 shadow-sm disabled:opacity-40"
                    >
                      Next Participant →
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {showPendingReview ? (
          /* VIEW 1: PENDING REVIEWS LIST */
          <Card className="border border-purple-200">
            <CardBody>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-purple-950">⚡ Pending AI Suggestions Awaiting Human Review</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Researcher retains final decision authority.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadPendingReviews} disabled={loadingPending}>
                  {loadingPending ? 'Refreshing...' : '🔄 Refresh'}
                </Button>
              </div>

              {pendingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pending AI suggestions require review at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map(item => (
                    <div key={item.codingId} className="p-4 rounded-lg border border-purple-100 bg-purple-50/30 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{item.participant?.name}</span>
                          <span className="text-xs text-gray-500 font-mono">@{item.participant?.username}</span>
                          <ConditionBadge condition={item.participant?.condition || 'anonymous'} />
                          <span className="text-xs font-medium text-gray-600">Video #{item.video?.order}: {item.video?.title}</span>
                        </div>
                        <p className="text-xs text-gray-700 italic">"{item.responseText}"</p>
                      </div>
                      <Button
                        onClick={() => handleViewResponse(item.responseId)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs whitespace-nowrap py-2 px-3.5"
                      >
                        Review & Code →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          /* VIEW 2: ALL RESPONSES TABLE WITH SEARCH & SORTING */
          <>
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
                      {searchQuery || codedFilter || conditionFilter
                        ? 'No responses match your search filters'
                        : 'No responses available in dataset'}
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
                              Action
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
                              <React.Fragment key={response.id || response._id || index}>
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
                                      <div className="text-gray-500 text-xs font-mono">
                                        @{response.participant?.username || 'unknown'}
                                      </div>
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

                                  {/* Action button */}
                                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewResponse(response.id || (response as any)._id)}
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

                    {/* Bottom Pagination & Navigation Controls */}
                    <div className="py-4 px-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                      <div className="text-xs font-semibold text-gray-600">
                        {viewMode === 'participant' && !debouncedSearch.trim() ? (
                          <span>
                            Viewing all {responses.length} responses for Participant #{currentParticipantIndex} of {totalParticipants}
                            {currentParticipant && <span className="ml-1 text-gray-500">({currentParticipant.name})</span>}
                          </span>
                        ) : (
                          <span>
                            {totalResponses === 0 ? 'Viewing 0 of 0 total' : `Viewing ${viewingStart}–${viewingEnd} of ${totalResponses} total`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {viewMode === 'participant' && !debouncedSearch.trim() ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handlePrevParticipant}
                              disabled={currentParticipantIndex <= 1 || loading}
                              className="font-bold text-xs px-3 py-1.5 bg-white hover:bg-gray-50 border-gray-300 shadow-sm disabled:opacity-40"
                            >
                              ← Previous Participant
                            </Button>
                            <div className="text-xs font-bold text-blue-800 px-2 min-w-[70px] text-center bg-white py-1 rounded border border-blue-200 shadow-sm">
                              #{currentParticipantIndex} of {totalParticipants || 0}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNextParticipant}
                              disabled={currentParticipantIndex >= totalParticipants || loading}
                              className="font-bold text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800 shadow-sm disabled:opacity-40"
                            >
                              Next Participant →
                            </Button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
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
