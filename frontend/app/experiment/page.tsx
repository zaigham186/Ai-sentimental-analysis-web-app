'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { CurrentVideoData, ResponseSubmission } from '@/types';

/**
 * Experiment Page
 * Phase 5: Video-based experiment interface
 * Displays videos sequentially and collects participant responses
 */

export default function ExperimentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<CurrentVideoData | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [allCompleted, setAllCompleted] = useState(false);
  const submitAttempted = useRef(false);

  useEffect(() => {
    loadCurrentVideo();
    setStartTime(Date.now());
  }, []);

  const loadCurrentVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      setVideoError(false);
      
      const response = await api.experiment.getCurrent();

      if (response.code === 'NOT_STARTED') {
        // Experiment not started, redirect to start
        router.push('/experiment/start');
        return;
      }

      if (response.code === 'COMPLETED') {
        // All videos completed
        setAllCompleted(true);
        setLoading(false);
        return;
      }

      setVideoData(response.data);
      
      // If participant already submitted response for this video, clear textarea
      if (response.data.progress.hasResponse) {
        setResponseText('');
      }

    } catch (err: any) {
      if (err.message === 'Authentication required') {
        router.push('/consent');
      } else if (err.message === 'Experiment not started') {
        router.push('/experiment/start');
      } else {
        setError(err.message || 'Failed to load video');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (submitting || submitAttempted.current) return;

    // Validate response
    if (!responseText.trim()) {
      setError('Please provide a response before continuing');
      return;
    }

    if (responseText.trim().length < 10) {
      setError('Please provide a more detailed response (at least 10 characters)');
      return;
    }

    submitAttempted.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const responseTime = Math.floor((Date.now() - startTime) / 1000);

      const submission: ResponseSubmission = {
        responseText: responseText.trim(),
        responseTime
      };

      const result = await api.experiment.submitResponse(submission);

      // Clear response text
      setResponseText('');
      submitAttempted.current = false;

      // Check if all completed
      if (result.data.allCompleted) {
        setAllCompleted(true);
      } else {
        // Load next video
        await loadCurrentVideo();
        setStartTime(Date.now());
      }

    } catch (err: any) {
      console.error('Submit response error:', err);
      
      if (err.message.includes('already submitted')) {
        // Response already exists, just move to next
        await loadCurrentVideo();
        setStartTime(Date.now());
      } else {
        setError(err.message || 'Failed to submit response. Please try again.');
      }
      
      submitAttempted.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleCompleteExperiment = () => {
    router.push('/experiment/complete');
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

  if (allCompleted) {
    return (
      <PageContainer
        title="Experiment Complete"
        description="Thank you for completing all videos"
      >
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                    <span className="text-4xl">✓</span>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    All Videos Completed!
                  </h2>
                  <p className="text-lg text-gray-700">
                    You have successfully completed all video scenarios.
                  </p>
                </div>

                <Alert variant="success" className="mb-6">
                  Your responses have been recorded. Click below to proceed to the next phase.
                </Alert>

                <Button onClick={handleCompleteExperiment} size="lg">
                  Continue to Next Phase
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (error && !videoData) {
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

  if (!videoData) {
    return null;
  }

  const wordCount = responseText.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <PageContainer
      title={`Video ${videoData.progress.current} of ${videoData.progress.total}`}
      description="Watch the video and provide your response"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Identity Notice */}
        <Alert variant={videoData.condition === 'anonymous' ? 'info' : 'success'}>
          <strong>Responding as: {videoData.displayName}</strong>
          <br />
          {videoData.notice}
        </Alert>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {videoData.progress.completed} / {videoData.progress.total} completed
            </span>
            <span className="text-sm font-medium text-primary-600">
              {Math.round((videoData.progress.completed / videoData.progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(videoData.progress.completed / videoData.progress.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Video Card */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {videoData.video.title}
            </h2>

            {videoData.video.description && (
              <p className="text-gray-700 mb-6">
                {videoData.video.description}
              </p>
            )}

            {/* Video Player */}
            <div className="relative bg-black rounded-lg overflow-hidden mb-6" style={{ paddingBottom: '56.25%' }}>
              {!videoError ? (
                <video
                  className="absolute top-0 left-0 w-full h-full"
                  controls
                  onError={handleVideoError}
                  key={videoData.video.id}
                >
                  <source src={videoData.video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white">
                  <div className="text-center p-6">
                    <p className="text-xl font-semibold mb-2">Video Unavailable</p>
                    <p className="text-sm mb-4">Unable to load video. Please contact the research team.</p>
                    <Button variant="outline" onClick={() => setVideoError(false)}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Response Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your Response
              </h3>
              <p className="text-gray-700">
                Please provide your genuine reaction or opinion about this video. 
                Write 2-4 sentences describing your thoughts.
              </p>
            </div>

            {/* Response Textarea */}
            <div className="mb-6">
              <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                Your Response <span className="text-red-500">*</span>
              </label>
              <textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                disabled={submitting}
                placeholder="Type your response here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={6}
                maxLength={5000}
              />
              <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
                <span>
                  {wordCount} {wordCount === 1 ? 'word' : 'words'} · Suggested: 2-4 sentences
                </span>
                <span>{responseText.length} / 5000 characters</span>
              </div>
            </div>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => router.push('/participant')}
                disabled={submitting}
              >
                Save and Exit
              </Button>

              <Button
                onClick={handleSubmitResponse}
                disabled={submitting || !responseText.trim() || responseText.trim().length < 10}
                size="lg"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Response
                    {videoData.progress.current < videoData.progress.total && ' & Continue'}
                  </>
                )}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Help */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Need Help?
            </h3>
            <p className="text-gray-700">
              If you experience technical issues or have questions, please contact the research team:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
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
