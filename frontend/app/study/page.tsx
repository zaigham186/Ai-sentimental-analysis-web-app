import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/**
 * Study Information Page
 * Provides detailed information about the research study
 * Phase 3: Updated with approved study information structure
 */

export default function StudyPage() {
  return (
    <PageContainer
      title="Study Information"
      description="Learn about our research on anonymity in cyberbullying"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Overview */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Research Overview
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                This study investigates how anonymity influences cyberbullying behavior and examines 
                its relationship with psychological factors including moral disengagement, empathy, 
                and pessimistic thinking.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Study Title:</strong> An Experimental Investigation of Anonymity in Cyberbullying 
                  Perpetration and Its Relationship with Moral Disengagement, Empathy, and Pessimistic Thinking
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Institution:</strong> Shaheed Benazir Bhutto Women University (SBBWU), Peshawar
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Recruitment Sites:</strong> SBBWU and University of Peshawar
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Principal Investigator:</strong> <span className="text-gray-500 italic">[REQUIRES RESEARCHER APPROVAL]</span>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Ethics Approval Number:</strong> <span className="text-gray-500 italic">[REQUIRES RESEARCHER APPROVAL]</span>
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Study Purpose */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Study Purpose
            </h2>
            <p className="text-gray-700">
              The purpose of this research is to understand how the level of anonymity (anonymous vs. identifiable) 
              affects individuals' propensity to engage in cyberbullying behavior. We also aim to explore how 
              psychological factors such as moral disengagement, empathy, and pessimistic thinking relate to 
              cyberbullying perpetration under different anonymity conditions.
            </p>
          </CardBody>
        </Card>

        {/* What to Expect */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              What to Expect
            </h2>
            <p className="text-gray-700 mb-6">
              <strong>Total Time:</strong> Approximately 30-40 minutes
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Informed Consent</h3>
                  <p className="text-gray-700">
                    Read and provide consent to participate in the study (5 minutes).
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Registration</h3>
                  <p className="text-gray-700">
                    Provide basic demographic information (2 minutes).
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Experimental Task</h3>
                  <p className="text-gray-700">
                    Complete a brief video-based task (10-15 minutes).
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Questionnaires</h3>
                  <p className="text-gray-700">
                    Complete validated psychological questionnaires (20-25 minutes).
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Debriefing</h3>
                  <p className="text-gray-700">
                    Review information about the study purpose and available resources.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Eligibility Criteria
            </h2>
            <p className="text-gray-700 mb-4">To participate, you must:</p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">
                  Be a student at SBBWU or University of Peshawar
                </span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">
                  Be 18 years of age or older
                </span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">
                  Be able to understand and provide informed consent
                </span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">
                  Have access to a computer or mobile device with internet connection
                </span>
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Rights and Confidentiality */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Rights and Confidentiality
            </h2>
            <Alert variant="info" className="mb-4">
              Participation is completely voluntary. You may withdraw at any time without penalty or loss of benefits.
            </Alert>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your responses are completely confidential and anonymous
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Data is stored securely and used only for research purposes
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No personally identifying information will be shared or published
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                You may contact the research team at any time with questions
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Contact */}
        <Card>
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Contact Information
            </h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this research study, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 italic">
                [REQUIRES RESEARCHER APPROVAL - Principal Investigator name, email, and phone number]
              </p>
            </div>
          </CardBody>
        </Card>

        {/* CTA */}
        <div className="text-center py-6">
          <Button asChild size="lg">
            <Link href="/consent">Proceed to Consent Form</Link>
          </Button>
          <p className="text-sm text-gray-600 mt-4">
            By proceeding, you will review the full consent form
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
