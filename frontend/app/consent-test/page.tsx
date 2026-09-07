'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/**
 * Simplified Consent Test Page
 * Tests basic consent submission without all the form complexity
 */

export default function ConsentTestPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log('=== CONSENT TEST STARTED ===');
    setLoading(true);
    setStatus('Submitting...');

    try {
      console.log('Step 1: Making fetch request...');
      console.log('URL:', 'http://localhost:5000/api/participants/consent');
      
      const response = await fetch('http://localhost:5000/api/participants/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          consentGiven: true,
          agreedToDataUse: true,
          agreedToWithdrawalTerms: true,
          electronicSignature: 'Test User'
        })
      });

      console.log('Step 2: Response received');
      console.log('Status:', response.status);
      console.log('OK:', response.ok);

      const data = await response.json();
      console.log('Step 3: Data parsed:', data);

      if (response.ok) {
        setStatus('✅ SUCCESS! Redirecting...');
        console.log('Step 4: Redirecting to /register');
        
        setTimeout(() => {
          router.push('/register');
        }, 1000);
      } else {
        setStatus('❌ API Error: ' + data.message);
        console.error('API Error:', data);
      }

    } catch (error: any) {
      console.error('Step X: ERROR!', error);
      setStatus('❌ Network Error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🧪 Consent Test Page</h1>
          
          <p className="mb-6 text-gray-700">
            This is a simplified version to test consent submission without form complexity.
          </p>

          {status && (
            <Alert variant={status.includes('✅') ? 'success' : 'error'} className="mb-6">
              {status}
            </Alert>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full mb-4"
            size="lg"
          >
            {loading ? 'Submitting...' : 'Test Consent Submission'}
          </Button>

          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
            <div className="font-bold mb-2">Instructions:</div>
            <div>1. Open Console (F12)</div>
            <div>2. Click the button above</div>
            <div>3. Watch console for detailed logs</div>
            <div>4. Should redirect to /register if successful</div>
          </div>

          <div className="mt-6 text-center">
            <a href="/consent" className="text-blue-600 hover:underline">
              ← Back to Full Consent Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
