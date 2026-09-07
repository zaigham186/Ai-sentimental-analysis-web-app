'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';

/**
 * Experiment Start Page
 * Phase 5: Introduction and start experiment
 */

export default function ExperimentStartPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartExperiment = async () => {
    setStarting(true);
    setError(null);

    try {
      await api.experiment.start();
      
      // Navigate to experiment
      router.push('/experiment');

    } catch (err: any) {
      console.error('Start experiment error:', err);
      
      if (err.message === 'Authentication required') {
        router.push('/consent');
      } else if (err.message.includes('Consent required')) {
        setError('Please complete consent before starting the experiment');
      } else if (err.message.includes('Condition assignment required')) {
        setError('Condition assignment required. Please contact the research team.');
      } else {
        setError(err.message || 'Failed to start experiment');
      }
      
      setStarting(false);
    }
  };

  return (
    <PageContainer
      title="Video Response Experiment"
      description="Instructions for the experimental task"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {error && (
          <Alert variant="error">{error}</Alert>
        )}

        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Experimental Task Instructions
            </h2>

            <div className="prose prose-gray max-w-none space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                What You Will Do
              </h3>
              <p className="text-gray-700">
                In this experiment, you will:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Watch <strong>10 short video scenarios</strong> (approximately 30-45 seconds each)
                </li>
                <li>
                  Each video depicts an ethically ambiguous online interaction
                </li>
                <li>
                  After each video, you will be asked to provide your <strong>genuine reaction or opinion</strong>
                </li>
                <li>
                  Write 2-4 sentences describing your thoughts about each video
                </li>
                <li>
                  Videos must be completed in order - you cannot skip ahead
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">
                Time Required
              </h3>
              <p className="text-gray-700">
                This task will take approximately <strong>10-15 minutes</strong> to complete.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">
                Your Responses
              </h3>
              <p className="text-gray-700">
                Please provide honest, thoughtful responses. There are <strong>no right or wrong answers</strong>.
                We are interested in your genuine perspective on each scenario.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Important Notes
                </h4>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>
                    You can pause and return to the experiment later if needed (your progress will be saved)
                  </li>
                  <li>
                    Once you submit a response, you cannot edit it
                  </li>
                  <li>
                    Please ensure you have a stable internet connection
                  </li>
                  <li>
                    If you experience technical issues, please contact the research team
                  </li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mt-6">
                Ready to Begin?
              </h3>
              <p className="text-gray-700">
                When you click "Start Experiment" below, you will be shown the first video scenario.
                Please watch the video carefully before providing your response.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex gap-4 justify-between">
                <Button
                  variant="outline"
                  onClick={() => router.push('/participant')}
                  disabled={starting}
                >
                  Back to Dashboard
                </Button>

                <Button
                  onClick={handleStartExperiment}
                  disabled={starting}
                  size="lg"
                >
                  {starting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Starting...
                    </>
                  ) : (
                    'Start Experiment'
                  )}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Help */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Questions?
            </h3>
            <p className="text-gray-700 mb-3">
              If you have questions before starting, please contact the research team:
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
