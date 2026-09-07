/**
 * API Client
 * Centralized HTTP client for backend communication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface RequestOptions extends RequestInit {
  body?: any;
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session management
  };

  // Stringify body if it's an object
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Parse JSON response
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

/**
 * API Methods
 */

export const api = {
  // Health check
  health: () => fetchAPI('/api/health'),

  // Participant endpoints
  participant: {
    // Submit consent
    submitConsent: (data: {
      consentGiven: boolean;
      agreedToDataUse: boolean;
      agreedToWithdrawalTerms: boolean;
      electronicSignature: string;
    }) => fetchAPI('/api/participants/consent', { method: 'POST', body: data }),

    // Register participant
    register: (data: {
      name: string;
      username: string;
      age: number;
      gender: string;
      university: string;
      department: string;
    }) => fetchAPI('/api/participants/register', { method: 'POST', body: data }),

    // Get current participant profile
    getProfile: () => fetchAPI('/api/participants/me'),

    // Check session status
    checkSession: () => fetchAPI('/api/participants/session'),

    // Logout
    logout: () => fetchAPI('/api/participants/logout', { method: 'POST' })
  },

  // Condition endpoints (Phase 4)
  condition: {
    // Get condition info
    getInfo: () => fetchAPI('/api/condition'),

    // Verify condition assignment
    verify: () => fetchAPI('/api/condition/verify')
  },

  // Experiment endpoints (Phase 5)
  experiment: {
    // Start experiment
    start: () => fetchAPI('/api/experiment/start', { method: 'POST' }),

    // Get current video
    getCurrent: () => fetchAPI('/api/experiment/current'),

    // Submit video response
    submitResponse: (data: {
      responseText: string;
      responseTime?: number;
    }) => fetchAPI('/api/experiment/respond', { method: 'POST', body: data }),

    // Get progress
    getProgress: () => fetchAPI('/api/experiment/progress'),

    // Complete experiment
    complete: () => fetchAPI('/api/experiment/complete', { method: 'POST' })
  }

  // Future endpoints:
  // questionnaires: {
  //   getAll: () => fetchAPI('/api/questionnaires'),
  //   submitResponse: (data: any) => fetchAPI('/api/questionnaires/response', { method: 'POST', body: data }),
  // },
};

export default api;
