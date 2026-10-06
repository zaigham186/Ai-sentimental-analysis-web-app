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
 * Provides 4 clean, accurate participant-level research datasets for supervisor and inspector review:
 * 1. Participant Data: Participant Name, Condition, Demographics & Study Progression
 * 2. Responses Data: Participant Name, Condition, Video Stimuli & Response Texts
 * 3. Coding Data: Participant Name, Condition, Video Stimuli, Responses & Qualitative/Quantitative Coding
 * 4. Combined Research Dataset: Primary master dataset uniting Participant Demographics + Responses + Coding
 * 
 * CORE RULES:
 * - Every record begins with: Participant Name, then Condition
 * - Followed by accurate responses and research fields
 * - ZERO participant IDs, zero internal MongoDB ObjectIds, zero technical hashes
 * - Clean, accurate data for each condition (Anonymous / Identifiable) without unrelated clutter
 * - Reflects the verified 60 participants from the research study
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
                Export clean, participant-level datasets for supervisor and inspector review, as well as statistical analysis in SPSS, R, Python, Stata, and Excel.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ 60 Verified Participants
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Participant Name &amp; Condition (No IDs)
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
                  <option value="">All Conditions (Complete 60 Participants Cohort)</option>
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
                      Starts with Name &amp; Condition
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">
                    Provides the <strong>complete research record for all 60 participants</strong>. Every record starts with <strong>Participant Name</strong> and <strong>Condition</strong>, followed by participant demographics, stimulus video information, full response text, response metrics, and qualitative/quantitative coding outcomes. Free of any participant IDs or unrelated clutter.
                  </p>

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 space-y-1">
                    <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                      <span>💡</span> Formatted for Supervisor / Inspector Review &amp; Statistical Analysis:
                    </div>
                    <div>
                      Starts with Participant Name and Condition, cleanly organized for each participant and stimulus video response.
                    </div>
                  </div>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Included Columns:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Condition', 'Gender', 'Age', 'University', 'Department',
                        'Video Number', 'Video Title', 'Response Text', 'Response Word Count',
                        'Response Time (Seconds)', 'Sentiment', 'Aggression Level (0-10)', 'Aggression Category',
                        'Cyberbullying Present', 'Cyberbullying Type', 'Cyberbullying Severity (0-10)',
                        'Coding Status', 'Coder Name', 'Submitted Date'
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
                      60 Participants
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Contains all <strong>60 participant records</strong> from the database. Every record starts with <strong>Participant Name</strong> and <strong>Condition</strong>, followed by gender, age, university, department, study status, consent verification, and total responses submitted/coded. Free of any database IDs.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Included Columns:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Condition', 'Gender', 'Age', 'University', 'Department',
                        'Study Status', 'Consent Given', 'Total Responses Submitted', 'Total Responses Coded',
                        'Registration Date', 'Completion Date'
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
                      Sequential Stimulus Responses
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Contains each participant&apos;s responses to the stimulus videos. Every row starts with <strong>Participant Name</strong> and <strong>Condition</strong>, followed by the video number, video title, full response text, word count, response time in seconds, coding status, and submission date. Zero database IDs.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Included Columns:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Condition', 'Video Number', 'Video Title', 'Response Text',
                        'Response Word Count', 'Response Time (Seconds)', 'Coding Status', 'Submitted Date'
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
                      Qualitative &amp; Quantitative Outcomes
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    Contains research-grade coding analysis. Starts with <strong>Participant Name</strong> and <strong>Condition</strong>, followed by video title, response text, sentiment, aggression level &amp; category, cyberbullying presence/type/severity, coding status, coder name, and coded date. Zero database IDs.
                  </p>

                  {/* Schema Preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Included Columns:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Participant Name', 'Condition', 'Video Number', 'Video Title', 'Response Text',
                        'Sentiment', 'Aggression Level (0-10)', 'Aggression Category', 'Cyberbullying Present',
                        'Cyberbullying Type', 'Cyberbullying Severity (0-10)', 'Coding Status', 'Coder Name', 'Coded Date'
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
              All four exported datasets reflect verified, complete database records from the 60 participants at Shaheed Benazir Bhutto Women University (SBBWU). 
              Ensure exported datasets are stored securely according to institutional data protection guidelines and approved empirical research protocols.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
