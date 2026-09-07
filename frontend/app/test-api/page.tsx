'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

/**
 * API Test Page
 * Simple page to test backend connectivity
 */

export default function TestAPIPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    setResult('Testing health endpoint...');
    
    try {
      const response = await fetch('http://localhost:5000/api/health', {
        credentials: 'include'
      });
      const data = await response.json();
      setResult('✅ SUCCESS!\n\n' + JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult('❌ ERROR!\n\n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testConsent = async () => {
    setLoading(true);
    setResult('Testing consent endpoint...');
    
    try {
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
      const data = await response.json();
      setResult('✅ SUCCESS!\n\n' + JSON.stringify(data, null, 2));
    } catch (error: any) {
      setResult('❌ ERROR!\n\n' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkEnv = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET (using default)';
    setResult(`Environment Check:\n\nNEXT_PUBLIC_API_URL = ${apiUrl}\n\nDefault: http://localhost:5000`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔧 API Connection Test
        </h1>

        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Test Backend Connection</h2>
            
            <div className="space-y-3 mb-6">
              <Button 
                onClick={checkEnv} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                1. Check Environment Variables
              </Button>
              
              <Button 
                onClick={testHealth} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                2. Test Health Endpoint (GET /api/health)
              </Button>
              
              <Button 
                onClick={testConsent} 
                disabled={loading}
                className="w-full"
              >
                3. Test Consent Endpoint (POST /api/participants/consent)
              </Button>
            </div>

            {result && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {result}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-lg font-semibold mb-3">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click button 1 to verify .env.local is loaded</li>
              <li>Click button 2 to test if backend is reachable</li>
              <li>Click button 3 to test actual consent submission</li>
              <li>If all work, go back to <a href="/consent" className="text-blue-600 underline">/consent page</a></li>
            </ol>
          </CardBody>
        </Card>

        <div className="mt-6 text-center">
          <a href="/consent" className="text-blue-600 hover:underline">
            ← Back to Consent Page
          </a>
        </div>
      </div>
    </div>
  );
}
