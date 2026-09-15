'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type {
  Admin,
  ResearchOverviewMetrics,
  ResearchSentimentAnalytics,
  ResearchToxicityAnalytics,
  ResearchAggressionAnalytics,
  ResearchCyberbullyingAnalytics,
  ResearchConditionComparison,
  ResearchVideoComparisonItem,
  ResearchAIHumanAgreement,
  ResearchResponsesTableResponse,
  ResearchValidationData,
  ResearchSupervisorReport
} from '@/types';

const SENTIMENT_COLORS = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
  mixed: '#F59E0B'
};

const CYBERBULLYING_COLORS = {
  present: '#DC2626',
  absent: '#059669'
};

const AGGRESSION_COLORS = {
  none: '#10B981',
  mild: '#FBBF24',
  moderate: '#F97316',
  severe: '#EF4444'
};

export default function AdminResearchAnalyticsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'condition' | 'videos' | 'ai_human' | 'validation' | 'responses' | 'supervisor_report'
  >('overview');

  // Filter state
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('');
  const [aggressionFilter, setAggressionFilter] = useState<string>('');
  const [cyberbullyingFilter, setCyberbullyingFilter] = useState<string>('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Table pagination state
  const [tablePage, setTablePage] = useState<number>(1);
  const [tableLimit, setTableLimit] = useState<number>(25);

  // Data states
  const [overview, setOverview] = useState<ResearchOverviewMetrics | null>(null);
  const [sentiment, setSentiment] = useState<ResearchSentimentAnalytics | null>(null);
  const [toxicity, setToxicity] = useState<ResearchToxicityAnalytics | null>(null);
  const [aggression, setAggression] = useState<ResearchAggressionAnalytics | null>(null);
  const [cyberbullying, setCyberbullying] = useState<ResearchCyberbullyingAnalytics | null>(null);
  const [conditionComparison, setConditionComparison] = useState<ResearchConditionComparison | null>(null);
  const [videoComparison, setVideoComparison] = useState<ResearchVideoComparisonItem[]>([]);
  const [aiHuman, setAiHuman] = useState<ResearchAIHumanAgreement | null>(null);
  const [responsesTable, setResponsesTable] = useState<ResearchResponsesTableResponse | null>(null);
  const [validationData, setValidationData] = useState<ResearchValidationData | null>(null);
  const [supervisorReport, setSupervisorReport] = useState<ResearchSupervisorReport | null>(null);

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, [conditionFilter, sentimentFilter, aggressionFilter, cyberbullyingFilter, reviewStatusFilter, startDateFilter, endDateFilter, tablePage, tableLimit]);

  const getActiveFilterParams = () => {
    const params: Record<string, any> = {};
    if (conditionFilter) params.condition = conditionFilter;
    if (sentimentFilter) params.sentiment = sentimentFilter;
    if (aggressionFilter) params.aggression = aggressionFilter;
    if (cyberbullyingFilter) params.cyberbullying = cyberbullyingFilter;
    if (reviewStatusFilter) params.reviewStatus = reviewStatusFilter;
    if (startDateFilter) params.startDate = startDateFilter;
    if (endDateFilter) params.endDate = endDateFilter;
    return params;
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = getActiveFilterParams();

      const results = await Promise.allSettled([
        api.admin.me(),
        api.admin.researchAnalytics.overview(params),
        api.admin.researchAnalytics.sentiment(params),
        api.admin.researchAnalytics.toxicity(params),
        api.admin.researchAnalytics.aggression(params),
        api.admin.researchAnalytics.cyberbullying(params),
        api.admin.researchAnalytics.conditionComparison(params),
        api.admin.researchAnalytics.videoComparison(params),
        api.admin.researchAnalytics.aiHumanAgreement(params),
        api.admin.researchAnalytics.responses({ ...params, page: tablePage, limit: tableLimit }),
        api.admin.researchAnalytics.validation(),
        api.admin.researchAnalytics.supervisorReport(params)
      ]);

      const val = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value?.data : null);

      // Check if admin authentication failed
      if (results[0].status === 'rejected') {
        const err: any = results[0].reason;
        if (err?.message === 'Admin authentication required' || err?.message?.includes('Unauthorized')) {
          router.push('/admin/login');
          return;
        }
      }

      setAdmin(val(results[0]));
      setOverview(val(results[1]));
      setSentiment(val(results[2]));
      setToxicity(val(results[3]));
      setAggression(val(results[4]));
      setCyberbullying(val(results[5]));
      setConditionComparison(val(results[6]));
      setVideoComparison(val(results[7]) || []);
      setAiHuman(val(results[8]));
      setResponsesTable(val(results[9]));
      setValidationData(val(results[10]));
      setSupervisorReport(val(results[11]));
    } catch (err: any) {
      if (err.message === 'Admin authentication required' || err.message?.includes('Unauthorized')) {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load research analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setConditionFilter('');
    setSentimentFilter('');
    setAggressionFilter('');
    setCyberbullyingFilter('');
    setReviewStatusFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setTablePage(1);
  };

  const handleLogout = async () => {
    try {
      await api.admin.logout();
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const activeFilterCount = [
    conditionFilter,
    sentimentFilter,
    aggressionFilter,
    cyberbullyingFilter,
    reviewStatusFilter,
    startDateFilter,
    endDateFilter
  ].filter(Boolean).length;

  if (loading && !overview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-600 font-medium">Loading Research Analytics & Validated Dataset...</p>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  // Pre-format chart data
  const sentimentChartData = sentiment ? [
    { name: 'Positive', count: sentiment.distribution.counts.positive || 0, percentage: sentiment.distribution.percentages.positive || 0, fill: SENTIMENT_COLORS.positive },
    { name: 'Neutral', count: sentiment.distribution.counts.neutral || 0, percentage: sentiment.distribution.percentages.neutral || 0, fill: SENTIMENT_COLORS.neutral },
    { name: 'Negative', count: sentiment.distribution.counts.negative || 0, percentage: sentiment.distribution.percentages.negative || 0, fill: SENTIMENT_COLORS.negative },
    { name: 'Mixed', count: sentiment.distribution.counts.mixed || 0, percentage: sentiment.distribution.percentages.mixed || 0, fill: SENTIMENT_COLORS.mixed }
  ] : [];

  const cbChartData = cyberbullying ? [
    { name: 'Cyberbullying', value: cyberbullying.presenceDistribution.counts.present || 0, fill: CYBERBULLYING_COLORS.present },
    { name: 'Not Cyberbullying', value: cyberbullying.presenceDistribution.counts.absent || 0, fill: CYBERBULLYING_COLORS.absent }
  ] : [];

  const aggressionChartData = aggression ? [
    { category: 'None', count: aggression.categoryDistribution.counts.none || 0, fill: AGGRESSION_COLORS.none },
    { category: 'Mild', count: aggression.categoryDistribution.counts.mild || 0, fill: AGGRESSION_COLORS.mild },
    { category: 'Moderate', count: aggression.categoryDistribution.counts.moderate || 0, fill: AGGRESSION_COLORS.moderate },
    { category: 'Severe', count: aggression.categoryDistribution.counts.severe || 0, fill: AGGRESSION_COLORS.severe }
  ] : [];

  const toxicitySubcatData = toxicity ? Object.entries(toxicity.subcategories).map(([key, val]) => ({
    name: key.replace(/_/g, ' ').toUpperCase(),
    count: val.count,
    percentage: val.percentage
  })) : [];

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Research Analytics, Results & Supervisor Reporting
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Phase 7 Final Coding
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Descriptive statistics derived from final validated researcher coding. AI predictions serve as decision support.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = api.admin.researchAnalytics.exportCSVUrl(getActiveFilterParams());
                window.open(url, '_blank');
              }}
            >
              📥 Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = api.admin.researchAnalytics.exportXLSXUrl(getActiveFilterParams());
                window.open(url, '_blank');
              }}
            >
              📊 Export Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = api.admin.researchAnalytics.exportJSONUrl(getActiveFilterParams());
                window.open(url, '_blank');
              }}
            >
              📑 Export JSON
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => window.print()}
            >
              🖨️ Print / Save Report
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={loadAllData}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error Loading Analytics">
            {error}
          </Alert>
        )}

        {/* Filter Control Bar */}
        <Card className="print:hidden">
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Research Filters</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 mb-1 font-medium">Condition</label>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Conditions</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="identifiable">Identifiable</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">Sentiment</label>
                <select
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">Aggression</label>
                <select
                  value={aggressionFilter}
                  onChange={(e) => setAggressionFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Aggression</option>
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">Cyberbullying</label>
                <select
                  value={cyberbullyingFilter}
                  onChange={(e) => setCyberbullyingFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="true">Cyberbullying Present</option>
                  <option value="false">Not Cyberbullying</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">Review Status</label>
                <select
                  value={reviewStatusFilter}
                  onChange={(e) => setReviewStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="reviewed">Reviewed / Approved</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="ai_generated">AI Generated</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-1 font-medium">End Date</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Summary Stat Cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Total Responses</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{overview.summary.totalResponses}</div>
              <div className="text-xs text-gray-400 mt-0.5">Eligible stimuli</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Final Coded</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{overview.summary.finalCodedCount}</div>
              <div className="text-xs text-emerald-700 mt-0.5">{overview.summary.codingCompletionRate}% completion</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Pending Review</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{overview.summary.pendingReviewCount}</div>
              <div className="text-xs text-amber-700 mt-0.5">Awaiting human signoff</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Uncoded</div>
              <div className="text-2xl font-bold text-gray-600 mt-1">{overview.summary.uncodedCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">No coding initiated</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Cyberbullying</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{overview.summary.cyberbullyingCount}</div>
              <div className="text-xs text-red-700 mt-0.5">{overview.summary.cyberbullyingRate}% of coded</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Aggressive</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{overview.summary.aggressiveCount}</div>
              <div className="text-xs text-orange-700 mt-0.5">{overview.summary.aggressiveRate}% of coded</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Negative Sentiment</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">{overview.sentiment.negative}</div>
              <div className="text-xs text-indigo-700 mt-0.5">{overview.sentiment.negativePct}% of coded</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 space-x-1 overflow-x-auto text-sm font-medium print:hidden">
          {[
            { key: 'overview', label: '📊 Overview & Distributions' },
            { key: 'condition', label: '⚖️ Condition Comparison' },
            { key: 'videos', label: '🎥 Stimulus / Video Breakdown' },
            { key: 'ai_human', label: '🤖 AI vs Human Agreement' },
            { key: 'validation', label: '🔬 NLP Validation (Phase 6)' },
            { key: 'responses', label: '📑 Research Data Explorer' },
            { key: 'supervisor_report', label: '📄 Supervisor Report' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & DISTRIBUTIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Distribution */}
              <Card>
                <CardHeader>
                  <h3 className="text-base font-semibold text-gray-900">Sentiment Distribution (Final Coding)</h3>
                  <p className="text-xs text-gray-500">Affective polarity coded by primary researcher</p>
                </CardHeader>
                <CardBody>
                  {mounted && sentiment && sentiment.totalCoded > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sentimentChartData}>
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip formatter={(value, name) => [`${value} responses`, name]} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {sentimentChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                      No final coded sentiment data for current filter
                    </div>
                  )}

                  {sentiment && (
                    <div className="mt-4 grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 text-center text-xs">
                      <div>
                        <span className="text-emerald-700 font-semibold block">Positive</span>
                        <span>{sentiment.distribution.counts.positive || 0} ({sentiment.distribution.percentages.positive || 0}%)</span>
                      </div>
                      <div>
                        <span className="text-gray-700 font-semibold block">Neutral</span>
                        <span>{sentiment.distribution.counts.neutral || 0} ({sentiment.distribution.percentages.neutral || 0}%)</span>
                      </div>
                      <div>
                        <span className="text-red-700 font-semibold block">Negative</span>
                        <span>{sentiment.distribution.counts.negative || 0} ({sentiment.distribution.percentages.negative || 0}%)</span>
                      </div>
                      <div>
                        <span className="text-amber-700 font-semibold block">Mixed</span>
                        <span>{sentiment.distribution.counts.mixed || 0} ({sentiment.distribution.percentages.mixed || 0}%)</span>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Cyberbullying Prevalence */}
              <Card>
                <CardHeader>
                  <h3 className="text-base font-semibold text-gray-900">Cyberbullying Operational Assessment</h3>
                  <p className="text-xs text-gray-500">Operational definition: Targeted hostility and harassment</p>
                </CardHeader>
                <CardBody>
                  {mounted && cyberbullying && cyberbullying.totalCoded > 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={cbChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {cbChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                      No final coded cyberbullying data for current filter
                    </div>
                  )}

                  <div className="mt-4 p-2.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-900">
                    <strong>Critical Research Principle:</strong> Cyberbullying is treated as a separate theoretical construct.
                    Negative Sentiment ≠ Toxicity ≠ Cyberbullying.
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aggression Distribution (Xu et al., 2020) */}
              <Card>
                <CardHeader>
                  <h3 className="text-base font-semibold text-gray-900">Aggression Severity (Xu et al. 2020)</h3>
                  <p className="text-xs text-gray-500">Categorical and numeric aggression distribution</p>
                </CardHeader>
                <CardBody>
                  {mounted && aggression && aggression.totalCoded > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aggressionChartData}>
                          <XAxis dataKey="category" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {aggressionChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                      No aggression data available
                    </div>
                  )}

                  {aggression && aggression.scoreSummary && (
                    <div className="mt-4 grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 text-center text-xs">
                      <div>
                        <span className="text-gray-500 block">Mean Score</span>
                        <span className="font-bold text-gray-900">{aggression.scoreSummary.mean ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Median Score</span>
                        <span className="font-bold text-gray-900">{aggression.scoreSummary.median ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Min Score</span>
                        <span className="font-bold text-gray-900">{aggression.scoreSummary.min ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Max Score</span>
                        <span className="font-bold text-gray-900">{aggression.scoreSummary.max ?? 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Toxicity & Subcategory Breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="text-base font-semibold text-gray-900">Toxicity Sub-Categories (Detoxify Multilingual)</h3>
                  <p className="text-xs text-gray-500">Prevalence of specific abusive language markers</p>
                </CardHeader>
                <CardBody>
                  {mounted && toxicity && toxicity.validTotal > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={toxicitySubcatData} layout="vertical">
                          <XAxis type="number" fontSize={12} />
                          <YAxis dataKey="name" type="category" width={110} fontSize={11} />
                          <Tooltip formatter={(val: any) => [`${val} responses`, 'Count']} />
                          <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                      No toxicity data available
                    </div>
                  )}

                  {toxicity && (
                    <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-600">
                      <div>Overall Toxic: <strong>{toxicity.toxicCount}</strong> ({toxicity.toxicPercentage}%)</div>
                      <div>Non-Toxic: <strong>{toxicity.nonToxicCount}</strong> ({toxicity.nonToxicPercentage}%)</div>
                      <div>Valid Total: <strong>{toxicity.validTotal}</strong></div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: CONDITION COMPARISON */}
        {activeTab === 'condition' && conditionComparison && (
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-gray-900">Experimental Condition Comparison</h3>
              <p className="text-xs text-gray-500">Cross-tabulation comparing Anonymous vs Identifiable participant responses</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Research Variable</th>
                      <th className="py-3 px-4 text-center bg-blue-50/50">Anonymous Condition</th>
                      <th className="py-3 px-4 text-center bg-purple-50/50">Identifiable Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Total Responses</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20 font-semibold">{conditionComparison.anonymous.totalResponses}</td>
                      <td className="py-3 px-4 text-center bg-purple-50/20 font-semibold">{conditionComparison.identifiable.totalResponses}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Coded Responses (Gold Standard)</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20">{conditionComparison.anonymous.codedResponses}</td>
                      <td className="py-3 px-4 text-center bg-purple-50/20">{conditionComparison.identifiable.codedResponses}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Cyberbullying Rate</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20 font-bold text-red-600">
                        {conditionComparison.anonymous.cyberbullying.count} ({conditionComparison.anonymous.cyberbullying.percentage}%)
                      </td>
                      <td className="py-3 px-4 text-center bg-purple-50/20 font-bold text-red-600">
                        {conditionComparison.identifiable.cyberbullying.count} ({conditionComparison.identifiable.cyberbullying.percentage}%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Aggressive Responses</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20 font-semibold text-orange-600">
                        {conditionComparison.anonymous.aggression.count} ({conditionComparison.anonymous.aggression.percentage}%)
                      </td>
                      <td className="py-3 px-4 text-center bg-purple-50/20 font-semibold text-orange-600">
                        {conditionComparison.identifiable.aggression.count} ({conditionComparison.identifiable.aggression.percentage}%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Mean Aggression Score</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20">
                        {conditionComparison.anonymous.aggression.meanScore ?? 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center bg-purple-50/20">
                        {conditionComparison.identifiable.aggression.meanScore ?? 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Negative Sentiment</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20">
                        {conditionComparison.anonymous.sentiment.negative.count} ({conditionComparison.anonymous.sentiment.negative.percentage}%)
                      </td>
                      <td className="py-3 px-4 text-center bg-purple-50/20">
                        {conditionComparison.identifiable.sentiment.negative.count} ({conditionComparison.identifiable.sentiment.negative.percentage}%)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-900">Positive Sentiment</td>
                      <td className="py-3 px-4 text-center bg-blue-50/20 text-emerald-600 font-semibold">
                        {conditionComparison.anonymous.sentiment.positive.count} ({conditionComparison.anonymous.sentiment.positive.percentage}%)
                      </td>
                      <td className="py-3 px-4 text-center bg-purple-50/20 text-emerald-600 font-semibold">
                        {conditionComparison.identifiable.sentiment.positive.count} ({conditionComparison.identifiable.sentiment.positive.percentage}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <strong>Methodology Disclaimer:</strong> {conditionComparison.note}
              </div>
            </CardBody>
          </Card>
        )}

        {/* TAB 3: VIDEO COMPARISON */}
        {activeTab === 'videos' && (
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-gray-900">Stimulus / Video Breakdown</h3>
              <p className="text-xs text-gray-500">Prevalence of cyberbullying and aggression across video stimuli</p>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Video Stimulus Title</th>
                      <th className="py-3 px-4 text-center">Submitted Responses</th>
                      <th className="py-3 px-4 text-center">Final Coded</th>
                      <th className="py-3 px-4 text-center">Cyberbullying Rate</th>
                      <th className="py-3 px-4 text-center">Aggression Rate</th>
                      <th className="py-3 px-4 text-center">Negative Sentiment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {videoComparison.length > 0 ? (
                      videoComparison.map((v) => (
                        <tr key={v.videoId} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-500">#{v.order}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{v.title}</td>
                          <td className="py-3 px-4 text-center">{v.responseCount}</td>
                          <td className="py-3 px-4 text-center">{v.codedCount}</td>
                          <td className="py-3 px-4 text-center font-bold text-red-600">{v.cyberbullyingRate}%</td>
                          <td className="py-3 px-4 text-center text-orange-600 font-semibold">{v.aggressionRate}%</td>
                          <td className="py-3 px-4 text-center">{v.negativeSentimentRate}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                          No active video stimuli found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* TAB 4: AI VS HUMAN AGREEMENT */}
        {activeTab === 'ai_human' && aiHuman && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-xs font-medium text-gray-500">Total Reviewed by Researcher</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{aiHuman.summary.totalReviewed}</div>
                <div className="text-xs text-gray-400 mt-0.5">{aiHuman.summary.totalWithAI} with AI predictions</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm bg-emerald-50/20">
                <div className="text-xs font-medium text-emerald-800">Accepted AI Suggestions</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{aiHuman.summary.acceptedCount}</div>
                <div className="text-xs text-emerald-700 mt-0.5">{aiHuman.summary.acceptedPercentage}% agreement</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm bg-amber-50/20">
                <div className="text-xs font-medium text-amber-800">Modified by Researcher</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{aiHuman.summary.modifiedCount}</div>
                <div className="text-xs text-amber-700 mt-0.5">{aiHuman.summary.modifiedPercentage}% overridden</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm bg-red-50/20">
                <div className="text-xs font-medium text-red-800">Rejected AI Suggestions</div>
                <div className="text-2xl font-bold text-red-700 mt-1">{aiHuman.summary.rejectedCount}</div>
                <div className="text-xs text-red-700 mt-0.5">{aiHuman.summary.rejectedPercentage}% discarded</div>
              </div>
            </div>

            {/* AI-Human Disagreement Inspector */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">AI-Human Disagreement Inspector</h3>
                    <p className="text-xs text-gray-500">
                      Audit trail of cases where AI prediction differed from final researcher ground truth
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded">
                    Total Discrepancies: {aiHuman.summary.discrepancyCount} ({aiHuman.summary.discrepancyRate}%)
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-50 font-semibold text-gray-600 uppercase border-b">
                      <tr>
                        <th className="py-2.5 px-3">Participant</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3">Response Snippet</th>
                        <th className="py-2.5 px-3">AI Prediction</th>
                        <th className="py-2.5 px-3">Final Researcher Coding</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {aiHuman.discrepancies.length > 0 ? (
                        aiHuman.discrepancies.map((disc, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 font-mono text-gray-500">ANON-{disc.responseId?.slice(-4)}</td>
                            <td className="py-2.5 px-3 capitalize">{disc.participantCondition}</td>
                            <td className="py-2.5 px-3 max-w-xs truncate text-gray-700" title={disc.responseTextSnippet}>
                              {disc.responseTextSnippet}
                            </td>
                            <td className="py-2.5 px-3 text-red-600">
                              <div>Sent: {disc.ai.sentiment}</div>
                              <div>Agg: {disc.ai.aggression}</div>
                              <div>CB: {disc.ai.cyberbullying}</div>
                            </td>
                            <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                              <div>Sent: {disc.final.sentiment}</div>
                              <div>Agg: {disc.final.aggression}</div>
                              <div>CB: {disc.final.cyberbullying}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">
                                {disc.reviewAction}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                            No AI-human discrepancies identified in reviewed responses
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB 5: NLP VALIDATION (PHASE 6) */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Phase 6 Empirical Validation & Calibration</h3>
                    <p className="text-xs text-gray-500">Scientific comparison against human ground truth benchmarks</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    validationData?.is_validated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {validationData?.validation_status || 'Validation Incomplete'}
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {validationData?.is_validated ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 font-medium">Cyberbullying Accuracy</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                          {((validationData.summary?.cyberbullying?.accuracy || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 font-medium">Cyberbullying F1-Score</div>
                        <div className="text-xl font-bold text-blue-600 mt-1">
                          {((validationData.summary?.cyberbullying?.f1 || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 font-medium">Sentiment Macro F1</div>
                        <div className="text-xl font-bold text-emerald-600 mt-1">
                          {((validationData.summary?.sentiment?.macro_f1 || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 font-medium">Cohen's Kappa (Model-Human)</div>
                        <div className="text-xl font-bold text-purple-600 mt-1">
                          {validationData.summary?.cyberbullying?.cohen_kappa?.toFixed(3) ?? 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                      <strong>Reproducibility Metadata:</strong> Evaluated on {validationData.sample_count} annotated samples.
                      Synthetic Benchmark: {validationData.is_synthetic_benchmark ? 'True' : 'False'}.
                      Optimal Decision Threshold: <code>{validationData.threshold_calibration?.cyberbullying_optimal ?? 0.5}</code>.
                    </div>
                  </>
                ) : (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded text-center text-sm text-amber-900">
                    <p className="font-semibold text-base mb-1">VALIDATION NOT AVAILABLE — HUMAN GOLD LABELS REQUIRED</p>
                    <p className="text-xs text-amber-700 max-w-lg mx-auto">
                      In accordance with empirical research standards, model confidence is never presented as research accuracy.
                      Run the Phase 6 evaluation pipeline on real human-labeled gold data to populate empirical performance metrics.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* TAB 6: RESEARCH DATA EXPLORER */}
        {activeTab === 'responses' && responsesTable && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Research Data Table</h3>
                  <p className="text-xs text-gray-500">
                    Showing {responsesTable.rows.length} of {responsesTable.pagination.totalRecords} total research responses
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Rows per page:</span>
                  <select
                    value={tableLimit}
                    onChange={(e) => {
                      setTableLimit(Number(e.target.value));
                      setTablePage(1);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-50 font-semibold text-gray-600 uppercase border-b">
                    <tr>
                      <th className="py-2.5 px-3">Participant</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Video</th>
                      <th className="py-2.5 px-3">Participant Response</th>
                      <th className="py-2.5 px-3">Final Sentiment</th>
                      <th className="py-2.5 px-3">Final Aggression</th>
                      <th className="py-2.5 px-3">Final Cyberbullying</th>
                      <th className="py-2.5 px-3">AI Suggestion</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {responsesTable.rows.length > 0 ? (
                      responsesTable.rows.map((row) => (
                        <tr key={row.codingId} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-gray-500">{row.participantId}</td>
                          <td className="py-2 px-3 capitalize">{row.condition}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">#{row.videoOrder}</td>
                          <td className="py-2 px-3 max-w-xs truncate text-gray-700" title={row.responseText}>
                            {row.responseText}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              row.finalCoding.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                              row.finalCoding.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                              row.finalCoding.sentiment === 'neutral' ? 'bg-gray-100 text-gray-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {row.finalCoding.sentiment}
                            </span>
                          </td>
                          <td className="py-2 px-3 capitalize">{row.finalCoding.aggressionCategory}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              row.finalCoding.cyberbullyingPresent ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {row.finalCoding.cyberbullyingPresent !== null ? (row.finalCoding.cyberbullyingPresent ? 'Yes' : 'No') : 'Pending'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500">
                            Sent: {row.aiSuggestion.sentiment} | CB: {row.aiSuggestion.cyberbullying !== null ? (row.aiSuggestion.cyberbullying ? 'Yes' : 'No') : 'N/A'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded font-medium text-[10px] bg-gray-100 text-gray-700">
                              {row.reviewStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-sm text-gray-400">
                          No research responses match active filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div>
                  Page {responsesTable.pagination.page} of {responsesTable.pagination.totalPages || 1}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={tablePage >= responsesTable.pagination.totalPages}
                    onClick={() => setTablePage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* TAB 7: SUPERVISOR REPORT */}
        {activeTab === 'supervisor_report' && supervisorReport && (
          <div className="space-y-6 bg-white p-8 rounded-lg border border-gray-200 shadow-sm print:border-none print:shadow-none">
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">M.Phil Research Study — Analytics & Findings Report</h2>
              <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-4">
                <span><strong>Generated:</strong> {new Date(supervisorReport.metadata.generatedAt).toLocaleString()}</span>
                <span><strong>Framework:</strong> {supervisorReport.metadata.primaryCoderFramework}</span>
                <span><strong>Provenance:</strong> {supervisorReport.metadata.provenance}</span>
              </div>
            </div>

            {/* Section 1: Overview */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">1. Dataset Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-500">Total Responses</div>
                  <div className="text-lg font-bold text-gray-900">{supervisorReport.overview.summary.totalResponses}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-500">Final Coded</div>
                  <div className="text-lg font-bold text-emerald-600">{supervisorReport.overview.summary.finalCodedCount} ({supervisorReport.overview.summary.codingCompletionRate}%)</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-500">Cyberbullying Rate</div>
                  <div className="text-lg font-bold text-red-600">{supervisorReport.overview.summary.cyberbullyingRate}%</div>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-gray-500">Aggression Rate</div>
                  <div className="text-lg font-bold text-orange-600">{supervisorReport.overview.summary.aggressiveRate}%</div>
                </div>
              </div>
            </div>

            {/* Section 2: Condition Comparison */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">2. Experimental Group Comparison</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border">Variable</th>
                      <th className="p-2 border text-center">Anonymous Condition</th>
                      <th className="p-2 border text-center">Identifiable Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border font-medium">Cyberbullying Rate</td>
                      <td className="p-2 border text-center font-bold text-red-600">{supervisorReport.conditionComparison.anonymous.cyberbullying.percentage}%</td>
                      <td className="p-2 border text-center font-bold text-red-600">{supervisorReport.conditionComparison.identifiable.cyberbullying.percentage}%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">Aggression Rate</td>
                      <td className="p-2 border text-center">{supervisorReport.conditionComparison.anonymous.aggression.percentage}%</td>
                      <td className="p-2 border text-center">{supervisorReport.conditionComparison.identifiable.aggression.percentage}%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">Negative Sentiment</td>
                      <td className="p-2 border text-center">{supervisorReport.conditionComparison.anonymous.sentiment.negative.percentage}%</td>
                      <td className="p-2 border text-center">{supervisorReport.conditionComparison.identifiable.sentiment.negative.percentage}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Methodology & Disclaimers */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">3. Methodology & Limitations</h3>
              <pre className="text-xs text-gray-700 bg-gray-50 p-4 rounded border border-gray-200 font-sans whitespace-pre-wrap leading-relaxed">
                {supervisorReport.methodologyNote}
              </pre>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
