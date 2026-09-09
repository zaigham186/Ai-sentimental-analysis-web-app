'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';

/**
 * Experiment Complete Page
 * Phase 5: Marks experiment as complete and transitions to questionnaires
 */

export default function ExperimentCompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);

  useEffect(() => {
    checkProgress();
  }, []);

  const checkProgress = async () => {
    try {
      const response = await api.experiment.getProgress();
      setProgressData(response.data);

      if (!response.data.allCompleted) {
        // Not all videos completed, redirect back to experiment
        router.push('/experiment');
        return;
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Check progress error:', err);
      setError(err.message || 'Failed to check progress');
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);

    try {
      await api.experiment.complete();
      setCompleted(true);

    } catch (err: any) {
      console.error('Complete experiment error:', err);
      setError(err.message || 'Failed to complete experiment');
      setCompleting(false);
    }
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

  if (completed) {
    return (
      <PageContainer
        title="Thank You!"
        description="Your participation is complete"
      >
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                    <span className="text-6xl">✓</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">
                    Experiment Complete!
                  </h2>
                  <p className="text-xl text-gray-700 mb-6">
                    Thank you for completing all video scenarios and providing your responses.
                  </p>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Your Contribution Matters
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Your honest responses will contribute to important research on cyberbullying behavior 
                    and its psychological correlates.
                  </p>
                  <p className="text-gray-700">
                    All your data has been securely recorded and will be analyzed to help us better 
                    understand online behavior patterns.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    What Happens Next?
                  </h4>
                  <p className="text-gray-700">
                    Your participation in this study is now complete. Your responses have been saved 
                    and you may now close this window or return to the dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => router.push('/participant')} size="lg" className="w-full">
                    Return to Dashboard
                  </Button>
                  <p className="text-sm text-gray-600">
                    If you have any questions about this research, please contact the research team.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Complete Experiment"
      description="Finalize your participation"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {error && (
          <Alert variant="error">{error}</Alert>
        )}

        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Video Response Experiment Complete
            </h2>

            <div className="space-y-6">
              <Alert variant="success">
                <strong>Congratulations!</strong> You have completed all {progressData?.total || 10} video scenarios 
                and submitted your responses.
              </Alert>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Progress
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Videos Completed:</span>
                    <span className="font-semibold text-gray-900">
                      {progressData?.completed || 0} / {progressData?.total || 10}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Completion:</span>
                    <span className="font-semibold text-green-600">
                      {progressData?.percentage || 100}%
                    </span>
                  </div>
                  {progressData?.startedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Started At:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(progressData.startedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Finalizing Your Participation
                </h4>
                <p className="text-gray-700">
                  Click the button below to complete your participation in this study. 
                  Your responses have been recorded and will be used for research purposes.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  size="lg"
                  className="w-full"
                >
                  {completing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Completing...
                    </>
                  ) : (
                    'Complete Participation'
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Thank You
            </h3>
            <p className="text-gray-700">
              Your responses will contribute to important research on cyberbullying behavior 
              and its psychological correlates. Your honest participation is greatly appreciated.
            </p>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
