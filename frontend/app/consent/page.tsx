'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

/**
 * Consent Form Page
 * Phase 3: Functional consent form with validation
 * PLACEHOLDER NOTICE: Actual consent text requires researcher/ethics approval
 */

// Validation schema
const consentSchema = z.object({
  consentGiven: z.boolean().refine(val => val === true, {
    message: 'You must agree to participate'
  }),
  agreedToDataUse: z.boolean().refine(val => val === true, {
    message: 'You must agree to data use terms'
  }),
  agreedToWithdrawalTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to withdrawal terms'
  }),
  electronicSignature: z.string()
    .min(2, 'Signature must be at least 2 characters')
    .max(100, 'Signature must not exceed 100 characters')
});

type ConsentFormData = z.infer<typeof consentSchema>;

export default function ConsentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ConsentFormData>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      consentGiven: false,
      agreedToDataUse: false,
      agreedToWithdrawalTerms: false,
      electronicSignature: ''
    }
  });

  const allChecked = watch('consentGiven') && watch('agreedToDataUse') && watch('agreedToWithdrawalTerms');

  const onSubmit = async (data: ConsentFormData) => {
    console.log('Consent form submitted:', data);
    setIsSubmitting(true);
    setError(null);
    setDebugInfo('Submitting consent...');

    try {
      console.log('Sending consent to API...');
      setDebugInfo('Sending to backend API...');
      
      const response = await api.participant.submitConsent({
        consentGiven: data.consentGiven,
        agreedToDataUse: data.agreedToDataUse,
        agreedToWithdrawalTerms: data.agreedToWithdrawalTerms,
        electronicSignature: data.electronicSignature
      });
      console.log('Consent API response:', response);
      setDebugInfo('Consent accepted! Redirecting...');

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 500));

      // Proceed to registration
      console.log('Navigating to registration...');
      router.push('/register');
    } catch (err: any) {
      console.error('Consent submission error:', err);
      setError(err.message || 'Failed to submit consent. Please try again.');
      setDebugInfo('Error: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Informed Consent"
      description="Please review the following information carefully before proceeding"
    >
      <div className="max-w-4xl mx-auto">
        {/* Important Notice */}
        <Alert variant="warning" className="mb-6">
          <strong>IMPORTANT:</strong> The consent text below contains placeholders. Actual consent 
          wording must be approved by institutional ethics review board before study launch.
        </Alert>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <Card>
          <CardBody>
            {/* Consent Document */}
            <div className="prose prose-gray max-w-none mb-8">
              <h2 className="text-2xl font-bold mb-4">
                Research Study Consent Form
              </h2>
              
              <div className="bg-gray-50 border-l-4 border-primary-600 p-4 mb-6">
                <p className="text-sm font-semibold text-gray-900">
                  Study Title: An Experimental Investigation of Anonymity in Cyberbullying Perpetration 
                  and Its Relationship with Moral Disengagement, Empathy, and Pessimistic Thinking
                </p>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                1. Purpose of the Study
              </h3>
              <p className="text-gray-700">
                <em className="text-gray-500">[REQUIRES RESEARCHER/SUPERVISOR APPROVAL]</em>
                <br /><br />
                You are invited to participate in a research study investigating how anonymity influences 
                cyberbullying behavior and its relationship with psychological factors. This research is 
                being conducted at Shaheed Benazir Bhutto Women University, Peshawar.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                2. Study Procedures
              </h3>
              <p className="text-gray-700">
                <em className="text-gray-500">[REQUIRES RESEARCHER/SUPERVISOR APPROVAL]</em>
                <br /><br />
                If you agree to participate, you will:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Complete demographic information (2 minutes)</li>
                <li>Complete a video-based experimental task (10-15 minutes)</li>
                <li>Complete psychological questionnaires (20-25 minutes)</li>
                <li>Review debriefing information</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Total time: Approximately 30-40 minutes.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                3. Risks and Benefits
              </h3>
              <p className="text-gray-700">
                <em className="text-gray-500">[REQUIRES RESEARCHER/SUPERVISOR APPROVAL]</em>
                <br /><br />
                <strong>Risks:</strong> The risks associated with this study are minimal. You may experience 
                mild discomfort when viewing video content or answering questions about online behavior.
                <br /><br />
                <strong>Benefits:</strong> You may not receive direct benefits from participation. However, 
                your participation will contribute to understanding cyberbullying behavior and may inform 
                prevention strategies.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                4. Confidentiality
              </h3>
              <p className="text-gray-700">
                <em className="text-gray-500">[REQUIRES RESEARCHER/SUPERVISOR APPROVAL]</em>
                <br /><br />
                Your responses will be kept strictly confidential. Data will be:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Stored securely on encrypted servers</li>
                <li>Accessible only to the research team</li>
                <li>De-identified for analysis and publication</li>
                <li>Retained for 7 years as per institutional policy</li>
              </ul>
              <p className="text-gray-700 mt-3">
                No personally identifying information will be included in any reports or publications.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                5. Voluntary Participation and Withdrawal
              </h3>
              <p className="text-gray-700">
                Your participation is completely voluntary. You may:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Decline to participate without any consequence</li>
                <li>Withdraw from the study at any time</li>
                <li>Skip any questions you prefer not to answer</li>
                <li>Request that your data be removed (within reasonable timeframe)</li>
              </ul>
              <p className="text-gray-700 mt-3">
                There are no penalties for withdrawal.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                6. Contact Information
              </h3>
              <p className="text-gray-700">
                <em className="text-gray-500">[REQUIRES RESEARCHER/SUPERVISOR APPROVAL]</em>
                <br /><br />
                If you have questions about this study, please contact:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
                <p className="text-sm text-gray-600 italic">
                  Principal Investigator: [Name]<br />
                  Email: [Email]<br />
                  Phone: [Phone]<br />
                  Institution: Shaheed Benazir Bhutto Women University, Peshawar
                </p>
              </div>
            </div>

            {/* Consent Agreement Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Statement of Consent
              </h3>

              {/* Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <Checkbox
                    id="consentGiven"
                    {...register('consentGiven')}
                    className="mt-1"
                  />
                  <label htmlFor="consentGiven" className="ml-3 text-sm text-gray-700">
                    I have read and understood the information above. I have had the opportunity to ask 
                    questions and all my questions have been answered to my satisfaction. I voluntarily 
                    agree to participate in this research study.
                  </label>
                </div>
                {errors.consentGiven && (
                  <p className="text-sm text-red-600 ml-8">{errors.consentGiven.message}</p>
                )}

                <div className="flex items-start">
                  <Checkbox
                    id="agreedToDataUse"
                    {...register('agreedToDataUse')}
                    className="mt-1"
                  />
                  <label htmlFor="agreedToDataUse" className="ml-3 text-sm text-gray-700">
                    I agree that my de-identified data may be used for research purposes, including 
                    publication in academic journals and presentations at conferences.
                  </label>
                </div>
                {errors.agreedToDataUse && (
                  <p className="text-sm text-red-600 ml-8">{errors.agreedToDataUse.message}</p>
                )}

                <div className="flex items-start">
                  <Checkbox
                    id="agreedToWithdrawalTerms"
                    {...register('agreedToWithdrawalTerms')}
                    className="mt-1"
                  />
                  <label htmlFor="agreedToWithdrawalTerms" className="ml-3 text-sm text-gray-700">
                    I understand that I may withdraw from this study at any time without penalty, and 
                    that I may request removal of my data within a reasonable timeframe.
                  </label>
                </div>
                {errors.agreedToWithdrawalTerms && (
                  <p className="text-sm text-red-600 ml-8">{errors.agreedToWithdrawalTerms.message}</p>
                )}
              </div>

              {/* Electronic Signature */}
              <div>
                <label htmlFor="electronicSignature" className="block text-sm font-medium text-gray-700 mb-2">
                  Electronic Signature <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Please type your full name to serve as your electronic signature.
                </p>
                <Input
                  id="electronicSignature"
                  type="text"
                  {...register('electronicSignature')}
                  disabled={!allChecked}
                  placeholder="Type your full name"
                  error={errors.electronicSignature?.message}
                  onKeyDown={(e) => {
                    // Prevent Enter key from submitting form
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Consent Version:</strong> 1.0 | <strong>Date:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/study')}
                  disabled={isSubmitting}
                >
                  Back to Study Information
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !allChecked}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'I Agree - Proceed to Registration'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
