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
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';

/**
 * Registration Page
 * Phase 3: Participant registration with validation
 * CRITICAL: NO visible Participant ID field - all IDs are internal
 */

// Validation schema
const registrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')
    .toLowerCase(),
  
  age: z.coerce.number()
    .int('Age must be a whole number')
    .min(18, 'You must be at least 18 years old')
    .max(100, 'Please enter a valid age'),
  
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    errorMap: () => ({ message: 'Please select your gender' })
  }),
  
  university: z.enum(['SBBWU', 'University of Peshawar'], {
    errorMap: () => ({ message: 'Please select your university' })
  }),
  
  department: z.string()
    .min(2, 'Department must be at least 2 characters')
    .max(100, 'Department must not exceed 100 characters')
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema)
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.participant.register({
        name: data.name,
        username: data.username.toLowerCase(),
        age: data.age,
        gender: data.gender,
        university: data.university,
        department: data.department
      });

      // Registration successful - redirect to participant dashboard
      router.push('/participant');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Participant Registration"
      description="Please provide your information to continue"
    >
      <div className="max-w-2xl mx-auto">
        {/* Instructions */}
        <Alert variant="info" className="mb-6">
          <strong>Registration:</strong> Please complete the form below. All fields are required. 
          Your information will be kept confidential and used only for research purposes.
        </Alert>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="Enter your full name"
                  error={errors.name?.message}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your legal name as it appears on official documents
                </p>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <Input
                  id="username"
                  type="text"
                  {...register('username')}
                  placeholder="choosea username"
                  error={errors.username?.message}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lowercase letters, numbers, hyphens, and underscores only. This will be used for login.
                </p>
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <Input
                  id="age"
                  type="number"
                  {...register('age')}
                  placeholder="18"
                  min="18"
                  max="100"
                  error={errors.age?.message}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You must be 18 years or older to participate
                </p>
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <Select
                  id="gender"
                  {...register('gender')}
                  error={errors.gender?.message}
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Select>
              </div>

              {/* University */}
              <div>
                <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
                  University <span className="text-red-500">*</span>
                </label>
                <Select
                  id="university"
                  {...register('university')}
                  error={errors.university?.message}
                >
                  <option value="">Select your university</option>
                  <option value="SBBWU">Shaheed Benazir Bhutto Women University (SBBWU)</option>
                  <option value="University of Peshawar">University of Peshawar</option>
                </Select>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department/Program <span className="text-red-500">*</span>
                </label>
                <Input
                  id="department"
                  type="text"
                  {...register('department')}
                  placeholder="e.g., Psychology, Computer Science"
                  error={errors.department?.message}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your current field of study
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Privacy & Data Use
                </h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• Your information will be kept strictly confidential</li>
                  <li>• Data will be de-identified for analysis and publication</li>
                  <li>• No personally identifying information will be shared</li>
                  <li>• You may withdraw from the study at any time</li>
                </ul>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/consent')}
                  disabled={isSubmitting}
                >
                  Back to Consent
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Registering...' : 'Complete Registration'}
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-center text-gray-500">
                By completing registration, you confirm that you have read and agreed to the consent form.
              </p>
            </form>
          </CardBody>
        </Card>

        {/* Important Note */}
        <Alert variant="info" className="mt-6">
          <strong>Note:</strong> You will receive a secure session after registration. 
          Please do not share your login credentials with anyone.
        </Alert>
      </div>
    </PageContainer>
  );
}
