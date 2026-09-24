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
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser: use relative URL '' so requests go to the same origin (Vercel or Next.js dev server).
    // Next.js rewrites proxy /api/* to Railway backend.
    // This turns all cookies into first-party cookies and eliminates cross-origin blocking!
    return '';
  }
  return API_URL.replace(/\/$/, '');
};

/**
 * Cross-domain authentication storage helpers
 * Stores session tokens and pending consent in localStorage & sessionStorage
 * Guarantees persistence even when browsers block third-party cookies across domains
 */
export const authStorage = {
  getParticipantToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('participantSession') || sessionStorage.getItem('participantSession');
    } catch {
      return null;
    }
  },
  setParticipantToken: (token: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('participantSession', token);
      sessionStorage.setItem('participantSession', token);
    } catch {}
  },
  clearParticipantToken: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('participantSession');
      sessionStorage.removeItem('participantSession');
      localStorage.removeItem('pendingConsent');
      sessionStorage.removeItem('pendingConsent');
      localStorage.removeItem('participantData');
      sessionStorage.removeItem('participantData');
    } catch {}
  },
  getCachedParticipant: (): any | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('participantData') || sessionStorage.getItem('participantData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setCachedParticipant: (data: any) => {
    if (typeof window === 'undefined') return;
    try {
      const val = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem('participantData', val);
      sessionStorage.setItem('participantData', val);
    } catch {}
  },
  clearCachedParticipant: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('participantData');
      sessionStorage.removeItem('participantData');
    } catch {}
  },
  getPendingConsent: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('pendingConsent') || sessionStorage.getItem('pendingConsent');
    } catch {
      return null;
    }
  },
  setPendingConsent: (data: any) => {
    if (typeof window === 'undefined') return;
    try {
      const val = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem('pendingConsent', val);
      sessionStorage.setItem('pendingConsent', val);
    } catch {}
  },
  getAdminToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('adminSession') || sessionStorage.getItem('adminSession');
    } catch {
      return null;
    }
  },
  setAdminToken: (token: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('adminSession', token);
      sessionStorage.setItem('adminSession', token);
    } catch {}
  },
  clearAdminToken: () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('adminSession');
      sessionStorage.removeItem('adminSession');
    } catch {}
  }
};

/**
 * Base fetch wrapper with error handling
 */
