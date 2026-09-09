'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, ResponseDetail, CodingConfig, CodingFormData, AICodingSuggestion } from '@/types';

/**
 * Individual Response Coding Page
 * Phase 10: Response Coding System + Phase 10 Enhancement: AI-Assisted Coding
 * CRITICAL: Never modifies original responseText
 * CRITICAL: AI provides SUGGESTIONS only, human makes final decision
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

  // Form state
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

  useEffect(() => {
    loadData();
  }, [responseId]);

  const loadData = async () => {
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
        // Check if AI suggestion exists and hasn't been reviewed
        if (coding.aiCoding && coding.reviewStatus === 'pending') {
          setAiSuggestion(coding.aiCoding);
          setHasUnreviewedAI(true);
          setShowAISuggestion(true);
        } else if (coding.aiCoding && coding.reviewStatus === 'reviewed') {
          setAiSuggestion(coding.aiCoding);
          setHasUnreviewedAI(false);
        }

        // Populate form with final coding (if reviewed) or empty
        if (coding.reviewStatus === 'reviewed') {
          setSentiment(coding.sentiment || '');
          setAggressionLevel(coding.aggression?.level?.toString() || '');
          setAggressionCategory(coding.aggression?.category || '');
          setCyberbullyingPresent(coding.cyberbullying?.present?.toString() || '');
          setCyberbullyingType(coding.cyberbullying?.type || '');
          setCyberbullyingSeverity(coding.cyberbullying?.severity?.toString() || '');
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
  };

  const handleLogout = async () => {
    try {
      await api.admin.logout();
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Phase 10 Enhancement: Trigger AI Analysis
  const handleAnalyzeWithAI = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      setSuccess(null);

      const result = await api.admin.coding.analyzeWithAI(responseId);
      
      setSuccess(result.message || 'AI analysis completed. Please review the suggestions below.');
      
      // Reload to get AI suggestion
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze with AI');
    } finally {
      setAnalyzing(false);
    }
  };

  // Phase 10 Enhancement: Accept AI Suggestion
  const handleAcceptAI = async () => {
    if (!responseDetail?.coding || !aiSuggestion) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.admin.coding.reviewAI(responseDetail.coding.id, {
        action: 'accept',
        notes: notes || 'AI suggestion accepted without modifications'
      });

      setSuccess('AI suggestion accepted and saved as final coding.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept AI suggestion');
    } finally {
      setSaving(false);
    }
  };

  // Phase 10 Enhancement: Modify AI Suggestion
  const handleModifyAI = async () => {
    if (!responseDetail?.coding) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const finalCoding = {
        sentiment: sentiment || 'neutral',
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel) : 0,
          category: aggressionCategory || 'none'
        },
        cyberbullying: {
          present: cyberbullyingPresent === 'true',
          type: cyberbullyingType || 'none',
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity) : 0
        }
      };

      await api.admin.coding.reviewAI(responseDetail.coding.id, {
        action: 'modify',
        finalCoding,
        notes: notes || 'AI suggestion modified by researcher'
      });

      setSuccess('Modified coding saved successfully.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save modified coding');
    } finally {
      setSaving(false);
    }
  };

  // Phase 10 Enhancement: Reject AI Suggestion
  const handleRejectAI = async () => {
    if (!responseDetail?.coding) return;
    
    if (!confirm('Reject AI suggestion and code manually?')) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const finalCoding = {
        sentiment: sentiment || 'neutral',
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel) : 0,
          category: aggressionCategory || 'none'
        },
        cyberbullying: {
          present: cyberbullyingPresent === 'true',
          type: cyberbullyingType || 'none',
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity) : 0
        }
      };

      await api.admin.coding.reviewAI(responseDetail.coding.id, {
        action: 'reject',
        finalCoding,
        notes: notes || 'AI suggestion rejected, manual coding provided'
      });

      setSuccess('Manual coding saved successfully.');
      
      setTimeout(() => {
        router.push('/admin/coding');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save manual coding');
    } finally {
      setSaving(false);
    }
  };

  // Phase 10 Enhancement: Apply AI suggestion to form (for modification)
  const handleApplyAIToForm = () => {
    if (!aiSuggestion) return;
    
    setSentiment(aiSuggestion.sentiment.label || '');
    setAggressionLevel(aiSuggestion.aggression.level.toString());
    setAggressionCategory(aiSuggestion.aggression.label);
    setCyberbullyingPresent(aiSuggestion.cyberbullying.present.toString());
    setCyberbullyingType(aiSuggestion.cyberbullying.type);
    setCyberbullyingSeverity(aiSuggestion.cyberbullying.severity.toString());
    
    setSuccess('AI suggestion applied to form. Modify as needed, then click "Save Modified Coding".');
  };

  // Original manual coding submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Build coding data
      const codingData: CodingFormData = {
        responseId,
        sentiment: sentiment || undefined,
        aggression: {
          level: aggressionLevel ? parseInt(aggressionLevel) : undefined,
          category: aggressionCategory || undefined
        },
        cyberbullying: {
          present: cyberbullyingPresent ? cyberbullyingPresent === 'true' : undefined,
          type: cyberbullyingType || undefined,
          severity: cyberbullyingSeverity ? parseInt(cyberbullyingSeverity) : undefined
        },
        notes: notes || undefined,
        confidence: confidence || 'medium',
        codingVersion: config?.codingVersion.default
      };

      // Remove empty aggression/cyberbullying objects
      if (!codingData.aggression?.level && !codingData.aggression?.category) {
        delete codingData.aggression;
      }
      if (!codingData.cyberbullying?.present && !codingData.cyberbullying?.type && !codingData.cyberbullying?.severity) {
        delete codingData.cyberbullying;
      }

      // Create or update
      if (responseDetail?.coded && responseDetail.coding?.reviewStatus === 'reviewed') {
        await api.admin.coding.update(responseDetail.coding!.id, codingData);
        setSuccess('Coding updated successfully');
      } else {
        await api.admin.coding.create(codingData);
        setSuccess('Coding created successfully');
      }

      // Reload data
      await loadData();
      
      // Redirect after short delay
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
    if (!confirm('Delete this coding? This cannot be undone.')) return;

    try {
      setSaving(true);
      setError(null);
      await api.admin.coding.delete(responseDetail.coding.id);
      setSuccess('Coding deleted successfully');
      
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

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {hasUnreviewedAI ? 'Review AI Coding Suggestion' : responseDetail.coded ? 'View/Edit Coding' : 'Code Response'}
            </h1>
            <p className="mt-2 text-gray-600">
              Response from {response.participant.name} (@{response.participant.username})
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/coding')}>
            ← Back to List
          </Button>
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

        {/* Research Protocol Warning */}
        <Alert variant="warning" className="mb-6">
          <strong>⚠️ Phase 10 Enhancement: AI-Assisted Coding:</strong> AI provides SUGGESTIONS only. 
          Human researcher must review and make final decision (Accept/Modify/Reject). 
          Negative sentiment ≠ Aggression ≠ Cyberbullying. These are separate research constructs.
        </Alert>

        {/* AI Analysis Button (if no AI suggestion yet) */}
        {!aiSuggestion && !responseDetail.coded && (
          <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    🤖 AI-Assisted Coding Available
                  </h3>
                  <p className="text-blue-800 mb-3">
                    Get AI coding suggestions to speed up your workflow. The AI will analyze this response and provide 
                    evidence-based suggestions for sentiment, aggression, and cyberbullying coding. You'll review and 
                    make the final decision.
                  </p>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 mb-4">
                    <li>AI analyzes context, not just keywords</li>
                    <li>Provides evidence and confidence scores</li>
                    <li>Flags uncertain cases for review</li>
                    <li>You maintain full control over final coding</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleAnalyzeWithAI}
                  disabled={analyzing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {analyzing ? '🔄 Analyzing...' : '🤖 Analyze with AI'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAISuggestion(false)}
                >
                  Skip AI, Code Manually
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Response Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Response Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Participant</label>
                    <p className="mt-1 text-gray-900">{response.participant.name}</p>
                    <p className="text-sm text-gray-500">@{response.participant.username}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                      response.participant.condition === 'anonymous' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {response.participant.condition === 'anonymous' ? 'Anonymous' : 'Identifiable'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Video</label>
                    <p className="mt-1 text-gray-900">#{response.video.order} - {response.video.title}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(response.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Text (Original - Read Only)
                    </label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-gray-900 whitespace-pre-wrap">{response.responseText}</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      ℹ️ Original response is NEVER modified
                    </p>
                  </div>

                  {responseDetail.coding && responseDetail.coding.codedBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Coded By</label>
                      <p className="mt-1 text-gray-900">{responseDetail.coding.codedBy.name}</p>
                      <p className="text-sm text-gray-500">
                        {responseDetail.coding.codedAt && new Date(responseDetail.coding.codedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Column 2: AI Suggestion (if exists) */}
          {aiSuggestion && showAISuggestion && (
            <div className="lg:col-span-1">
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-purple-900">🤖 AI Suggestion</h2>
                    {hasUnreviewedAI && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        NEEDS REVIEW
                      </span>
                    )}
                  </div>

                  <Alert variant="info" className="mb-4">
                    <strong>Remember:</strong> This is a SUGGESTION, not final coding. Review carefully and make your decision.
                  </Alert>

                  <div className="space-y-4">
                    {/* Sentiment */}
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Sentiment</h3>
                        <ConfidenceBadge confidence={aiSuggestion.sentiment.confidence} />
                      </div>
                      <p className="text-lg font-medium text-purple-700 mb-2">
                        {aiSuggestion.sentiment.label ? 
                          aiSuggestion.sentiment.label.charAt(0).toUpperCase() + aiSuggestion.sentiment.label.slice(1) 
                          : 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600"><strong>Evidence:</strong> {aiSuggestion.sentiment.evidence}</p>
                      {aiSuggestion.sentiment.needsReview && (
                        <p className="text-xs text-yellow-700 mt-1">⚠️ Low confidence - requires review</p>
                      )}
                    </div>

                    {/* Aggression */}
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Aggression</h3>
                        <ConfidenceBadge confidence={aiSuggestion.aggression.confidence} />
                      </div>
                      <p className="text-lg font-medium text-purple-700 mb-1">
                        {aiSuggestion.aggression.label.charAt(0).toUpperCase() + aiSuggestion.aggression.label.slice(1)}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">Level: {aiSuggestion.aggression.level}/10</p>
                      <p className="text-sm text-gray-600"><strong>Evidence:</strong> {aiSuggestion.aggression.evidence}</p>
                      {aiSuggestion.aggression.needsReview && (
                        <p className="text-xs text-yellow-700 mt-1">⚠️ Low confidence - requires review</p>
                      )}
                    </div>

                    {/* Cyberbullying */}
                    <div className="p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">Cyberbullying</h3>
                        <ConfidenceBadge confidence={aiSuggestion.cyberbullying.confidence} />
                      </div>
                      <p className="text-lg font-medium text-purple-700 mb-1">
                        {aiSuggestion.cyberbullying.present ? 'Present' : 'Not Present'}
                      </p>
                      {aiSuggestion.cyberbullying.present && (
                        <>
                          <p className="text-sm text-gray-700 mb-1">
                            Type: {aiSuggestion.cyberbullying.type.charAt(0).toUpperCase() + aiSuggestion.cyberbullying.type.slice(1)}
                          </p>
                          <p className="text-sm text-gray-700 mb-2">Severity: {aiSuggestion.cyberbullying.severity}/10</p>
                          {aiSuggestion.cyberbullying.criteriaMatched && aiSuggestion.cyberbullying.criteriaMatched.length > 0 && (
                            <p className="text-xs text-gray-600 mb-2">
                              <strong>Criteria:</strong> {aiSuggestion.cyberbullying.criteriaMatched.join(', ')}
                            </p>
                          )}
                        </>
                      )}
                      <p className="text-sm text-gray-600"><strong>Evidence:</strong> {aiSuggestion.cyberbullying.evidence}</p>
                      {aiSuggestion.cyberbullying.needsReview && (
                        <p className="text-xs text-yellow-700 mt-1">⚠️ Low confidence - requires review</p>
                      )}
                    </div>

                    {/* Metadata */}
                    {aiSuggestion.metadata && (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <h3 className="font-bold text-gray-700 text-sm mb-2">Analysis Metadata</h3>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>Provider: {aiSuggestion.metadata.provider} v{aiSuggestion.metadata.version}</p>
                          {aiSuggestion.metadata.detectedLanguage && (
                            <p>Language: {aiSuggestion.metadata.detectedLanguage} 
                              {aiSuggestion.metadata.languageConfidence && 
                                ` (${Math.round(aiSuggestion.metadata.languageConfidence * 100)}% confidence)`}
                            </p>
                          )}
                          <p>Analyzed: {new Date(aiSuggestion.metadata.analyzedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {hasUnreviewedAI && (
                    <div className="mt-6 space-y-3">
                      <h3 className="font-bold text-purple-900">Your Decision:</h3>
                      
                      <Button
                        onClick={handleAcceptAI}
                        disabled={saving}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        ✅ Accept AI Suggestion
                      </Button>
                      
                      <Button
                        onClick={handleApplyAIToForm}
                        variant="outline"
                        className="w-full border-purple-300"
                      >
                        ✏️ Modify AI Suggestion
                      </Button>
                      
                      <Button
                        onClick={handleRejectAI}
                        disabled={saving}
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        ❌ Reject & Code Manually
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Column 3: Manual Coding Form */}
          <div className={aiSuggestion && showAISuggestion ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <Card>
              <CardBody>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {hasUnreviewedAI ? 'Manual Coding (Optional)' : 'Coding Form'}
                </h2>
                
                {hasUnreviewedAI && (
                  <Alert variant="info" className="mb-4">
                    You can click "Modify AI Suggestion" to load AI values into this form, then adjust as needed.
                  </Alert>
                )}
                
                <form onSubmit={hasUnreviewedAI ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
                  {/* Sentiment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sentiment
                    </label>
                    <select
                      value={sentiment}
                      onChange={(e) => setSentiment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={hasUnreviewedAI && !sentiment}
                    >
                      <option value="">-- Select Sentiment --</option>
                      {config.sentiment.values.map(val => (
                        <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{config.sentiment.note}</p>
                  </div>

                  {/* Aggression Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aggression Level (0-10)
                    </label>
                    <input
                      type="number"
                      min={config.aggression.level.min}
                      max={config.aggression.level.max}
                      value={aggressionLevel}
                      onChange={(e) => setAggressionLevel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0-10"
                      disabled={hasUnreviewedAI && !aggressionLevel}
                    />
                    <p className="mt-1 text-xs text-gray-500">{config.aggression.level.description}</p>
                  </div>

                  {/* Aggression Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aggression Category
                    </label>
                    <select
                      value={aggressionCategory}
                      onChange={(e) => setAggressionCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={hasUnreviewedAI && !aggressionCategory}
                    >
                      <option value="">-- Select Category --</option>
                      {config.aggression.category.values.map(val => (
                        <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cyberbullying Present */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cyberbullying Present
                    </label>
                    <select
                      value={cyberbullyingPresent}
                      onChange={(e) => setCyberbullyingPresent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={hasUnreviewedAI && !cyberbullyingPresent}
                    >
                      <option value="">-- Select --</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>

                  {/* Cyberbullying Type */}
                  {cyberbullyingPresent === 'true' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cyberbullying Type
                        </label>
                        <select
                          value={cyberbullyingType}
                          onChange={(e) => setCyberbullyingType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={hasUnreviewedAI && !cyberbullyingType}
                        >
                          <option value="">-- Select Type --</option>
                          {config.cyberbullying.type.values.map(val => (
                            <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cyberbullying Severity (0-10)
                        </label>
                        <input
                          type="number"
                          min={config.cyberbullying.severity.min}
                          max={config.cyberbullying.severity.max}
                          value={cyberbullyingSeverity}
                          onChange={(e) => setCyberbullyingSeverity(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="0-10"
                          disabled={hasUnreviewedAI && !cyberbullyingSeverity}
                        />
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Additional coding notes..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {notes.length}/2000 characters
                    </p>
                  </div>

                  {/* Confidence */}
                  {!hasUnreviewedAI && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confidence Level
                      </label>
                      <select
                        value={confidence}
                        onChange={(e) => setConfidence(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {config.confidence.values.map(val => (
                          <option key={val} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {hasUnreviewedAI ? (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        onClick={handleModifyAI}
                        disabled={saving || !sentiment || !aggressionCategory || !cyberbullyingPresent}
                        className="w-full"
                      >
                        {saving ? 'Saving...' : '💾 Save Modified Coding'}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        Fill in the form above and click to save your modifications
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving ? 'Saving...' : responseDetail.coded ? 'Update Coding' : 'Save Coding'}
                      </Button>
                      
                      {responseDetail.coded && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDelete}
                          disabled={saving}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Helper component for confidence badges
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 0.7) return 'bg-green-100 text-green-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLabel = () => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getColor()}`}>
      {getLabel()} ({Math.round(confidence * 100)}%)
    </span>
  );
}
