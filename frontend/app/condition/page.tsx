'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api, authStorage } from '@/lib/api';
import type { ConditionInfo } from '@/types';

/**
 * Condition Page
 * Phase 4: Shows participant's assigned condition and display identity
 * Anonymous: displays "Unknown User"
 * Identifiable: displays actual name
 */

export default function ConditionPage() {
  const router = useRouter();
  const [conditionInfo, setConditionInfo] = useState<ConditionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConditionInfo();
  }, []);

  const loadConditionInfo = async () => {
    try {
      const response = await api.condition.getInfo();
      setConditionInfo(response.data);
    } catch (err: any) {
      const cached = authStorage.getCachedParticipant();
      if (cached && cached.condition) {
        setConditionInfo({
          condition: cached.condition,
          assignedAt: cached.assignedAt || new Date().toISOString(),
          assignmentMethod: 'user-selected',
          displayName: cached.condition === 'anonymous' ? 'Anonymous User' : cached.name
        });
        return;
      }

      if (err.message === 'Authentication required') {
        router.push('/consent');
      } else {
        setError(err.message || 'Failed to load condition information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Navigate to participant dashboard
    // In future phases, this will navigate to the experiment
    router.push('/participant');
  };

  if (loading) {
    return (
      <PageContainer title="Loading..." description="">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Error" description="">
        <Alert variant="error">{error}</Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => router.push('/participant')}>
            Return to Dashboard
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!conditionInfo) {
    return null;
  }

  return (
    <PageContainer
      title="Study Identity"
      description="Your assigned identity for this study"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Condition Card */}
        <Card>
          <CardBody>
            <div className="text-center py-8">
              {/* Icon */}
              <div className="mb-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                  conditionInfo.condition === 'anonymous' 
                    ? 'bg-blue-100' 
                    : 'bg-green-100'
                }`}>
                  <span className="text-4xl">
                    {conditionInfo.condition === 'anonymous' ? '🔒' : '👤'}
                  </span>
                </div>
              </div>

              {/* Display Name */}
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Responding as:
              </h2>
              <p className="text-4xl font-bold text-blue-600 mb-6">
                {conditionInfo.displayName}
              </p>

              {/* Notice */}
              <Alert 
                variant={conditionInfo.condition === 'anonymous' ? 'info' : 'success'}
                className="text-left"
              >
                {conditionInfo.notice}
              </Alert>
            </div>
          </CardBody>
        </Card>

        {/* Information Card */}
        <Card>
          <CardBody>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              What This Means
            </h3>
            
            {conditionInfo.condition === 'anonymous' ? (
              <div className="space-y-3 text-gray-700">
                <p>
                  Throughout this study, your responses will be displayed and stored with 
                  the identity <strong>"Unknown User"</strong>.
                </p>
                <p>
                  This is your assigned condition for the study. Your actual name will not 
                  be shown in the experiment interface or in your responses.
                </p>
                <p>
                  Please proceed with the experiment using this identity.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-gray-700">
                <p>
                  Throughout this study, your responses will be displayed and stored with 
                  your actual name: <strong>{conditionInfo.displayName}</strong>.
                </p>
                <p>
                  This is your assigned condition for the study. Your identity will remain 
                  visible in the experiment interface and in your responses.
                </p>
                <p>
                  Please proceed with the experiment using this identity.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Assignment Metadata (for transparency) */}
        <Card>
          <CardBody>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Assignment Date:</span>
                <span>{new Date(conditionInfo.assignedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Assignment Version:</span>
                <span>{conditionInfo.assignmentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Condition:</span>
                <span className="capitalize">{conditionInfo.condition}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Continue Button */}
        <div className="text-center pt-4">
          <Button onClick={handleContinue} size="lg">
            Continue to Dashboard
          </Button>
        </div>

        {/* Help */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Questions?
            </h3>
            <p className="text-gray-700 mb-3">
              If you have questions about your assigned identity or how it affects 
              your participation, please contact the research team:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 italic">
                [REQUIRES RESEARCHER APPROVAL - Contact information]
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
