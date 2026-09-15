'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseManagementDetail } from '@/types';

/**
 * Response Detail Page
 * Phase 12: View single response with full details and coding
 */

export default function ResponseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const responseId = params.id as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [detail, setDetail] = useState<ResponseManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [responseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin info
      const adminResponse = await api.admin.me();
      setAdmin(adminResponse.data);

      // Load response details
      const detailResponse = await api.admin.responses.getById(responseId);
      setDetail(detailResponse.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load response details');
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

  const handleCodeResponse = () => {
    router.push(`/admin/coding/${responseId}`);
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

  const { response, coding } = detail;

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/responses')}
            className="mb-4"
          >
            ← Back to Responses
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Response Details</h1>
              <p className="mt-2 text-gray-600">
                View complete response information and coding
              </p>
            </div>
            {!coding && (
              <Button onClick={handleCodeResponse}>
                Code This Response
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Participant Information */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Participant Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <InfoRow label="Name" value={response.participant?.name || 'N/A'} />
                <InfoRow label="Username" value={`@${response.participant?.username || 'unknown'}`} />
              </div>
              <div className="space-y-3">
                <InfoRow 
                  label="Condition" 
                  value={<ConditionBadge condition={response.participant?.condition || 'anonymous'} />} 
                />
                <InfoRow 
                  label="Status" 
                  value={<StatusBadge status={response.participant?.status || 'incomplete'} />} 
                />
              </div>
            </div>

            {response.participant?._id && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewParticipant(response.participant._id)}
                >
                  View Full Participant Profile
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Video Information */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Video Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Video Order" value={`#${response.video?.order || 'N/A'}`} />
              <InfoRow label="Title" value={response.video?.title || 'Unknown'} />
              <InfoRow label="Topic" value={response.video?.topic || 'N/A'} />
            </div>
          </CardBody>
        </Card>

        {/* Response Content */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Response Content</h2>
              <CodingStatusBadge coded={!!coding} />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                {response.responseText}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Submitted:</span>{' '}
                {new Date(response.submittedAt).toLocaleString()}
              </div>
              {response.responseTime && (
                <div>
                  <span className="font-medium">Response Time:</span>{' '}
                  {Math.round(response.responseTime / 1000)}s
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Coding Information */}
        {coding ? (
          <Card>
            <CardBody>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Coding Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCodeResponse}
                >
                  View/Edit Coding
                </Button>
              </div>

              <div className="space-y-6">
                {/* Sentiment */}
                {coding.sentiment && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Sentiment</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-900 font-medium capitalize">
                        {coding.sentiment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Aggression */}
                {(coding.aggression?.level || coding.aggression?.category) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Aggression</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {coding.aggression.category && (
                        <div>
                          <span className="text-xs text-gray-500">Category:</span>
                          <p className="text-gray-900 font-medium capitalize">
                            {coding.aggression.category}
                          </p>
                        </div>
                      )}
                      {coding.aggression.level !== undefined && (
                        <div>
                          <span className="text-xs text-gray-500">Level:</span>
                          <p className="text-gray-900 font-medium">
                            {coding.aggression.level}/5
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cyberbullying */}
                {coding.cyberbullying && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Cyberbullying</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Present:</span>
                        <p className="text-gray-900 font-medium">
                          {coding.cyberbullying.present ? 'Yes' : 'No'}
                        </p>
                      </div>
                      {coding.cyberbullying.present && coding.cyberbullying.type && (
                        <div>
                          <span className="text-xs text-gray-500">Type:</span>
                          <p className="text-gray-900 font-medium capitalize">
                            {coding.cyberbullying.type}
                          </p>
                        </div>
                      )}
                      {coding.cyberbullying.severity !== undefined && (
                        <div>
                          <span className="text-xs text-gray-500">Severity:</span>
                          <p className="text-gray-900 font-medium">
                            {coding.cyberbullying.severity}/5
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {coding.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Coder Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {coding.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Coded by:</span>{' '}
                      {coding.codedBy ? `${coding.codedBy.name} (@${coding.codedBy.username})` : 'System / Unassigned'}
                    </div>
                    <div>
                      <span className="font-medium">Role:</span>{' '}
                      <span className="capitalize">{coding.coderRole}</span>
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>{' '}
                      <span className="capitalize">{coding.confidence}</span>
                    </div>
                    <div>
                      <span className="font-medium">Coded at:</span>{' '}
                      {coding.codedAt ? new Date(coding.codedAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">This response has not been coded yet.</p>
                <Button onClick={handleCodeResponse}>
                  Code This Response
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </AdminLayout>
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

function CodingStatusBadge({ coded }: { coded: boolean }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      coded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {coded ? 'CODED' : 'UNCODED'}
    </span>
  );
}