async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Cross-domain token & consent headers injection
  if (typeof window !== 'undefined') {
    if (endpoint.startsWith('/api/admin')) {
      const adminToken = authStorage.getAdminToken();
      if (adminToken && !requestHeaders['Authorization']) {
        requestHeaders['Authorization'] = `Bearer ${adminToken}`;
        requestHeaders['x-admin-session'] = adminToken;
      }
    } else {
      const participantToken = authStorage.getParticipantToken();
      if (participantToken && !requestHeaders['Authorization']) {
        requestHeaders['Authorization'] = `Bearer ${participantToken}`;
        requestHeaders['x-participant-session'] = participantToken;
      }
      const pendingConsent = authStorage.getPendingConsent();
      if (pendingConsent && !requestHeaders['x-pending-consent']) {
        requestHeaders['x-pending-consent'] = pendingConsent;
      }
    }
  }

  const config: RequestInit = {
    ...options,
    headers: requestHeaders,
    credentials: 'include', // Include cookies for session management
  };

  // Stringify body if it's an object
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Parse response safely
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    // Handle error responses
    if (!response.ok) {
      const error: any = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
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
    submitConsent: async (data: {
      consentGiven: boolean;
      agreedToDataUse: boolean;
      agreedToWithdrawalTerms: boolean;
      electronicSignature: string;
    }) => {
      authStorage.setPendingConsent(data);
      const res = await fetchAPI('/api/participants/consent', { method: 'POST', body: data });
      if (res.data?.consentData) {
        authStorage.setPendingConsent(res.data.consentData);
      }
      return res;
    },

    // Register participant
    register: async (data: {
      name: string;
      username: string;
      age: number;
      gender: string;
      university: string;
      department: string;
      condition: string;
    }) => {
      let consentData = null;
      const storedConsent = authStorage.getPendingConsent();
      if (storedConsent) {
        try {
          consentData = JSON.parse(storedConsent);
        } catch {}
      }
      const res = await fetchAPI('/api/participants/register', {
        method: 'POST',
        body: { ...data, consentData }
      });
      if (res.data?.sessionToken) {
        authStorage.setParticipantToken(res.data.sessionToken);
      }
      return res;
    },

    // Get current participant profile
    getProfile: () => fetchAPI('/api/participants/me'),

    // Check session status
    checkSession: () => fetchAPI('/api/participants/session'),

    // Logout
    logout: async () => {
      try {
        return await fetchAPI('/api/participants/logout', { method: 'POST' });
      } finally {
        authStorage.clearParticipantToken();
      }
    }
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
    login: async (data: {
      username: string;
      password: string;
    }) => {
      const res = await fetchAPI('/api/admin/login', { method: 'POST', body: data });
      if (res.data?.sessionToken || res.data?.id) {
        authStorage.setAdminToken(res.data.sessionToken || res.data.id);
      }
      return res;
    },

    // Logout
    logout: async () => {
      try {
        return await fetchAPI('/api/admin/logout', { method: 'POST' });
      } finally {
        authStorage.clearAdminToken();
      }
    },

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
        coded?: boolean | string;
        condition?: string;
        video?: string;
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
        participantRangeStart?: number;
        participantRangeEnd?: number;
        participantPageSize?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.coded !== undefined) queryParams.append('coded', params.coded.toString());
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.video) queryParams.append('video', params.video);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params?.participantRangeStart) queryParams.append('participantRangeStart', params.participantRangeStart.toString());
        if (params?.participantRangeEnd) queryParams.append('participantRangeEnd', params.participantRangeEnd.toString());
        if (params?.participantPageSize) queryParams.append('participantPageSize', params.participantPageSize.toString());
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

      // Phase 6: Research Validation & Calibration Status
      validationStatus: () => fetchAPI('/api/admin/coding/validation-status'),

      // Phase 10 Enhancement: AI-Assisted Coding

      // Trigger AI analysis for a response
      analyzeWithAI: (id: string, options?: { force?: boolean }) =>
        fetchAPI(`/api/admin/coding/${id}/analyze${options?.force ? '?force=true' : ''}`, { method: 'POST' }),

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

    // Phase 7: Complete Research Analytics & Reporting
    researchAnalytics: {
      overview: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/overview${query ? `?${query}` : ''}`);
      },
      sentiment: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/sentiment${query ? `?${query}` : ''}`);
      },
      toxicity: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/toxicity${query ? `?${query}` : ''}`);
      },
      aggression: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/aggression${query ? `?${query}` : ''}`);
      },
      cyberbullying: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/cyberbullying${query ? `?${query}` : ''}`);
      },
      conditionComparison: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/condition-comparison${query ? `?${query}` : ''}`);
      },
      videoComparison: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/video-comparison${query ? `?${query}` : ''}`);
      },
      aiHumanAgreement: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/ai-human${query ? `?${query}` : ''}`);
      },
      responses: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/responses${query ? `?${query}` : ''}`);
      },
      validation: () => fetchAPI('/api/admin/research-analytics/validation'),
      supervisorReport: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return fetchAPI(`/api/admin/research-analytics/report/summary${query ? `?${query}` : ''}`);
      },
      exportCSVUrl: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return `${API_URL}/api/admin/research-analytics/export/csv${query ? `?${query}` : ''}`;
      },
      exportJSONUrl: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return `${API_URL}/api/admin/research-analytics/export/json${query ? `?${query}` : ''}`;
      },
      exportXLSXUrl: (params?: Record<string, any>) => {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        return `${API_URL}/api/admin/research-analytics/export/xlsx${query ? `?${query}` : ''}`;
      }
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
        coded?: string | boolean;
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
        participantRangeStart?: number;
        participantRangeEnd?: number;
        participantPageSize?: number;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.condition) queryParams.append('condition', params.condition);
        if (params?.video) queryParams.append('video', params.video);
        if (params?.coded !== undefined) queryParams.append('coded', params.coded.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params?.participantRangeStart) queryParams.append('participantRangeStart', params.participantRangeStart.toString());
        if (params?.participantRangeEnd) queryParams.append('participantRangeEnd', params.participantRangeEnd.toString());
        if (params?.participantPageSize) queryParams.append('participantPageSize', params.participantPageSize.toString());
        const query = queryParams.toString();
        return fetchAPI(`/api/admin/responses${query ? `?${query}` : ''}`);
      },

      // Get single response
      getById: (id: string) => fetchAPI(`/api/admin/responses/${id}`),

      // Get statistics
      stats: () => fetchAPI('/api/admin/responses/stats')
    }
  },

  // Public responses endpoint (Requirement 5)
  responses: {
    getAll: (params?: {
      condition?: string;
      video?: string;
      coded?: string | boolean;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.condition) queryParams.append('condition', params.condition);
      if (params?.video) queryParams.append('video', params.video);
      if (params?.coded !== undefined) queryParams.append('coded', params.coded.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      const query = queryParams.toString();
      return fetchAPI(`/api/responses${query ? `?${query}` : ''}`);
    },
    getById: (id: string) => fetchAPI(`/api/responses/${id}`),
    stats: () => fetchAPI('/api/responses/stats')
  }

  // Future endpoints:
  // questionnaires: {
  //   getAll: () => fetchAPI('/api/questionnaires'),
  //   submitResponse: (data: any) => fetchAPI('/api/questionnaires/response', { method: 'POST', body: data }),
  // },
};

export default api;
