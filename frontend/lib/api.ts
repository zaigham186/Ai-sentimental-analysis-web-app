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
      condition: string;
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
  },

  // Admin endpoints (Phase 8)
  admin: {
    // Login
    login: (data: {
      username: string;
      password: string;
    }) => fetchAPI('/api/admin/login', { method: 'POST', body: data }),

    // Logout
    logout: () => fetchAPI('/api/admin/logout', { method: 'POST' }),

    // Get current admin
    me: () => fetchAPI('/api/admin/me'),

    // Get dashboard statistics
    dashboard: () => fetchAPI('/api/admin/dashboard'),

    // Video management (Phase 9)
    videos: {
      // Get all videos with optional filters
      getAll: (params?: {
        status?: string;
        active?: boolean;
        search?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.active !== undefined) queryParams.append('active', params.active.toString());
        if (params?.search) queryParams.append('search', params.search);
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/videos${query ? `?${query}` : ''}`);
      },

      // Get single video
      getById: (id: string) => fetchAPI(`/api/admin/videos/${id}`),

      // Create video
      create: (data: {
        title: string;
        topic: string;
        description: string;
        videoUrl: string;
        duration: number;
        order: number;
        active?: boolean;
        version?: string;
        metadata?: any;
      }) => fetchAPI('/api/admin/videos', { method: 'POST', body: data }),

      // Update video
      update: (id: string, data: {
        title?: string;
        topic?: string;
        description?: string;
        videoUrl?: string;
        duration?: number;
        order?: number;
        active?: boolean;
        version?: string;
        metadata?: any;
      }) => fetchAPI(`/api/admin/videos/${id}`, { method: 'PUT', body: data }),

      // Delete video
      delete: (id: string) => fetchAPI(`/api/admin/videos/${id}`, { method: 'DELETE' }),

      // Approve video
      approve: (id: string, notes?: string) => 
        fetchAPI(`/api/admin/videos/${id}/approve`, { 
          method: 'POST', 
          body: notes ? { notes } : {} 
        }),

      // Reject video
      reject: (id: string, notes: string) =>
        fetchAPI(`/api/admin/videos/${id}/reject`, { 
          method: 'POST', 
          body: { notes } 
        }),

      // Validate stimulus set
      validateSet: () => fetchAPI('/api/admin/videos/validate-set'),

      // Get statistics
      stats: () => fetchAPI('/api/admin/videos/stats')
    },

    // Response coding (Phase 10 + Phase 10 Enhancement: AI-Assisted)
    coding: {
      // Get all responses with coding status
      getResponses: (params?: {
        coded?: boolean;
        condition?: string;
        video?: string;
        search?: string;
        page?: number;
        limit?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.coded !== undefined) queryParams.append('coded', params.coded.toString());
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.video) queryParams.append('video', params.video);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/coding/responses${query ? `?${query}` : ''}`);
      },

      // Get single response with coding
      getResponseById: (id: string) => fetchAPI(`/api/admin/coding/responses/${id}`),

      // Create coding
      create: (data: {
        responseId: string;
        sentiment?: string;
        aggression?: {
          level?: number;
          category?: string;
        };
        cyberbullying?: {
          present?: boolean;
          type?: string;
          severity?: number;
        };
        notes?: string;
        confidence?: string;
        codingVersion?: string;
      }) => fetchAPI('/api/admin/coding', { method: 'POST', body: data }),

      // Update coding
      update: (id: string, data: {
        sentiment?: string;
        aggression?: {
          level?: number;
          category?: string;
        };
        cyberbullying?: {
          present?: boolean;
          type?: string;
          severity?: number;
        };
        notes?: string;
        confidence?: string;
      }) => fetchAPI(`/api/admin/coding/${id}`, { method: 'PUT', body: data }),

      // Delete coding
      delete: (id: string) => fetchAPI(`/api/admin/coding/${id}`, { method: 'DELETE' }),

      // Get statistics
      stats: () => fetchAPI('/api/admin/coding/stats'),

      // Get configuration
      config: () => fetchAPI('/api/admin/coding/config'),

      // Phase 10 Enhancement: AI-Assisted Coding
      
      // Trigger AI analysis for a response
      analyzeWithAI: (id: string) => 
        fetchAPI(`/api/admin/coding/${id}/analyze`, { method: 'POST' }),

      // Human review of AI suggestion
      reviewAI: (id: string, data: {
        action: 'accept' | 'modify' | 'reject';
        finalCoding?: {
          sentiment: string;
          aggression: {
            level: number;
            category: string;
          };
          cyberbullying: {
            present: boolean;
            type: string;
            severity: number;
          };
        };
        notes?: string;
      }) => fetchAPI(`/api/admin/coding/${id}/review`, { method: 'POST', body: data }),

      // Get responses pending AI review
      getPendingReview: (params?: {
        page?: number;
        limit?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/coding/pending-review${query ? `?${query}` : ''}`);
      },

      // Bulk AI analysis
      bulkAnalyze: (data: {
        responseIds?: string[];
        condition?: string;
        video?: string;
      }) => fetchAPI('/api/admin/coding/bulk-analyze', { method: 'POST', body: data })
    },

    // Analytics (Phase 11)
    analytics: {
      // Get dashboard analytics
      dashboard: () => fetchAPI('/api/admin/analytics/dashboard'),

      // Get condition comparison
      conditionComparison: () => fetchAPI('/api/admin/analytics/condition-comparison'),

      // Get video response analytics
      videoResponses: () => fetchAPI('/api/admin/analytics/video-responses'),

      // Get coding analytics
      coding: () => fetchAPI('/api/admin/analytics/coding'),

      // Get aggression analytics
      aggression: () => fetchAPI('/api/admin/analytics/aggression')
    },

    // Export (Phase 11)
    export: {
      // Export participants
      participants: (params?: {
        format?: 'csv' | 'xlsx';
        identityLinked?: boolean;
        condition?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.format) queryParams.append('format', params.format);
        if (params?.identityLinked !== undefined) queryParams.append('identityLinked', params.identityLinked.toString());
        if (params?.condition) queryParams.append('condition', params.condition);
        const query = queryParams.toString();
        return `${API_URL}/api/admin/export/participants${query ? `?${query}` : ''}`;
      },

      // Export responses
      responses: (params?: {
        format?: 'csv' | 'xlsx';
        identityLinked?: boolean;
        condition?: string;
        video?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.format) queryParams.append('format', params.format);
        if (params?.identityLinked !== undefined) queryParams.append('identityLinked', params.identityLinked.toString());
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.video) queryParams.append('video', params.video);
        const query = queryParams.toString();
        return `${API_URL}/api/admin/export/responses${query ? `?${query}` : ''}`;
      },

      // Export codings
      codings: (params?: {
        format?: 'csv' | 'xlsx';
        condition?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.format) queryParams.append('format', params.format);
        if (params?.condition) queryParams.append('condition', params.condition);
        const query = queryParams.toString();
        return `${API_URL}/api/admin/export/codings${query ? `?${query}` : ''}`;
      },

      // Export research dataset
      researchDataset: (params?: {
        format?: 'csv' | 'xlsx';
        identityLinked?: boolean;
        condition?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.format) queryParams.append('format', params.format);
        if (params?.identityLinked !== undefined) queryParams.append('identityLinked', params.identityLinked.toString());
        if (params?.condition) queryParams.append('condition', params.condition);
        const query = queryParams.toString();
        return `${API_URL}/api/admin/export/research-dataset${query ? `?${query}` : ''}`;
      },

      // Get data quality check
      dataQuality: () => fetchAPI('/api/admin/export/data-quality')
    },

    // Participant Management (Phase 12)
    participants: {
      // Get all participants with filters
      getAll: (params?: {
        condition?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/participants${query ? `?${query}` : ''}`);
      },

      // Get single participant
      getById: (id: string) => fetchAPI(`/api/admin/participants/${id}`),

      // Get statistics
      stats: () => fetchAPI('/api/admin/participants/stats')
    },

    // Response Management (Phase 12)
    responses: {
      // Get all responses with filters
      getAll: (params?: {
        condition?: string;
        video?: string;
        coded?: string;
        search?: string;
        page?: number;
        limit?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.video) queryParams.append('video', params.video);
        if (params?.coded) queryParams.append('coded', params.coded);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/responses${query ? `?${query}` : ''}`);
      },

      // Get single response
      getById: (id: string) => fetchAPI(`/api/admin/responses/${id}`),

      // Get statistics
      stats: () => fetchAPI('/api/admin/responses/stats')
    }
  }

  // Future endpoints:
  // questionnaires: {
  //   getAll: () => fetchAPI('/api/questionnaires'),
  //   submitResponse: (data: any) => fetchAPI('/api/questionnaires/response', { method: 'POST', body: data }),
  // },
};

export default api;
