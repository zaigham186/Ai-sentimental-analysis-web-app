'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseDetail, CodingConfig, CodingFormData, AICodingSuggestion, AuditTrailEntry } from '@/types';

/**
 * Individual Response Coding Page
 * Phase 5: NLP Results & Sentimental Coding UI Integration
 * 
 * CRITICAL RESEARCH PRINCIPLES:
 * - Negative Sentiment ≠ Toxicity ≠ Aggression ≠ Cyberbullying
 * - AI provides suggestions ONLY, researcher retains final authority
 * - Model scores/probabilities are NEVER labeled as empirical accuracy
 * - Participant response is strictly immutable and read-only
 * - Provider provenance (Transformer NLP vs. Fallback) is explicitly communicated
 */

export default function CodingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const responseId = params.id as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [responseDetail, setResponseDetail] = useState<ResponseDetail | null>(null);
  const [config, setConfig] = useState<CodingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for researcher decision
  const [sentiment, setSentiment] = useState<string>('');
  const [aggressionLevel, setAggressionLevel] = useState<string>('');
  const [aggressionCategory, setAggressionCategory] = useState<string>('');
  const [cyberbullyingPresent, setCyberbullyingPresent] = useState<string>('');
  const [cyberbullyingType, setCyberbullyingType] = useState<string>('');
  const [cyberbullyingSeverity, setCyberbullyingSeverity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [confidence, setConfidence] = useState<string>('medium');

  // AI state
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AICodingSuggestion | null>(null);
  const [hasUnreviewedAI, setHasUnreviewedAI] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin, response, and config in parallel
      const [adminResponse, responseResponse, configResponse] = await Promise.all([
        api.admin.me(),
        api.admin.coding.getResponseById(responseId),
        api.admin.coding.config()
      ]);

      setAdmin(adminResponse.data);
      setResponseDetail(responseResponse.data);
      setConfig(configResponse.data);

      // Check for AI suggestion
      const coding = responseResponse.data.coding;
      if (coding) {
        if (coding.aiCoding && coding.reviewStatus === 'pending') {
          setAiSuggestion(coding.aiCoding);
          setHasUnreviewedAI(true);
          setShowAISuggestion(true);
        } else if (coding.aiCoding && coding.reviewStatus === 'reviewed') {
          setAiSuggestion(coding.aiCoding);
          setHasUnreviewedAI(false);
          setShowAISuggestion(true);
        }

        // Populate form with final coding (reviewed, manual, or draft)
        const hasExistingCoding = coding.reviewStatus === 'reviewed' || coding.reviewStatus === 'not_applicable' || !!coding.sentiment || coding.status === 'completed';
        if (hasExistingCoding) {
          setSentiment(coding.sentiment || '');
          setAggressionLevel(coding.aggression?.level !== undefined && coding.aggression.level !== null ? coding.aggression.level.toString() : '');
          setAggressionCategory(coding.aggression?.category || '');
          setCyberbullyingPresent(coding.cyberbullying?.present !== undefined && coding.cyberbullying.present !== null ? coding.cyberbullying.present.toString() : '');
          setCyberbullyingType(coding.cyberbullying?.type || '');
          setCyberbullyingSeverity(coding.cyberbullying?.severity !== undefined && coding.cyberbullying.severity !== null ? coding.cyberbullying.severity.toString() : '');
          setNotes(coding.notes || '');
          setConfidence(coding.confidence || 'medium');
        }
      }
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load response');
      }
    } finally {
      setLoading(false);
    }
  }, [responseId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await api.admin.logout();
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Trigger AI Analysis
  const handleAnalyzeWithAI = async (options?: { force?: boolean }) => {
    try {
      setAnalyzing(true);
      setError(null);
      setSuccess(null);

      const result = await api.admin.coding.analyzeWithAI(responseId, options);
      setSuccess(result.message || 'AI analysis completed successfully. Please review the results below.');
      
      // Reload to reflect newly generated AI suggestion
      await loadData();
    } catch (err: any) {
      const msg = err?.message;
      setError(msg && msg !== 'An error occurred' ? msg : 'AI analysis could not be completed. Please ensure the NLP service is running or use manual coding.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Review Workflow: Accept AI Suggestion
  const handleAcceptAI = async () => {
    if (!responseDetail?.coding || !aiSuggestion) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const codingId = responseDetail.coding.id || (responseDetail.coding as any)._id || responseId;
      await api.admin.coding.reviewAI(codingId, {
        action: 'accept',
        notes: notes || 'AI suggestion accepted by researcher'
      });

      setSuccess('AI suggestion accepted and saved as final research coding.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept AI suggestion');
    } finally {
      setSaving(false);
    }
  };

  // Review Workflow: Modify AI Suggestion
  const handleModifyAI = async () => {
    if (!responseDetail?.coding) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const finalCoding = {
        sentiment: sentiment || 'neutral',
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel, 10) : 0,
          category: aggressionCategory || 'none'
        },
        cyberbullying: {
          present: cyberbullyingPresent === 'true',
          type: cyberbullyingType || 'none',
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity, 10) : 0
        }
      };

      const codingId = responseDetail.coding.id || (responseDetail.coding as any)._id || responseId;
      await api.admin.coding.reviewAI(codingId, {
        action: 'modify',
        finalCoding,
        notes: notes || 'AI suggestion modified by researcher'
      });

      setSuccess('Modified research coding saved successfully.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save modified coding');
    } finally {
      setSaving(false);
    }
  };

  // Review Workflow: Reject AI Suggestion
  const handleRejectAI = async () => {
    if (!responseDetail?.coding) return;
    
    if (!confirm('Reject AI suggestion and record manual coding? The AI suggestion history will be retained for auditability.')) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const finalCoding = {
        sentiment: sentiment || 'neutral',
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel, 10) : 0,
          category: aggressionCategory || 'none'
        },
        cyberbullying: {
          present: cyberbullyingPresent === 'true',
          type: cyberbullyingType || 'none',
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity, 10) : 0
        }
      };

      const codingId = responseDetail.coding.id || (responseDetail.coding as any)._id || responseId;
      await api.admin.coding.reviewAI(codingId, {
        action: 'reject',
        finalCoding,
        notes: notes || 'AI suggestion rejected; independent manual coding recorded'
      });

      setSuccess('AI suggestion rejected. Manual research coding saved.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to record manual coding');
    } finally {
      setSaving(false);
    }
  };

  // Apply AI suggestion to form for editing
  const handleApplyAIToForm = () => {
    if (!aiSuggestion) return;
    
    setSentiment(aiSuggestion.sentiment?.label || 'neutral');
    setAggressionLevel(
      aiSuggestion.aggression?.level !== undefined && aiSuggestion.aggression.level !== null
        ? aiSuggestion.aggression.level.toString() 
        : '0'
    );
    setAggressionCategory(aiSuggestion.aggression?.label || 'none');
    setCyberbullyingPresent(aiSuggestion.cyberbullying?.present ? 'true' : 'false');
    setCyberbullyingType(aiSuggestion.cyberbullying?.type || 'none');
    setCyberbullyingSeverity(
      aiSuggestion.cyberbullying?.severity !== undefined && aiSuggestion.cyberbullying.severity !== null
        ? aiSuggestion.cyberbullying.severity.toString() 
        : '0'
    );
    
    setSuccess('AI suggestions loaded into the Researcher Decision form below. Modify any field as needed, then click "Save Modified Coding".');
    
    // Smooth scroll down to form
    const formElement = document.getElementById('researcher-coding-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Standard Manual Coding Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const codingData: CodingFormData = {
        responseId,
        sentiment: sentiment || undefined,
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel, 10) : undefined,
          category: aggressionCategory || undefined
        },
        cyberbullying: {
          present: cyberbullyingPresent ? cyberbullyingPresent === 'true' : undefined,
          type: cyberbullyingType || undefined,
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity, 10) : undefined
        },
        notes: notes || undefined,
        confidence: confidence || 'medium',
        codingVersion: config?.codingVersion.default
      };

      if (!codingData.aggression?.level && !codingData.aggression?.category) {
        delete codingData.aggression;
      }
      if (!codingData.cyberbullying?.present && !codingData.cyberbullying?.type && !codingData.cyberbullying?.severity) {
        delete codingData.cyberbullying;
      }

      const codingId = responseDetail?.coding?.id || responseDetail?.coding?._id;
      if (responseDetail?.coded && codingId) {
        await api.admin.coding.update(codingId, codingData);
        setSuccess('Research coding updated successfully.');
      } else {
        await api.admin.coding.create(codingData);
        setSuccess('Research coding created successfully.');
      }

      await loadData();
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save coding');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!responseDetail?.coding) return;
    if (!confirm('Delete this coding record? This cannot be undone.')) return;

    try {
      setSaving(true);
      setError(null);
      await api.admin.coding.delete(responseDetail.coding.id);
      setSuccess('Coding record deleted successfully.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete coding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin || !responseDetail || !config) {
    return null;
  }

  const response = responseDetail.response;
  const isFallbackUsed = Boolean(aiSuggestion?.metadata?.fallback_used);

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {hasUnreviewedAI ? 'Review AI-Assisted Coding' : responseDetail.coded ? 'View / Edit Research Coding' : 'Code Participant Response'}
              </h1>
              {hasUnreviewedAI && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                  Pending Human Review
                </span>
              )}
              {responseDetail.coded && !hasUnreviewedAI && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-green-100 text-green-900 border border-green-300 rounded-full">
                  Coded & Approved
                </span>
              )}
            </div>
            <p className="mt-1 text-gray-600">
              Participant: <span className="font-semibold text-gray-800">{response.participant?.name || 'N/A'}</span> (@{response.participant?.username || 'unknown'}) &bull; Video: <span className="font-medium text-gray-800">#{response.video?.order || 'N/A'} {response.video?.title || 'Unknown'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/admin/coding')}>
              &larr; Back to Response List
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        {/* Research Protocol Notice */}
        <div className="mb-6 p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-base font-bold">🔬 Research Protocol:</span>
            <div>
              <strong>Negative Sentiment &ne; Toxicity &ne; Aggression &ne; Cyberbullying.</strong> Each represents a distinct behavioral and linguistic construct. AI outputs are automated suggestions designed to assist researcher judgment. The human researcher retains absolute authority over final dataset coding.
            </div>
          </div>
        </div>

        {/* Trigger AI Analysis Banner (if uncoded or not yet analyzed) */}
        {!aiSuggestion && (
          <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[280px]">
                  <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                    <span>⚡</span> AI-Assisted NLP Analysis
                  </h3>
                  <p className="text-blue-900 text-sm mt-1">
                    Execute research-grade transformer models (Twitter-XLM-RoBERTa sentiment, Detoxify multilingual toxicity, and Xu et al. aggression lexicon) to produce evidence-backed suggestions for this response.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    &bull; Confidence scores &bull; Multi-category toxicity &bull; Xu et al. aggression indicators &bull; Operational cyberbullying
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleAnalyzeWithAI()}
                    disabled={analyzing}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 shadow-sm"
                  >
                    {analyzing ? '⏳ Analyzing Response...' : '🤖 Analyze with AI'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Re-analyze banner if already analyzed */}
        {aiSuggestion && (
          <div className="mb-6 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnalyzeWithAI({ force: true })}
              disabled={analyzing}
              className={isFallbackUsed ? "text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300 font-semibold" : "text-gray-700 hover:bg-gray-100"}
            >
              {analyzing ? '⏳ Re-analyzing with Primary NLP...' : (isFallbackUsed ? '🔄 Re-analyze with Primary NLP Service' : '🔄 Re-analyze with AI')}
            </Button>
          </div>
        )}

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Participant & Original Response (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardBody>
                <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                  Participant Response
                </h2>

                <div className="space-y-4 text-sm">
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Condition</span>
                    <span className={`inline-flex mt-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      response.participant?.condition === 'anonymous' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {response.participant?.condition === 'anonymous' ? 'Anonymous Condition' : 'Identifiable Condition'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Stimulus Video</span>
                    <p className="mt-0.5 text-gray-900 font-medium">#{response.video?.order || 'N/A'} &bull; {response.video?.title || 'Unknown'}</p>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Submission Timestamp</span>
                    <p className="mt-0.5 text-gray-700">
                      {new Date(response.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Original Response Text
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Read-Only &bull; Untampered
                      </span>
                    </div>
                    <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-sm">
                      {response.responseText}
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Integrity Guarantee: Original participant text is preserved in all coding records.
                    </p>
                  </div>

                  {responseDetail.coding?.codedBy && (
                    <div className="pt-3 border-t border-gray-100">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Last Human Coder</span>
                      <p className="mt-0.5 text-gray-900 font-medium">{responseDetail.coding.codedBy.name} (@{responseDetail.coding.codedBy.username})</p>
                      {responseDetail.coding.codedAt && (
                        <p className="text-xs text-gray-500">{new Date(responseDetail.coding.codedAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Audit Trail Card (if available) */}
            {responseDetail.coding?.auditTrail && responseDetail.coding.auditTrail.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardBody>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowAuditTrail(!showAuditTrail)}>
                    <h3 className="text-sm font-bold text-gray-800">
                      📋 Audit History ({responseDetail.coding.auditTrail.length} entries)
                    </h3>
                    <button type="button" className="text-xs text-blue-600 font-semibold hover:underline">
                      {showAuditTrail ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showAuditTrail && (
                    <div className="mt-3 space-y-3 divide-y divide-gray-100">
                      {responseDetail.coding.auditTrail.map((entry, idx) => (
                        <div key={idx} className="pt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                              entry.action === 'accept' ? 'bg-green-100 text-green-800' :
                              entry.action === 'modify' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {entry.action}
                            </span>
                            <span className="text-gray-500">{new Date(entry.reviewedAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700"><strong>Reviewer:</strong> {entry.reviewedBy}</p>
                          {entry.notes && <p className="text-gray-600 italic">&ldquo;{entry.notes}&rdquo;</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          {/* Right Column: AI Suggestions + Researcher Decision Form (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">

            {/* AI SUGGESTION DISPLAY */}
            {aiSuggestion && showAISuggestion && (
              <div className="space-y-4">
                
                {/* Provider Provenance Banner */}
                <div className={`p-4 rounded-xl border-2 ${
                  isFallbackUsed 
                    ? 'bg-amber-50 border-amber-300 text-amber-950' 
                    : 'bg-purple-50 border-purple-200 text-purple-950'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{isFallbackUsed ? '⚠️' : '🤖'}</span>
                      <div>
                        <h2 className="text-base font-bold tracking-tight">
                          {isFallbackUsed ? 'Provider: Rule-Based Fallback' : 'AI-Assisted Analysis (Transformer NLP)'}
                        </h2>
                        <p className="text-xs opacity-90">
                          {isFallbackUsed 
                            ? `Primary NLP service offline (${aiSuggestion.metadata?.fallback_reason || 'Service unavailable'}). Fallback heuristics generated suggestions.`
                            : `Inference by Python FastAPI NLP Service &bull; ${aiSuggestion.metadata?.device?.toUpperCase() || 'CPU'}`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFallbackUsed && (
                        <Button
                          size="sm"
                          onClick={() => handleAnalyzeWithAI({ force: true })}
                          disabled={analyzing}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-3 py-1.5 shadow-sm"
                        >
                          {analyzing ? '⏳ Re-analyzing...' : '🔄 Re-analyze with Primary NLP'}
                        </Button>
                      )}
                      {hasUnreviewedAI && (
                        <span className="px-2.5 py-1 text-xs font-bold bg-yellow-400 text-yellow-950 rounded-md">
                          ACTION REQUIRED
                        </span>
                      )}
                      <span className="text-xs font-mono bg-white/80 px-2 py-1 rounded border border-current/20">
                        v{aiSuggestion.metadata?.version || aiSuggestion.metadata?.provider_version || '1.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Dimension Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* 1. Sentiment Analysis Card */}
                  <Card className="border border-gray-200 shadow-sm bg-white hover:border-purple-300 transition-colors">
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Sentiment
                        </span>
                        <ConfidenceScoreBadge score={aiSuggestion.sentiment?.score ?? aiSuggestion.sentiment?.confidence} />
                      </div>

                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-xl font-bold capitalize ${
                          aiSuggestion.sentiment?.label === 'positive' ? 'text-emerald-600' :
                          aiSuggestion.sentiment?.label === 'negative' ? 'text-rose-600' :
                          aiSuggestion.sentiment?.label === 'mixed' ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                          {aiSuggestion.sentiment?.label || 'Neutral'}
                        </span>
                        {aiSuggestion.sentiment?.score !== undefined && (
                          <span className="text-xs text-gray-500 font-mono">
                            (score: {aiSuggestion.sentiment.score.toFixed(3)})
                          </span>
                        )}
                      </div>

                      {/* Probability Breakdown Bars */}
                      {aiSuggestion.sentiment?.probabilities && (
                        <div className="space-y-1.5 my-3 pt-2 border-t border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-500 block">Class Probabilities</span>
                          <ProbabilityBar 
                            label="Positive" 
                            value={aiSuggestion.sentiment.probabilities.positive || 0} 
                            color="bg-emerald-500" 
                          />
                          <ProbabilityBar 
                            label="Neutral" 
                            value={aiSuggestion.sentiment.probabilities.neutral || 0} 
                            color="bg-slate-400" 
                          />
                          <ProbabilityBar 
                            label="Negative" 
                            value={aiSuggestion.sentiment.probabilities.negative || 0} 
                            color="bg-rose-500" 
                          />
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                        <strong>Evidence:</strong> {aiSuggestion.sentiment?.evidence || 'Standard sentiment classification'}
                      </p>

                      {aiSuggestion.sentiment?.needsReview && (
                        <p className="text-[11px] font-medium text-amber-700 mt-2 flex items-center gap-1">
                          ⚠️ Ambiguous or low-margin sentiment requires human validation
                        </p>
                      )}
                    </CardBody>
                  </Card>

                  {/* 2. Toxicity Indicators Card */}
                  <Card className="border border-gray-200 shadow-sm bg-white hover:border-purple-300 transition-colors">
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Toxicity Indicators
                        </span>
                        <ToxicityOverallBadge 
                          score={aiSuggestion.metadata?.toxicity_score} 
                          isToxic={aiSuggestion.metadata?.is_toxic} 
                        />
                      </div>

                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-xl font-bold ${
                          aiSuggestion.metadata?.is_toxic ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                          {aiSuggestion.metadata?.is_toxic ? 'Toxic Language Detected' : 'Non-Toxic'}
                        </span>
                        {aiSuggestion.metadata?.toxicity_score !== undefined && (
                          <span className="text-xs text-gray-500 font-mono">
                            ({(aiSuggestion.metadata.toxicity_score * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>

                      {/* Toxicity Categories Grid */}
                      {aiSuggestion.metadata?.toxicity ? (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                            Detoxify Multilingual Dimensions
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            <ToxicityCategoryChip label="Severe Toxicity" score={aiSuggestion.metadata.toxicity.severe_toxicity} />
                            <ToxicityCategoryChip label="Insult" score={aiSuggestion.metadata.toxicity.insult} />
                            <ToxicityCategoryChip label="Threat" score={aiSuggestion.metadata.toxicity.threat} />
                            <ToxicityCategoryChip label="Obscene" score={aiSuggestion.metadata.toxicity.obscene} />
                            <ToxicityCategoryChip label="Identity Attack" score={aiSuggestion.metadata.toxicity.identity_attack} />
                            <ToxicityCategoryChip label="Sexual Explicit" score={aiSuggestion.metadata.toxicity.sexual_explicit} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic py-2">
                          Detailed toxicity breakdown not available in this analysis record.
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500 mt-2">
                        Model: {aiSuggestion.metadata?.toxicity_model || 'detoxify-multilingual'}
                      </p>
                    </CardBody>
                  </Card>

                  {/* 3. Aggression Analysis Card */}
                  <Card className="border border-gray-200 shadow-sm bg-white hover:border-purple-300 transition-colors">
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Aggression (Xu et al., 2020)
                        </span>
                        <AggressionLevelBadge level={aiSuggestion.aggression?.label} />
                      </div>

                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xl font-bold capitalize text-gray-900">
                          {aiSuggestion.aggression?.label || 'None'}
                        </span>
                        <span className="text-sm font-semibold text-purple-800">
                          Level: {aiSuggestion.aggression?.level ?? 0} / 10
                        </span>
                        {aiSuggestion.aggression?.score !== undefined && (
                          <span className="text-xs text-gray-500 font-mono">
                            (raw: {aiSuggestion.aggression.score.toFixed(2)})
                          </span>
                        )}
                      </div>

                      {/* Targeting distinction */}
                      <div className="my-2">
                        {aiSuggestion.aggression?.isPersonallyTargeted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                            🎯 Direct Personal Targeting Detected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            💡 Content / Idea Critique (Not Personally Targeted)
                          </span>
                        )}
                      </div>

                      {/* Matched indicators chips */}
                      {aiSuggestion.aggression?.matchedIndicators && aiSuggestion.aggression.matchedIndicators.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[11px] font-semibold text-gray-500 block">Matched Indicators:</span>
                          <div className="flex flex-wrap gap-1">
                            {aiSuggestion.aggression.matchedIndicators.map((ind, i) => (
                              <span key={i} className="px-2 py-0.5 text-[11px] font-mono bg-purple-50 text-purple-800 rounded border border-purple-200">
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                        <strong>Evidence:</strong> {aiSuggestion.aggression?.evidence || 'No overt aggression cues found'}
                      </p>
                    </CardBody>
                  </Card>

                  {/* 4. Cyberbullying Assessment Card */}
                  <Card className="border border-gray-200 shadow-sm bg-white hover:border-purple-300 transition-colors">
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Cyberbullying Assessment
                        </span>
                        <CyberbullyingStatusBadge 
                          classification={aiSuggestion.cyberbullying?.classification} 
                          present={aiSuggestion.cyberbullying?.present} 
                        />
                      </div>

                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-xl font-bold ${
                          aiSuggestion.cyberbullying?.present ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {aiSuggestion.cyberbullying?.classification 
                            ? formatClassification(aiSuggestion.cyberbullying.classification)
                            : (aiSuggestion.cyberbullying?.present ? 'Cyberbullying Present' : 'Not Cyberbullying')
                          }
                        </span>
                        {aiSuggestion.cyberbullying?.severity !== undefined && aiSuggestion.cyberbullying.severity > 0 && (
                          <span className="text-sm font-semibold text-rose-800">
                            Severity: {aiSuggestion.cyberbullying.severity} / 10
                          </span>
                        )}
                      </div>

                      {aiSuggestion.cyberbullying?.present && aiSuggestion.cyberbullying?.type && (
                        <div className="text-xs text-gray-800 font-medium my-1">
                          Type: <span className="capitalize font-bold text-purple-900">{aiSuggestion.cyberbullying.type}</span>
                        </div>
                      )}

                      {/* Reason Codes */}
                      {aiSuggestion.cyberbullying?.reasonCodes && aiSuggestion.cyberbullying.reasonCodes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[11px] font-semibold text-gray-500 block">Deterministic Reason Codes:</span>
                          <div className="flex flex-wrap gap-1">
                            {aiSuggestion.cyberbullying.reasonCodes.map((code, i) => (
                              <span key={i} className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-800 rounded border border-slate-300">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                        <strong>Evidence:</strong> {aiSuggestion.cyberbullying?.evidence || 'Does not satisfy operational criteria'}
                      </p>

                      {aiSuggestion.cyberbullying?.needsReview && (
                        <p className="text-[11px] font-medium text-amber-700 mt-2 flex items-center gap-1">
                          ⚠️ Operational criteria threshold boundary &bull; Human review required
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </div>

                {/* Expandable Evidence & Methodology Accordion */}
                <Card className="border border-gray-200 shadow-sm bg-white">
                  <CardBody className="py-3">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowEvidence(!showEvidence)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">🔍 Research Evidence & Methodology Details</span>
                        <span className="text-xs text-gray-500 font-normal">(Click to {showEvidence ? 'collapse' : 'expand'})</span>
                      </div>
                      <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                        {showEvidence ? '▲ Hide Details' : '▼ View Evidence & Spans'}
                      </button>
                    </div>

                    {showEvidence && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 text-xs">
                        
                        {/* Token / Spans Evidence Items */}
                        {aiSuggestion.aggression?.evidenceItems && aiSuggestion.aggression.evidenceItems.length > 0 && (
                          <div>
                            <h4 className="font-bold text-gray-800 mb-1.5">Detected Aggression Lexicon Terms:</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-xs rounded">
                                <thead className="bg-gray-50 text-gray-600 font-semibold">
                                  <tr>
                                    <th className="px-3 py-1.5 text-left">Matched Term</th>
                                    <th className="px-3 py-1.5 text-left">Category</th>
                                    <th className="px-3 py-1.5 text-left">Character Span</th>
                                    <th className="px-3 py-1.5 text-left">Weight</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {aiSuggestion.aggression.evidenceItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-3 py-1.5 font-mono font-bold text-purple-900">{item.term}</td>
                                      <td className="px-3 py-1.5 capitalize text-gray-700">{item.category}</td>
                                      <td className="px-3 py-1.5 text-gray-500 font-mono">
                                        {item.start !== undefined && item.end !== undefined ? `[${item.start} - ${item.end}]` : 'N/A'}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-600">{item.weight ?? '1.0'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Research Limitations Note */}
                        {aiSuggestion.cyberbullying?.limitations && aiSuggestion.cyberbullying.limitations.length > 0 && (
                          <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                            <h4 className="font-bold mb-1">Academic Model Limitations:</h4>
                            <ul className="list-disc list-inside space-y-0.5 text-xs">
                              {aiSuggestion.cyberbullying.limitations.map((lim, i) => (
                                <li key={i}>{lim}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Technical Metadata */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-gray-800">Model Execution Provenance</h4>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-gray-50 p-2.5 rounded border border-gray-200">
                            <div>
                              <span className="text-gray-500 block">Sentiment Model:</span>
                              <span className="font-mono font-medium text-gray-800">{aiSuggestion.metadata?.sentiment_model || 'cardiffnlp XLM-RoBERTa'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Toxicity Model:</span>
                              <span className="font-mono font-medium text-gray-800">{aiSuggestion.metadata?.toxicity_model || 'Detoxify Multilingual'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Latency / Device:</span>
                              <span className="font-mono font-medium text-gray-800">{aiSuggestion.metadata?.processing_time_ms ? `${aiSuggestion.metadata.processing_time_ms}ms` : 'N/A'} &bull; {aiSuggestion.metadata?.device || 'CPU'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Analyzed At:</span>
                              <span className="text-gray-800">{aiSuggestion.metadata?.analyzedAt ? new Date(aiSuggestion.metadata.analyzedAt).toLocaleTimeString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Review Decision Buttons (Accept / Modify / Reject) */}
                {hasUnreviewedAI && (
                  <Card className="border-2 border-purple-300 bg-purple-50/60 shadow-sm">
                    <CardBody>
                      <h3 className="text-sm font-bold text-purple-950 mb-2">
                        ⚖️ Researcher Review Decision (Human-in-the-Loop)
                      </h3>
                      <p className="text-xs text-purple-900 mb-4">
                        Review the AI-generated suggestions above. Choose whether to accept them directly into the research dataset, apply them to the form below for manual modification, or reject them.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                          onClick={handleAcceptAI}
                          disabled={saving}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm py-2.5"
                        >
                          {saving ? 'Saving...' : '✅ Accept AI Suggestion'}
                        </Button>
                        
                        <Button
                          onClick={handleApplyAIToForm}
                          variant="outline"
                          className="border-purple-400 text-purple-900 bg-white hover:bg-purple-100 font-medium py-2.5"
                        >
                          ✏️ Modify AI Suggestion
                        </Button>
                        
                        <Button
                          onClick={handleRejectAI}
                          disabled={saving}
                          variant="outline"
                          className="border-rose-300 text-rose-700 bg-white hover:bg-rose-50 font-medium py-2.5"
                        >
                          ❌ Reject & Code Manually
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )}

              </div>
            )}

            {/* RESEARCHER FINAL CODING FORM */}
            <Card id="researcher-coding-form" className="border border-gray-200 shadow-sm bg-white">
              <CardBody>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Researcher Final Coding
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      The approved research dataset values. Human researchers hold final scientific authority.
                    </p>
                  </div>
                  {hasUnreviewedAI && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyAIToForm}
                      className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs"
                    >
                      &darr; Auto-fill from AI Suggestion
                    </Button>
                  )}
                </div>

                <form onSubmit={hasUnreviewedAI ? (e) => { e.preventDefault(); handleModifyAI(); } : handleSubmit} className="space-y-5">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Final Sentiment */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Final Sentiment <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={sentiment}
                        onChange={(e) => setSentiment(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">-- Select Sentiment --</option>
                        {config.sentiment.values.map(val => (
                          <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-500">{config.sentiment.note}</p>
                    </div>

                    {/* Final Aggression Level */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Aggression Level (0 - 10)
                      </label>
                      <input
                        type="number"
                        min={config.aggression.level.min}
                        max={config.aggression.level.max}
                        value={aggressionLevel}
                        onChange={(e) => setAggressionLevel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="0 - 10"
                      />
                      <p className="mt-1 text-[11px] text-gray-500">{config.aggression.level.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Final Aggression Category */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Aggression Category
                      </label>
                      <select
                        value={aggressionCategory}
                        onChange={(e) => setAggressionCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">-- Select Category --</option>
                        {config.aggression.category.values.map(val => (
                          <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Final Cyberbullying Present */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Cyberbullying Present <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={cyberbullyingPresent}
                        onChange={(e) => setCyberbullyingPresent(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">-- Select --</option>
                        <option value="true">Yes &bull; Cyberbullying Present</option>
                        <option value="false">No &bull; Not Cyberbullying</option>
                      </select>
                    </div>
                  </div>

                  {/* Cyberbullying Subfields if Present */}
                  {cyberbullyingPresent === 'true' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-purple-50/50 rounded-lg border border-purple-200">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Cyberbullying Typology
                        </label>
                        <select
                          value={cyberbullyingType}
                          onChange={(e) => setCyberbullyingType(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          <option value="">-- Select Typology --</option>
                          {config.cyberbullying.type.values.map(val => (
                            <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                          Severity Rating (0 - 10)
                        </label>
                        <input
                          type="number"
                          min={config.cyberbullying.severity.min}
                          max={config.cyberbullying.severity.max}
                          value={cyberbullyingSeverity}
                          onChange={(e) => setCyberbullyingSeverity(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          placeholder="0 - 10"
                        />
                      </div>
                    </div>
                  )}

                  {/* Coding Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Researcher Notes & Scientific Rationale
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="Add research rationale, context notes, or reasons for modifying AI suggestions..."
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      {notes.length}/2000 characters &bull; Preserved in study audit trail
                    </p>
                  </div>

                  {/* Confidence */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Coder Confidence
                    </label>
                    <select
                      value={confidence}
                      onChange={(e) => setConfidence(e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      {config.confidence.values.map(val => (
                        <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)} Confidence</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-200">
                    {hasUnreviewedAI ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleModifyAI}
                          disabled={saving || !sentiment || !cyberbullyingPresent}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-5 py-2.5"
                        >
                          {saving ? 'Saving Changes...' : '💾 Save Modified Research Coding'}
                        </Button>
                        <p className="text-xs text-gray-500">
                          Saves researcher-modified values to dataset and records action in audit trail.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          disabled={saving || !sentiment || !cyberbullyingPresent}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5"
                        >
                          {saving ? 'Saving...' : responseDetail.coded ? 'Update Research Coding' : 'Save Final Coding'}
                        </Button>
                        
                        {responseDetail.coded && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleDelete}
                            disabled={saving}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50"
                          >
                            Delete Coding
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// -------------------------------------------------------------
// HELPER PRESENTATIONAL COMPONENTS
// -------------------------------------------------------------

function ConfidenceScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return <span className="text-xs font-mono text-gray-500">Score: N/A</span>;
  }
  const color = score >= 0.7 
    ? 'bg-emerald-100 text-emerald-800' 
    : score >= 0.5 
    ? 'bg-amber-100 text-amber-800' 
    : 'bg-rose-100 text-rose-800';

  return (
    <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded-full ${color}`}>
      Score: {score.toFixed(2)}
    </span>
  );
}

function ToxicityOverallBadge({ score, isToxic }: { score?: number; isToxic?: boolean }) {
  if (score === undefined || score === null) {
    return <span className="text-xs font-mono text-gray-500">Score: N/A</span>;
  }
  const color = isToxic 
    ? 'bg-rose-100 text-rose-800' 
    : score > 0.3 
    ? 'bg-amber-100 text-amber-800' 
    : 'bg-emerald-100 text-emerald-800';

  return (
    <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded-full ${color}`}>
      {isToxic ? 'Toxic' : 'Non-Toxic'} ({score.toFixed(2)})
    </span>
  );
}

function ToxicityCategoryChip({ label, score }: { label: string; score?: number }) {
  const val = score ?? 0;
  const isHigh = val >= 0.5;
  const isMod = val >= 0.2 && val < 0.5;
  
  const badgeColor = isHigh 
    ? 'bg-rose-100 text-rose-800 border-rose-200' 
    : isMod 
    ? 'bg-amber-100 text-amber-800 border-amber-200' 
    : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded border ${badgeColor}`}>
      <span className="truncate pr-1">{label}</span>
      <span className="font-mono font-bold text-[10px]">{val.toFixed(2)}</span>
    </div>
  );
}

function AggressionLevelBadge({ level }: { level?: string | null }) {
  const lvl = level?.toLowerCase() || 'none';
  const color = lvl === 'severe'
    ? 'bg-rose-100 text-rose-800'
    : lvl === 'moderate'
    ? 'bg-amber-100 text-amber-800'
    : lvl === 'mild'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-emerald-100 text-emerald-800';

  return (
    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${color}`}>
      {lvl}
    </span>
  );
}

function CyberbullyingStatusBadge({ classification, present }: { classification?: string; present?: boolean }) {
  if (classification === 'needs_review') {
    return (
      <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
        Needs Review
      </span>
    );
  }
  if (classification === 'insufficient_evidence') {
    return (
      <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 rounded-full">
        Insufficient Evidence
      </span>
    );
  }
  if (present || classification === 'cyberbullying') {
    return (
      <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 rounded-full">
        Cyberbullying
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full">
      Not Cyberbullying
    </span>
  );
}

function ProbabilityBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] text-gray-600">
        <span>{label}</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-1.5 rounded-full ${color}`} 
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function formatClassification(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
