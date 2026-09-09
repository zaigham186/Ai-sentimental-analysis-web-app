'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { api } from '@/lib/api';
import type { Admin, DataQuality } from '@/types';

/**
 * Export Page
 * Phase 11: Research Data Export
 * CRITICAL: Never export passwords, tokens, or secrets
 * CRITICAL: Support identity-linked and de-identified exports
 */

export default function AdminExportPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filter state
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
        setError(err.message || 'Failed to load export page');
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

  const handleExport = (
    type: 'participants' | 'responses' | 'codings' | 'research-dataset',
    format: 'csv' | 'xlsx',
    identityLinked: boolean = false
  ) => {
    setExporting(true);
    
    try {
      let url = '';
      const params: any = { format };
      
      if (condition) params.condition = condition;
      
      if (type === 'participants' || type === 'responses' || type === 'research-dataset') {
        params.identityLinked = identityLinked;
      }

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

      // Trigger download
      window.location.href = url;
      
      setTimeout(() => setExporting(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <AdminLayout admin={admin} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Research Data Export</h1>
          <p className="mt-2 text-gray-600">
            Export data for analysis in SPSS, R, Python, or Excel
          </p>
          <Alert variant="info" className="mt-4">
            <strong>ℹ️ Note:</strong> Final inferential statistical analysis should be performed using approved statistical packages. 
            This export system provides organized data for your analysis workflow.
          </Alert>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Data Quality Check */}
        {dataQuality && dataQuality.hasIssues && (
          <Alert variant="warning" className="mb-6">
            <div>
              <strong>⚠️ Data Quality Issues Detected ({dataQuality.issueCount})</strong>
              <ul className="mt-2 space-y-1">
                {dataQuality.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm">
                    • <strong>[{issue.severity.toUpperCase()}]</strong> {issue.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm">{dataQuality.note}</p>
            </div>
          </Alert>
        )}

        {/* Filter Options */}
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Export Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Conditions</option>
                  <option value="anonymous">Anonymous Only</option>
                  <option value="identifiable">Identifiable Only</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCondition('')}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Export Sections */}
        <div className="space-y-6">
          {/* Participants Export */}
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Participants Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Export participant demographics, condition, and status information
              </p>
              
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">De-identified Export</h3>
                    <p className="text-sm text-gray-600">Excludes names and usernames</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('participants', 'csv', false)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('participants', 'xlsx', false)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Identity-linked Export</h3>
                    <p className="text-sm text-gray-600">Includes participant names and demographics</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('participants', 'csv', true)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('participants', 'xlsx', true)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Responses Export */}
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Responses Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Export participant video responses with condition and video information
              </p>
              
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">De-identified Export</h3>
                    <p className="text-sm text-gray-600">Participant IDs only, no names</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('responses', 'csv', false)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('responses', 'xlsx', false)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Identity-linked Export</h3>
                    <p className="text-sm text-gray-600">Includes participant names and usernames</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('responses', 'csv', true)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('responses', 'xlsx', true)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Codings Export */}
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Codings Data</h2>
              <p className="text-sm text-gray-600 mb-4">
                Export sentiment, aggression, and cyberbullying codings
              </p>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Coding Export</h3>
                    <p className="text-sm text-gray-600">All coding data with coder information</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('codings', 'csv')}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('codings', 'xlsx')}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Combined Research Dataset */}
          <Card>
            <CardBody>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Combined Research Dataset</h2>
              <p className="text-sm text-gray-600 mb-4">
                Export complete dataset combining participants, videos, responses, and codings
              </p>
              <Alert variant="info" className="mb-4">
                <strong>Recommended for statistical analysis:</strong> This format combines all research data 
                in a single file, ready for import into SPSS, R, or Python.
              </Alert>
              
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">De-identified Export</h3>
                    <p className="text-sm text-gray-600">Research IDs only, suitable for publication</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('research-dataset', 'csv', false)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('research-dataset', 'xlsx', false)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Identity-linked Export</h3>
                    <p className="text-sm text-gray-600">Full dataset with participant identities</p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('research-dataset', 'csv', true)}
                      disabled={exporting}
                    >
                      📄 CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('research-dataset', 'xlsx', true)}
                      disabled={exporting}
                    >
                      📊 Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Security Notice */}
        <Alert variant="warning" className="mt-6">
          <strong>🔒 Security Notice:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Identity-linked exports contain sensitive participant information</li>
            <li>• Store exported files securely and follow institutional data protection policies</li>
            <li>• Do not share identity-linked files publicly or via unsecured channels</li>
            <li>• Use de-identified exports for publication and public sharing</li>
            <li>• All exports are logged for audit purposes</li>
          </ul>
        </Alert>
      </div>
    </AdminLayout>
  );
}
