/**
 * Type Definitions
 * Phase 3: Participant types for consent and registration
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Error response
 */
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

/**
 * Health check response
 */
export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  database: string;
}

/**
 * Participant
 */
export interface Participant {
  username: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  university: 'SBBWU' | 'University of Peshawar';
  department: string;
  status: 'active' | 'completed' | 'incomplete' | 'withdrawn';
  consentGiven: boolean;
  consentAt?: string;
  consentVersion?: string;
  createdAt?: string;
}

/**
 * Consent data
 */
export interface ConsentData {
  consentGiven: boolean;
  agreedToDataUse: boolean;
  agreedToWithdrawalTerms: boolean;
  electronicSignature: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  name: string;
  username: string;
  age: number;
  gender: string;
  university: string;
  department: string;
}

/**
 * Session status
 */
export interface SessionStatus {
  authenticated: boolean;
  username?: string;
  status?: string;
  consentGiven?: boolean;
}

/**
 * Condition Information (Phase 4)
 */
export interface ConditionInfo {
  displayName: string;
  condition: 'anonymous' | 'identifiable';
  notice: string;
  assignedAt: string;
  assignmentVersion: string;
}

/**
 * Video (Phase 5)
 */
export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  order: number;
}

/**
 * Video Progress (Phase 5)
 */
export interface VideoProgress {
  current: number;
  total: number;
  completed: number;
  hasResponse: boolean;
}

/**
 * Current Video Data (Phase 5)
 */
export interface CurrentVideoData {
  video: Video;
  progress: VideoProgress;
  displayName: string;
  condition: 'anonymous' | 'identifiable';
  notice: string;
}

/**
 * Experiment Progress (Phase 5)
 */
export interface ExperimentProgress {
  experimentStarted: boolean;
  startedAt?: string;
  completed: number;
  total: number;
  percentage: number;
  allCompleted: boolean;
  currentVideo?: {
    id: string;
    title: string;
    order: number;
  };
  condition: 'anonymous' | 'identifiable';
  displayName: string;
}

/**
 * Response Submission Data (Phase 5)
 */
export interface ResponseSubmission {
  responseText: string;
  responseTime?: number;
}

/**
 * Response Submission Result (Phase 5)
 */
export interface ResponseSubmissionResult {
  responseId: string;
  completed: number;
  total: number;
  allCompleted: boolean;
  nextVideo: string | null;
}

// Future types to be implemented:
// export interface Questionnaire {}
// export interface QuestionnaireResponse {}
// export interface Admin {}
