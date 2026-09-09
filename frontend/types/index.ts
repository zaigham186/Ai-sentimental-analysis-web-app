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

/**
 * Admin (Phase 8)
 */
export interface Admin {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'researcher' | 'coder' | 'analyst';
  permissions: string[];
}

/**
 * Admin Login Data (Phase 8)
 */
export interface AdminLoginData {
  username: string;
  password: string;
}

/**
 * Dashboard Statistics (Phase 8)
 */
export interface DashboardStats {
  participants: {
    total: number;
    anonymous: number;
    identifiable: number;
    completed: number;
    incomplete: number;
    withdrawn: number;
  };
  experiment: {
    totalResponses: number;
    completedExperiments: number;
  };
  questionnaires: {
    completed: number;
    pending: number;
  };
  coding: {
    totalResponses: number;
    codedResponses: number;
    pendingResponses: number;
  };
}

/**
 * Video Management (Phase 9)
 */
export interface VideoManagement {
  id: string;
  title: string;
  topic: string;
  description: string;
  videoUrl: string;
  duration: number;
  order: number;
  active: boolean;
  validationStatus: 'candidate' | 'under_review' | 'approved' | 'rejected';
  validationNotes?: string;
  validationDate?: string;
  validatedBy?: {
    name: string;
    username: string;
  };
  version: string;
  metadata?: {
    category?: string;
    tags?: string[];
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VideoFormData {
  title: string;
  topic: string;
  description: string;
  videoUrl: string;
  duration: number;
  order: number;
  active: boolean;
  version: string;
  metadata?: {
    category?: string;
    tags?: string[];
    notes?: string;
  };
}

export interface StimulusSetValidation {
  valid: boolean;
  count: number;
  expected: number;
  status: 'ready' | 'insufficient' | 'excess';
  message: string;
  videos: Array<{
    id: string;
    order: number;
    title: string;
    version: string;
  }>;
}

export interface VideoStatistics {
  total: number;
  byStatus: {
    candidate: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  byActive: {
    active: number;
    inactive: number;
  };
  approvedActive: number;
  stimulusSetValid: boolean;
}

/**
 * Response Coding (Phase 10 + Phase 10 Enhancement: AI-Assisted)
 */
export interface ResponseWithCoding {
  id: string;
  participant: {
    username: string;
    name: string;
    condition: 'anonymous' | 'identifiable';
    displayName?: string;
  };
  video: {
    id: string;
    title: string;
    order: number;
  };
  responseText: string;
  responseTime?: number;
  submittedAt: string;
  coded: boolean;
  codingId?: string;
  codingStatus: 'CODED' | 'UNCODED';
}

/**
 * AI Coding Suggestion (Phase 10 Enhancement)
 */
export interface AICodingSuggestion {
  sentiment: {
    label: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
    confidence: number;
    evidence: string;
    needsReview: boolean;
  };
  aggression: {
    label: 'none' | 'mild' | 'moderate' | 'severe';
    level: number;
    confidence: number;
    evidence: string;
    needsReview: boolean;
  };
  cyberbullying: {
    present: boolean;
    type: 'none' | 'harassment' | 'denigration' | 'flaming' | 'impersonation' | 'outing' | 'exclusion' | 'cyberstalking' | 'other';
    severity: number;
    confidence: number;
    evidence: string;
    criteriaMatched: string[];
    needsReview: boolean;
  };
  metadata: {
    provider: string;
    version: string;
    analyzedAt: string;
    detectedLanguage?: string;
    languageConfidence?: number;
    responseLength?: number;
    wordCount?: number;
  };
}

/**
 * Audit Trail Entry (Phase 10 Enhancement)
 */
export interface AuditTrailEntry {
  action: 'accept' | 'modify' | 'reject';
  reviewedBy: string;
  reviewedAt: string;
  aiSuggestion: {
    sentiment: string;
    aggression: {
      category: string;
      level: number;
    };
    cyberbullying: {
      present: boolean;
      type: string;
    };
  };
  finalDecision: {
    sentiment: string;
    aggression: {
      category: string;
      level: number;
    };
    cyberbullying: {
      present: boolean;
      type: string;
      severity: number;
    };
  };
  notes: string;
}

export interface Coding {
  id: string;
  response: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  aggression: {
    level?: number;
    category?: 'none' | 'mild' | 'moderate' | 'severe';
    subcategories?: string[];
  };
  cyberbullying: {
    present?: boolean;
    type?: 'none' | 'harassment' | 'denigration' | 'flaming' | 'impersonation' | 'outing' | 'exclusion' | 'cyberstalking' | 'other';
    severity?: number;
  };
  notes?: string;
  codedBy?: {
    id: string;
    name: string;
    username: string;
  };
  coderRole: 'primary' | 'secondary' | 'expert' | 'validator';
  codingVersion: string;
  confidence: 'low' | 'medium' | 'high';
  codedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Phase 10 Enhancement: AI-Assisted Coding
  aiCoding?: AICodingSuggestion;
  reviewStatus?: 'pending' | 'reviewed' | 'uncertain';
  auditTrail?: AuditTrailEntry[];
}

/**
 * Pending Review Item (Phase 10 Enhancement)
 */
export interface PendingReviewItem {
  codingId: string;
  responseId: string;
  participant: {
    username: string;
    name: string;
    condition: 'anonymous' | 'identifiable';
  };
  video: {
    title: string;
    order: number;
    topic: string;
  };
  responseText: string;
  submittedAt: string;
  aiSuggestion: AICodingSuggestion;
  needsReview: boolean;
}

/**
 * Review Action (Phase 10 Enhancement)
 */
export interface ReviewAction {
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
}

export interface CodingConfig {
  sentiment: {
    values: string[];
    description: string;
    note: string;
  };
  aggression: {
    level: {
      min: number;
      max: number;
      description: string;
    };
    category: {
      values: string[];
      description: string;
      note: string;
    };
  };
  cyberbullying: {
    present: {
      type: string;
      description: string;
    };
    type: {
      values: string[];
      description: string;
      note: string;
    };
    severity: {
      min: number;
      max: number;
      description: string;
    };
  };
  confidence: {
    values: string[];
    description: string;
  };
  codingVersion: {
    default: string;
    description: string;
  };
  note: string;
}

export interface CodingStatistics {
  total: number;
  coded: number;
  uncoded: number;
  progress: number;
  distribution: {
    aggression: Record<string, number>;
    cyberbullying: Record<string, number>;
  };
}

export interface CodingFormData {
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
}

export interface ResponseDetail {
  response: ResponseWithCoding;
  coding: Coding | null;
  coded: boolean;
}

// Future types to be implemented:
// export interface Questionnaire {}
// export interface QuestionnaireResponse {}


/**
 * Analytics (Phase 11)
 */
export interface AnalyticsDashboard {
  participants: {
    total: number;
    anonymous: number;
    identifiable: number;
    completed: number;
    incomplete: number;
    withdrawn: number;
  };
  experiment: {
    totalVideos: number;
    expectedResponses: number;
    submittedResponses: number;
    completedExperiments: number;
    incompleteExperiments: number;
    avgResponsesPerParticipant: number;
    responseCompletionRate: number;
  };
  coding: {
    totalResponses: number;
    codedResponses: number;
    uncodedResponses: number;
    codingCompletionRate: number;
  };
}

export interface ConditionComparison {
  anonymous: ConditionMetrics;
  identifiable: ConditionMetrics;
  note: string;
}

export interface ConditionMetrics {
  participantCount: number;
  completedCount: number;
  incompleteCount: number;
  withdrawnCount: number;
  completionRate: string | number;
  totalResponses: number;
  avgResponsesPerParticipant: string | number;
  codedResponses: number;
  uncodedResponses: number;
  meanAggressionScore: number | null;
  sentimentDistribution: Record<string, number>;
  cyberbullyingDistribution: Record<string, number>;
}

export interface VideoResponseAnalytics {
  videoId: string;
  videoTitle: string;
  videoOrder: number;
  expected: number;
  submitted: number;
  missing: number;
  completionPercentage: number;
  byCondition: {
    anonymous: number;
    identifiable: number;
  };
}

export interface CodingAnalytics {
  totalResponses: number;
  codedResponses: number;
  uncodedResponses: number;
  codingCompletionPercentage: number;
  distributions: {
    aggression: Record<string, number>;
    sentiment: Record<string, number>;
    cyberbullying: Record<string, number>;
  };
  note: string;
}

export interface AggressionAnalytics {
  codedResponsesCount: number;
  meanScore?: number;
  minScore?: number;
  maxScore?: number;
  byCondition: {
    anonymous: {
      count: number;
      meanScore: number | null;
    };
    identifiable: {
      count: number;
      meanScore: number | null;
    };
  };
  categoryDistribution: Record<string, number>;
  note: string;
}

export interface DataQuality {
  hasIssues: boolean;
  issueCount: number;
  issues: DataQualityIssue[];
  note: string;
}

export interface DataQualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  message: string;
}

/**
 * Participant Management (Phase 12)
 */
export interface ParticipantWithStats {
  _id: string;
  username: string;
  name: string;
  age: number;
  gender: string;
  university: string;
  department: string;
  condition: 'anonymous' | 'identifiable';
  status: 'active' | 'completed' | 'incomplete' | 'withdrawn';
  consentGiven: boolean;
  consentAt?: string;
  createdAt: string;
  updatedAt: string;
  responseCount: number;
  codedCount: number;
}

export interface ParticipantDetail {
  participant: ParticipantWithStats;
  responses: Array<{
    _id: string;
    video: {
      _id: string;
      title: string;
      order: number;
    };
    responseText: string;
    submittedAt: string;
  }>;
  codings: Array<{
    _id: string;
    response: string;
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
    codedBy: {
      name: string;
      username: string;
    };
    codedAt: string;
  }>;
  stats: {
    totalResponses: number;
    codedResponses: number;
    uncodedResponses: number;
  };
}

export interface ParticipantStatistics {
  total: number;
  byCondition: {
    anonymous: number;
    identifiable: number;
  };
  byStatus: {
    active: number;
    completed: number;
    incomplete: number;
    withdrawn: number;
  };
}

/**
 * Response Management (Phase 12)
 */
export interface ResponseWithDetails {
  _id: string;
  participant: {
    _id: string;
    username: string;
    name: string;
    condition: 'anonymous' | 'identifiable';
    status: string;
  };
  video: {
    _id: string;
    title: string;
    order: number;
    topic: string;
  };
  responseText: string;
  responseTime?: number;
  submittedAt: string;
  coding: Coding | null;
  coded: boolean;
}

export interface ResponseDetail {
  response: ResponseWithDetails;
  coding: Coding | null;
}

export interface ResponseStatistics {
  total: number;
  coded: number;
  uncoded: number;
  codingRate: string;
  byCondition: {
    anonymous: number;
    identifiable: number;
  };
}

// Future types to be implemented:
// export interface Questionnaire {}
// export interface QuestionnaireResponse {}
