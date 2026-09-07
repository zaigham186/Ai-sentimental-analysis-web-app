'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Participant } from '@/types';

/**
 * Participant Dashboard Page
 * Phase 3: Shows participant profile and study progress
 * Requires authentication
 */

export default function ParticipantPage() {
  const router = useRouter();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadParticipant();
  }, []);

  const loadParticipant = async () => {
    try {
      const response = await api.participant.getProfile();
      setParticipant(response.data);
    } catch (err: any) {
      if (err.message === 'Authentication required') {
        // Not authenticated - redirect to consent
        router.push('/consent');
      } else {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.participant.logout();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
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

  if (error) {
    return (
      <PageContainer title="Error" description="">
        <Alert variant="error">{error}</Alert>
      </PageContainer>
    );
  }

  if (!participant) {
    return null;
  }

  return (
    <PageContainer
      title="Participant Dashboard"
      description="Welcome to your study dashboard"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Message */}
        <Alert variant="success">
          <strong>Registration Complete!</strong> Welcome to the study, {participant.name}.
        </Alert>

        {/* Profile Card */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Your Profile
              </h2>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                <p className="text-lg text-gray-900">{participant.name}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Username</h3>
                <p className="text-lg text-gray-900">{participant.username}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Age</h3>
                <p className="text-lg text-gray-900">{participant.age} years</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Gender</h3>
                <p className="text-lg text-gray-900 capitalize">
                  {participant.gender.replace('_', ' ')}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">University</h3>
                <p className="text-lg text-gray-900">{participant.university}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Department</h3>
                <p className="text-lg text-gray-900">{participant.department}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {participant.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Consent Given</h3>
                <p className="text-lg text-gray-900">
                  {participant.consentGiven ? '✓ Yes' : '✗ No'}
                </p>
              </div>
            </div>

            {participant.consentAt && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Consent provided on: {new Date(participant.consentAt).toLocaleString()}
                  {participant.consentVersion && ` (Version ${participant.consentVersion})`}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Study Progress */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Study Progress
            </h2>

            <Alert variant="info" className="mb-6">
              <strong>Phase 5 Complete:</strong> The video response experiment is now available. 
              Click "Start Experiment" below to begin the experimental task.
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Consent & Registration</h3>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Condition Assignment</h3>
                  <p className="text-sm text-gray-600">
                    Assigned - <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => router.push('/condition')}
                    >
                      View My Condition
                    </Button>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-400 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Video Response Experiment</h3>
                  <p className="text-sm text-gray-600">Ready to start</p>
                </div>
                <Button 
                  onClick={() => router.push('/experiment/start')}
                  size="sm"
                >
                  Start Experiment
                </Button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Questionnaires</h3>
                  <p className="text-sm text-gray-600">Complete experiment first</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Help */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Need Help?
            </h2>
            <p className="text-gray-700 mb-4">
              If you have questions or need assistance, please contact the research team:
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
