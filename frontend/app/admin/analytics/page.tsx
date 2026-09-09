'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { 
  Admin, 
  AnalyticsDashboard, 
  ConditionComparison,
  VideoResponseAnalytics,
  CodingAnalytics,
  AggressionAnalytics
} from '@/types';

/**
 * Analytics Page
 * Phase 11: Analytics + Research Export
 * CRITICAL: Descriptive statistics only - no inferential testing
 * CRITICAL: Read-only operations - never modify research data
 */

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [conditionComparison, setConditionComparison] = useState<ConditionComparison | null>(null);
  const [videoAnalytics, setVideoAnalytics] = useState<VideoResponseAnalytics[]>([]);
  const [codingAnalytics, setCodingAnalytics] = useState<CodingAnalytics | null>(null);
  const [aggressionAnalytics, setAggressionAnalytics] = useState<AggressionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'condition' | 'videos' | 'coding' | 'aggression'>('dashboard');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [adminRes, dashboardRes, conditionRes, videoRes, codingRes, aggressionRes] = await Promise.all([
        api.admin.me(),
        api.admin.analytics.dashboard(),
        api.admin.analytics.conditionComparison(),
        api.admin.analytics.videoResponses(),
        api.admin.analytics.coding(),
        api.admin.analytics.aggression()
      ]);

      setAdmin(adminRes.data);
      setDashboard(dashboardRes.data);
      setConditionComparison(conditionRes.data);
      setVideoAnalytics(videoRes.data);
      setCodingAnalytics(codingRes.data);
      setAggressionAnalytics(aggressionRes.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load analytics');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin || !dashboard) {
    return null;
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Research Analytics</h1>
          <p className="mt-2 text-gray-600">
            Descriptive statistics and data exploration
          </p>
          <Alert variant="info" className="mt-4">
            <strong>ℹ️ Note:</strong> This page provides descriptive analytics only. 
            Final inferential statistical analysis should be performed using approved statistical packages (SPSS, R, Python).
          </Alert>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'condition', label: 'Condition Comparison' },
              { id: 'videos', label: 'Video Responses' },
              { id: 'coding', label: 'Coding Analytics' },
              { id: 'aggression', label: 'Aggression Analytics' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Participant Metrics */}
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Participant Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard label="Total" value={dashboard.participants.total} color="blue" />
                  <MetricCard label="Anonymous" value={dashboard.participants.anonymous} color="purple" />
                  <MetricCard label="Identifiable" value={dashboard.participants.identifiable} color="indigo" />
                  <MetricCard label="Completed" value={dashboard.participants.completed} color="green" />
                  <MetricCard label="Incomplete" value={dashboard.participants.incomplete} color="yellow" />
                  <MetricCard label="Withdrawn" value={dashboard.participants.withdrawn} color="red" />
                </div>
              </CardBody>
            </Card>

            {/* Experiment Metrics */}
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Experiment Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Expected Responses" value={dashboard.experiment.expectedResponses} color="gray" />
                  <MetricCard label="Submitted Responses" value={dashboard.experiment.submittedResponses} color="blue" />
                  <MetricCard label="Completed Experiments" value={dashboard.experiment.completedExperiments} color="green" />
                  <MetricCard label="Response Rate" value={`${dashboard.experiment.responseCompletionRate}%`} color="purple" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Average responses per participant: {dashboard.experiment.avgResponsesPerParticipant}</p>
                </div>
              </CardBody>
            </Card>

            {/* Coding Metrics */}
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Coding Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Total Responses" value={dashboard.coding.totalResponses} color="gray" />
                  <MetricCard label="Coded" value={dashboard.coding.codedResponses} color="green" />
                  <MetricCard label="Uncoded" value={dashboard.coding.uncodedResponses} color="yellow" />
                  <MetricCard label="Coding Rate" value={`${dashboard.coding.codingCompletionRate}%`} color="purple" />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Condition Comparison Tab */}
        {activeTab === 'condition' && conditionComparison && (
          <div className="space-y-6">
            <Alert variant="warning" className="mb-4">
              <strong>⚠️ Descriptive Comparison Only:</strong> {conditionComparison.note}
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Anonymous Condition */}
              <Card>
                <CardBody>
                  <h3 className="text-lg font-bold text-blue-700 mb-4">Anonymous Condition</h3>
                  <div className="space-y-3">
                    <DataRow label="Participants" value={conditionComparison.anonymous.participantCount} />
                    <DataRow label="Completed" value={conditionComparison.anonymous.completedCount} />
                    <DataRow label="Completion Rate" value={`${conditionComparison.anonymous.completionRate}%`} />
                    <DataRow label="Total Responses" value={conditionComparison.anonymous.totalResponses} />
                    <DataRow label="Avg Responses/Participant" value={conditionComparison.anonymous.avgResponsesPerParticipant} />
                    <DataRow label="Coded Responses" value={conditionComparison.anonymous.codedResponses} />
                    {conditionComparison.anonymous.meanAggressionScore !== null && (
                      <DataRow label="Mean Aggression Score" value={conditionComparison.anonymous.meanAggressionScore.toFixed(2)} />
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Identifiable Condition */}
              <Card>
                <CardBody>
                  <h3 className="text-lg font-bold text-purple-700 mb-4">Identifiable Condition</h3>
                  <div className="space-y-3">
                    <DataRow label="Participants" value={conditionComparison.identifiable.participantCount} />
                    <DataRow label="Completed" value={conditionComparison.identifiable.completedCount} />
                    <DataRow label="Completion Rate" value={`${conditionComparison.identifiable.completionRate}%`} />
                    <DataRow label="Total Responses" value={conditionComparison.identifiable.totalResponses} />
                    <DataRow label="Avg Responses/Participant" value={conditionComparison.identifiable.avgResponsesPerParticipant} />
                    <DataRow label="Coded Responses" value={conditionComparison.identifiable.codedResponses} />
                    {conditionComparison.identifiable.meanAggressionScore !== null && (
                      <DataRow label="Mean Aggression Score" value={conditionComparison.identifiable.meanAggressionScore.toFixed(2)} />
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* Video Responses Tab */}
        {activeTab === 'videos' && (
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Video Response Completion</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anonymous</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identifiable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {videoAnalytics.map(video => (
                      <tr key={video.videoId}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          #{video.videoOrder} {video.videoTitle}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.expected}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.submitted}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.missing}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.completionPercentage}%</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.byCondition.anonymous}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{video.byCondition.identifiable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Coding Analytics Tab */}
        {activeTab === 'coding' && codingAnalytics && (
          <div className="space-y-6">
            <Alert variant="info">{codingAnalytics.note}</Alert>
            
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Coding Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Total" value={codingAnalytics.totalResponses} color="gray" />
                  <MetricCard label="Coded" value={codingAnalytics.codedResponses} color="green" />
                  <MetricCard label="Uncoded" value={codingAnalytics.uncodedResponses} color="yellow" />
                  <MetricCard label="Completion" value={`${codingAnalytics.codingCompletionPercentage}%`} color="purple" />
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardBody>
                  <h3 className="text-lg font-bold mb-3">Aggression Distribution</h3>
                  {Object.entries(codingAnalytics.distributions.aggression).map(([key, value]) => (
                    <DataRow key={key} label={key} value={value} />
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-lg font-bold mb-3">Sentiment Distribution</h3>
                  {Object.entries(codingAnalytics.distributions.sentiment).map(([key, value]) => (
                    <DataRow key={key} label={key} value={value} />
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-lg font-bold mb-3">Cyberbullying Distribution</h3>
                  {Object.entries(codingAnalytics.distributions.cyberbullying).map(([key, value]) => (
                    <DataRow key={key} label={key} value={value} />
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* Aggression Analytics Tab */}
        {activeTab === 'aggression' && aggressionAnalytics && (
          <div className="space-y-6">
            <Alert variant="warning">{aggressionAnalytics.note}</Alert>

            {aggressionAnalytics.codedResponsesCount > 0 ? (
              <>
                <Card>
                  <CardBody>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Aggression Scores</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard label="Coded Responses" value={aggressionAnalytics.codedResponsesCount} color="gray" />
                      <MetricCard label="Mean Score" value={aggressionAnalytics.meanScore?.toFixed(2) || 'N/A'} color="blue" />
                      <MetricCard label="Min Score" value={aggressionAnalytics.minScore || 'N/A'} color="green" />
                      <MetricCard label="Max Score" value={aggressionAnalytics.maxScore || 'N/A'} color="red" />
                    </div>
                  </CardBody>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardBody>
                      <h3 className="text-lg font-bold text-blue-700 mb-4">Anonymous Condition</h3>
                      <DataRow label="Coded Responses" value={aggressionAnalytics.byCondition.anonymous.count} />
                      <DataRow label="Mean Score" value={aggressionAnalytics.byCondition.anonymous.meanScore?.toFixed(2) || 'N/A'} />
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody>
                      <h3 className="text-lg font-bold text-purple-700 mb-4">Identifiable Condition</h3>
                      <DataRow label="Coded Responses" value={aggressionAnalytics.byCondition.identifiable.count} />
                      <DataRow label="Mean Score" value={aggressionAnalytics.byCondition.identifiable.meanScore?.toFixed(2) || 'N/A'} />
                    </CardBody>
                  </Card>
                </div>

                <Card>
                  <CardBody>
                    <h3 className="text-lg font-bold mb-3">Category Distribution</h3>
                    {Object.entries(aggressionAnalytics.categoryDistribution).map(([key, value]) => (
                      <DataRow key={key} label={key} value={value} />
                    ))}
                  </CardBody>
                </Card>
              </>
            ) : (
              <Alert variant="info">No aggression coding data available</Alert>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
