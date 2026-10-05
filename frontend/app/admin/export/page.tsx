'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api, authStorage } from '@/lib/api';
import type { Admin, DataQuality } from '@/types';

/**
 * Research Data Export Page
 * 
 * Provides 4 distinct, accurate participant-level research datasets:
 * 1. Participant Data: All participant records with complete database fields
 * 2. Responses Data: Participant Name + their responses (traceable, stimulus-ordered)
 * 3. Coding Data: Participant Name + Responses + Coding Results (accurately connected)
 * 4. Combined Research Dataset: Comprehensive analysis record (Participant + Responses + Coding)
 * 
 * Note: De-identified export options removed per research protocol requirements.
 * Participant names are consistently maintained across all four datasets.
 */

export default function AdminExportPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeExport, setActiveExport] = useState<string | null>(null);

  // Condition filter
  const [condition, setCondition] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [adminRes, qualityRes] = await Promise.all([
        api.admin.me(),
        api.admin.export.dataQuality()
      ]);

      setAdmin(adminRes.data);
      setDataQuality(qualityRes.data);
    } catch (err: any) {
      if (err.message === 'Admin authentication required') {
        router.push('/admin/login');
      } else {
        setError(err.message || 'Failed to load export dashboard');
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

  const handleExport = async (
    type: 'participants' | 'responses' | 'codings' | 'research-dataset',
    format: 'csv' | 'xlsx'
  ) => {
    const key = `${type}-${format}`;
    setActiveExport(key);
    setError(null);
    setSuccessMessage(null);

    try {
      const params: any = { format };
      if (condition) params.condition = condition;

      let url = '';
      switch (type) {
        case 'participants':
          url = api.admin.export.participants(params);
          break;
        case 'responses':
          url = api.admin.export.responses(params);
          break;
        case 'codings':
          url = api.admin.export.codings(params);
          break;
        case 'research-dataset':
          url = api.admin.export.researchDataset(params);
          break;
      }

      const token = authStorage.getAdminToken() || '';
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-admin-session'] = token;
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Export request failed' }));
        throw new Error(errorData.message || `Export failed with HTTP status ${response.status}`);
      }

      // Determine downloaded filename
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${type}_data_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage(`Successfully generated and downloaded: ${filename}`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Export download error:', err);
      setError(err.message || 'Export failed. Please check backend connection and try again.');
    } finally {
      setActiveExport(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                <h1 className="text-2xl font-bold text-gray-900">Research Data Export</h1>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Export accurate, participant-level datasets for empirical research in SPSS, R, Python, Stata, and Excel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Verified DB Records
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Consistent Participant ID
              </span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <Alert variant="error" className="shadow-sm">
            {error}
          </Alert>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✓</span>
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Data Quality Health Check Banner */}
        {dataQuality && dataQuality.hasIssues && (
          <Alert variant="warning" className="shadow-sm">
            <div>
              <strong className="text-sm font-semibold">⚠️ Data Quality Notice ({dataQuality.issueCount} Item{dataQuality.issueCount > 1 ? 's' : ''})</strong>
              <ul className="mt-2 space-y-1 text-xs text-amber-900">
                {dataQuality.issues?.map((issue, idx) => (
                  <li key={idx}>
                    • <span className="font-semibold capitalize">[{issue.severity || 'info'}]</span> {issue.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">{dataQuality.note}</p>
            </div>
          </Alert>
        )}

        {/* Filter Controls */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardBody className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="condition-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Condition Scope:
                </label>
                <select
                  id="condition-filter"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Experimental Conditions (Complete Cohort)</option>
                  <option value="anonymous">Anonymous Condition Only</option>
                  <option value="identifiable">Identifiable Condition Only</option>
                </select>
              </div>

              {condition && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Active Filter: <strong className="capitalize text-blue-600">{condition}</strong>
                  </span>
                  <button
                    onClick={() => setCondition('')}
                    className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ============================================================== */}
        {/* SECTION 4: COMBINED RESEARCH DATASET (FEATURED FIRST & PRIMARY) */}
        {/* ============================================================== */}
        <div className="relative rounded-2xl p-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md">
          <Card className="bg-white rounded-2xl border-0 overflow-hidden">
            <CardBody className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-2xl">📊</span>
                    <h2 className="text-xl font-bold text-gray-900">
                      Combined Research Dataset
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Primary Analysis File
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Participant + Responses + Coding
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">
                    Provides the <strong>complete research record for every participant</strong> by combining all stored database information: 
                    full participant demographics, sequential video responses, and qualitative/AI coding results. 
                    Accurately linked through unique participant and response identifiers with consistent participant names.
                  </p>

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 space-y-1">
                    <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                      <span>💡</span> Recommended for statistical packages (SPSS, R, Python, Stata):
                    </div>
                    <div>
                      Each row captures a participant&apos;s response linked to its coding result. If a participant has not completed responses, their record is preserved with null fields so no cohort data is lost.
                    </div>
                  </div>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Included Columns Preview:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Username', 'Age', 'Gender', 'University', 'Department',
                        'Condition', 'Status', 'Consent Date', 'Video Number', 'Video Title', 'Response Text',
                        'Word Count', 'Response Time', 'Sentiment', 'Aggression Level', 'Cyberbullying Present',
                        'Coding Confidence', 'Coder Name', 'Review Status'
                      ].map((col, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-700">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px] shrink-0 pt-2 lg:pt-0">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleExport('research-dataset', 'csv')}
                    disabled={activeExport !== null}
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm py-2.5"
                  >
                    {activeExport === 'research-dataset-csv' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating CSV...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📄</span> Export Combined CSV
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleExport('research-dataset', 'xlsx')}
                    disabled={activeExport !== null}
                    className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm py-2.5"
                  >
                    {activeExport === 'research-dataset-xlsx' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating Excel...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📊</span> Export Combined Excel
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* SECTIONS 1, 2, 3: INDIVIDUAL CORE RESEARCH DATASETS */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 gap-6">

          {/* SECTION 1: PARTICIPANT DATA */}
          <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👥</span>
                    <h2 className="text-lg font-bold text-gray-900">
                      Participant Data
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      Demographics &amp; Consent Only
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Contains <strong>all participant records</strong> from the database. Includes consistent participant names, usernames, age, gender, university, department, condition assignment, consent status, and study progression timestamps. Does not include response texts or coding outcomes.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Dataset Structure:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Username', 'Age', 'Gender', 'University', 'Department',
                        'Condition', 'Condition Assigned', 'Consent Given', 'Consent Date',
                        'Study Status', 'Completed Videos Count', 'Registered Date', 'Participant Database ID'
                      ].map((col, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-700">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[190px] shrink-0 pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('participants', 'csv')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    {activeExport === 'participants-csv' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating CSV...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📄</span> Export CSV
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('participants', 'xlsx')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {activeExport === 'participants-xlsx' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating Excel...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📊</span> Export Excel (.xlsx)
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* SECTION 2: RESPONSES DATA */}
          <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">💬</span>
                    <h2 className="text-lg font-bold text-gray-900">
                      Responses Data
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      Participant Name + Responses
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Contains the <strong>participant&apos;s name + their complete video responses</strong>. Every response is accurately associated with its participant and organized sequentially by stimulus video number. Preserves full response texts, word counts, response durations, and submission timestamps.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Dataset Structure:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Username', 'Condition', 'Video Number', 'Video Title',
                        'Video Topic', 'Response Text', 'Response Word Count', 'Response Character Length',
                        'Response Time (seconds)', 'Submitted At', 'Response Database ID'
                      ].map((col, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-700">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[190px] shrink-0 pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('responses', 'csv')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    {activeExport === 'responses-csv' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating CSV...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📄</span> Export CSV
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('responses', 'xlsx')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {activeExport === 'responses-xlsx' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating Excel...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📊</span> Export Excel (.xlsx)
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* SECTION 3: CODING DATA */}
          <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🏷️</span>
                    <h2 className="text-lg font-bold text-gray-900">
                      Coding Data
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      Participant + Response + Coding Results
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Correctly matches <strong>Participant &rarr; Response &rarr; Coding Result</strong>. Preserves actual coding dimensions from the database: sentiment classification, aggression level &amp; category, cyberbullying presence/type/severity, empirical indicators, coder credentials, confidence score, and supervisor review status.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Dataset Structure:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Username', 'Video Title', 'Response Text', 'Sentiment',
                        'Sentiment Score', 'Aggression Level', 'Aggression Category', 'Aggression Indicators',
                        'Cyberbullying Present', 'Cyberbullying Type', 'Cyberbullying Severity',
                        'Coding Confidence', 'Coding Notes', 'Coder Name', 'Review Status', 'Coded At'
                      ].map((col, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-700">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[190px] shrink-0 pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('codings', 'csv')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    {activeExport === 'codings-csv' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating CSV...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📄</span> Export CSV
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleExport('codings', 'xlsx')}
                    disabled={activeExport !== null}
                    className="w-full justify-center border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {activeExport === 'codings-xlsx' ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating Excel...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📊</span> Export Excel (.xlsx)
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Research Protocol Compliance Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 flex items-start gap-3">
          <span className="text-gray-400 text-base mt-0.5">🔒</span>
          <div className="space-y-1">
            <div className="font-semibold text-gray-700">
              Research Data Governance &amp; Ethical Protocol
            </div>
            <div>
              All four exported datasets reflect actual, verified database records from the research study at Shaheed Benazir Bhutto Women University (SBBWU). 
              Ensure exported datasets are stored securely according to institutional data protection guidelines and approved empirical research protocols.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
