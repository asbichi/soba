import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText,
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Building2, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  Database
} from 'lucide-react';

interface PollingUnitWithWard {
  id: number;
  name: string;
  code: string;
  location?: string | null;
  wardId: number;
  wardName: string;
  wardCode: string;
  createdAt: string;
}

interface Ward {
  id: number;
  name: string;
  code: string;
}

interface AdminStats {
  totalWards: number;
  totalPollingUnits: number;
  totalResults: number;
  totalUsers: number;
  recentLogs?: any[];
}

interface CsvRowPreview {
  rawRowNumber: number;
  wardCode: string;
  wardName: string;
  puCode: string;
  puName: string;
  location: string;
  isValid: boolean;
  validationError?: string;
}

interface UploadSummary {
  success: boolean;
  message: string;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  wardsCreated: number;
  errors: Array<{ row: number; code?: string; error: string }>;
}

export function Admin() {
  const { user, dbUser } = useAuth();
  
  // Database Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Wards & Polling Units for Verification
  const [wards, setWards] = useState<Ward[]>([]);
  const [pollingUnits, setPollingUnits] = useState<PollingUnitWithWard[]>([]);
  const [loadingPUs, setLoadingPUs] = useState(false);
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('ALL');
  const [puSearchQuery, setPuSearchQuery] = useState('');

  // Bulk Upload State
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<CsvRowPreview[]>([]);
  const [detectedTotalRows, setDetectedTotalRows] = useState<number>(0);
  const [autoCreateWards, setAutoCreateWards] = useState<boolean>(true);
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadSummary | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [showErrorList, setShowErrorList] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Seed Demo Data State
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);
  const [seedMessage, setSeedMessage] = useState<string>('');

  // Load Initial Data
  useEffect(() => {
    fetchAdminOverview();
    fetchWards();
    fetchPollingUnits();
  }, [user]);

  const fetchAdminOverview = async () => {
    setLoadingStats(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchWards = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/wards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWards(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch wards', err);
    }
  };

  const fetchPollingUnits = async () => {
    setLoadingPUs(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/polling-units?withWard=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPollingUnits(data);
      }
    } catch (err) {
      console.error('Failed to fetch polling units', err);
    } finally {
      setLoadingPUs(false);
    }
  };

  // CSV Template Generation
  const downloadSampleTemplate = () => {
    const csvHeader = 'ward_code,ward_name,pu_code,pu_name,location\n';
    const sampleRows = [
      'WD-01,Dan Wata,PU-01-001,Dan Wata Primary School I,Opposite Village Square',
      'WD-01,Dan Wata,PU-01-002,Dan Wata Dispensary,Near Market Road',
      'WD-02,Kwassallo,PU-02-001,Kwassallo Town Hall,Central Junction',
      'WD-02,Kwassallo,PU-02-002,Kwassallo Primary School,Old Grazing Reserve Area',
      'WD-03,Maigana,PU-03-001,Maigana Civic Center,Near Post Office',
      'WD-07,Kinkiba,PU-07-001,Kinkiba Primary School,Village Center'
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'polling_units_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV on Client for Instant Pre-flight Validation
  const processCsvFile = (selectedFile: File) => {
    setUploadError('');
    setUploadResult(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please select a valid .csv file format.');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      Papa.parse<Record<string, any>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          setDetectedTotalRows(results.data.length);

          const parsedRows: CsvRowPreview[] = results.data.map((row, idx) => {
            // Flexible column normalization
            const clean: Record<string, string> = {};
            Object.keys(row).forEach((k) => {
              const cleanedKey = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
              clean[cleanedKey] = String(row[k] || '').trim();
            });

            const wardCode = clean['wardcode'] || clean['wardid'] || clean['wardno'] || '';
            const wardName = clean['wardname'] || clean['ward'] || '';
            const puCode = clean['pucode'] || clean['code'] || clean['pollingunitcode'] || clean['unitcode'] || '';
            const puName = clean['puname'] || clean['name'] || clean['pollingunitname'] || clean['unitname'] || '';
            const location = clean['location'] || clean['pulocation'] || clean['address'] || clean['description'] || '';

            let isValid = true;
            let validationError = '';

            if (!puCode) {
              isValid = false;
              validationError = 'Missing PU Code';
            } else if (!puName) {
              isValid = false;
              validationError = 'Missing PU Name';
            } else if (!wardCode && !wardName) {
              isValid = false;
              validationError = 'Missing Ward identifier';
            }

            return {
              rawRowNumber: idx + 2,
              wardCode,
              wardName,
              puCode,
              puName,
              location,
              isValid,
              validationError
            };
          });

          setPreviewRows(parsedRows);
        },
        error: (err) => {
          setUploadError(`Failed to parse CSV: ${err.message}`);
        }
      });
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCsvFile(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    setCsvContent('');
    setPreviewRows([]);
    setDetectedTotalRows(0);
    setUploadResult(null);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform Bulk Upload
  const submitBulkUpload = async () => {
    if (!file && !csvContent) {
      setUploadError('Please choose or drop a CSV file first.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        const textBlob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('file', textBlob, 'polling_units.csv');
      }
      formData.append('autoCreateWards', String(autoCreateWards));
      formData.append('updateExisting', String(updateExisting));

      const response = await fetch('/api/polling-units/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error || 'Server error occurred during upload.');
      } else {
        setUploadResult(data);
        // Refresh live stats and polling units directory
        fetchAdminOverview();
        fetchWards();
        fetchPollingUnits();
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Network communication error.');
    } finally {
      setUploading(false);
    }
  };

  // Demo Seed Data
  const seedDemoData = async () => {
    setSeedingLoading(true);
    setSeedMessage('');
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/seed-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(data.message || 'Demo data successfully initialized.');
        fetchAdminOverview();
        fetchWards();
        fetchPollingUnits();
      } else {
        setSeedMessage(`Notice: ${data.error}`);
      }
    } catch (err) {
      setSeedMessage('Network error triggering demo seed.');
    } finally {
      setSeedingLoading(false);
    }
  };

  // Filtered Polling Units for Verification Table
  const filteredPollingUnits = pollingUnits.filter((pu) => {
    const matchesWard =
      selectedWardFilter === 'ALL' ||
      pu.wardId.toString() === selectedWardFilter;

    const query = puSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      pu.code.toLowerCase().includes(query) ||
      pu.name.toLowerCase().includes(query) ||
      (pu.location && pu.location.toLowerCase().includes(query)) ||
      pu.wardName.toLowerCase().includes(query);

    return matchesWard && matchesSearch;
  });

  const validPreviewCount = previewRows.filter((r) => r.isValid).length;
  const invalidPreviewCount = previewRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Banner & Super Admin Verification */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Administration</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Super Admin Authorization
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Bulk upload and manage official polling units, monitor electoral wards, and review audit records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Download Sample CSV
          </button>
          <button
            onClick={() => {
              fetchAdminOverview();
              fetchWards();
              fetchPollingUnits();
            }}
            disabled={loadingPUs || loadingStats}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPUs ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Polling Units</span>
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">
            {loadingStats ? '...' : (stats?.totalPollingUnits ?? pollingUnits.length)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Configured for LGA</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Electoral Wards</span>
            <Layers className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">
            {loadingStats ? '...' : (stats?.totalWards ?? wards.length)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Wards registered</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Results Ingested</span>
            <FileCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">
            {loadingStats ? '...' : (stats?.totalResults ?? 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">PU returns recorded</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Account</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 mt-3 truncate">{dbUser?.name || 'Administrator'}</p>
          <p className="text-xs text-emerald-600 font-medium truncate mt-1">{dbUser?.email}</p>
        </div>
      </div>

      {/* Main Section: Bulk Polling Unit CSV Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bulk Polling Unit Ingestion</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload comma-separated values (.csv) containing ward codes, polling unit codes, names, and locations.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Instructions and Format Spec */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 text-sm">
            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Supported CSV Headers & Specifications
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3">
              The ingestion engine supports standard header variations. Ensure each row has at least the <strong>Polling Unit Code</strong> and <strong>Polling Unit Name</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">ward_code / ward_name:</span>
                <p className="text-slate-500 mt-1">e.g. <code className="text-indigo-600">WD-01</code> or <code className="text-indigo-600">Dan Wata</code>. Matches existing wards or creates them.</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">pu_code / code:</span>
                <p className="text-slate-500 mt-1">Unique unit code, e.g. <code className="text-indigo-600">PU-01-001</code>. Required.</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">pu_name / name & location:</span>
                <p className="text-slate-500 mt-1">e.g. <code className="text-indigo-600">Dan Wata Pri School</code>. Location is optional.</p>
              </div>
            </div>
          </div>

          {/* Ingestion Options */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-sm">
            <span className="font-semibold text-slate-800">Upload Configuration:</span>
            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoCreateWards}
                  onChange={(e) => setAutoCreateWards(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 text-xs sm:text-sm">Auto-create new wards if not found</span>
              </label>

              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 text-xs sm:text-sm">Update existing polling units if code matches</span>
              </label>
            </div>
          </div>

          {/* Drag & Drop File Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                : file
                ? 'border-emerald-400 bg-emerald-50/20'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className={`p-4 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {file ? <FileCheck className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>

              {file ? (
                <div>
                  <p className="text-base font-bold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB &bull; {detectedTotalRows} data rows detected
                  </p>
                  <p className="text-xs text-indigo-600 font-semibold mt-2">
                    Click or drag another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-base font-semibold text-slate-800">
                    Click to select or drag and drop your Polling Unit CSV
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts UTF-8 encoded .csv files up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File Selected Badge & Clear Button */}
          {file && (
            <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-xl text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold">{file.name}</span>
                <span className="text-slate-500">({detectedTotalRows} records ready)</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          )}

          {/* Client-Side Pre-Flight Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Data Preview & Validation</h4>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                    Showing first {Math.min(previewRows.length, 6)} of {detectedTotalRows} rows
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {validPreviewCount} Valid
                  </span>
                  {invalidPreviewCount > 0 && (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      {invalidPreviewCount} Issues
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">Row</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">PU Code</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">PU Name</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">Ward Code</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">Ward Name</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">Location</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {previewRows.slice(0, 6).map((row) => (
                      <tr key={row.rawRowNumber} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="px-4 py-2 font-mono text-slate-500">{row.rawRowNumber}</td>
                        <td className="px-4 py-2 font-mono font-semibold text-indigo-700">{row.puCode || '—'}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{row.puName || '—'}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{row.wardCode || '—'}</td>
                        <td className="px-4 py-2 text-slate-600">{row.wardName || '—'}</td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs">{row.location || '—'}</td>
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-600 font-semibold gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              {row.validationError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Upload Failed</p>
                <p className="mt-0.5 text-rose-700">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Upload Success Outcome Card */}
          {uploadResult && (
            <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-base">Bulk Upload Completed</h4>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">{uploadResult.message}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Created</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1">{uploadResult.importedCount}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Updated</span>
                  <p className="text-xl font-extrabold text-indigo-700 mt-1">{uploadResult.updatedCount}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Wards Added</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{uploadResult.wardsCreated}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Skipped</span>
                  <p className="text-xl font-extrabold text-slate-600 mt-1">{uploadResult.skippedCount}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Failed</span>
                  <p className={`text-xl font-extrabold mt-1 ${uploadResult.failedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {uploadResult.failedCount}
                  </p>
                </div>
              </div>

              {/* Error Details Accordion */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowErrorList(!showErrorList)}
                    className="flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {showErrorList ? 'Hide' : 'View'} {uploadResult.errors.length} Row Issues
                    {showErrorList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showErrorList && (
                    <div className="mt-3 border border-rose-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-rose-100 text-xs">
                        <thead className="bg-rose-50 text-rose-900 font-semibold">
                          <tr>
                            <th className="px-4 py-2 text-left">Row #</th>
                            <th className="px-4 py-2 text-left">Code</th>
                            <th className="px-4 py-2 text-left">Error Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {uploadResult.errors.map((err, i) => (
                            <tr key={i} className="hover:bg-rose-50/50">
                              <td className="px-4 py-1.5 font-mono text-slate-500">{err.row}</td>
                              <td className="px-4 py-1.5 font-mono font-medium text-slate-800">{err.code || '—'}</td>
                              <td className="px-4 py-1.5 text-rose-700">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {file && (
              <button
                type="button"
                onClick={clearSelectedFile}
                disabled={uploading}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              onClick={submitBulkUpload}
              disabled={uploading || (!file && !csvContent)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Ingestion...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Ingest {detectedTotalRows > 0 ? `${detectedTotalRows} Polling Units` : 'CSV File'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Database Verification Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Database Polling Units Directory
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Instantly verify uploaded units across all {wards.length} Soba LGA wards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Ward */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Ward:</span>
              <select
                value={selectedWardFilter}
                onChange={(e) => setSelectedWardFilter(e.target.value)}
                className="text-base sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 sm:py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Wards ({wards.length})</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id.toString()}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={puSearchQuery}
                onChange={(e) => setPuSearchQuery(e.target.value)}
                placeholder="Search code or name..."
                className="text-base sm:text-sm pl-9 pr-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Polling Units Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {loadingPUs ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Loading polling units...
            </div>
          ) : filteredPollingUnits.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No polling units found matching the selected filters. Use the CSV bulk uploader above to populate units.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[11px]">Unit Code</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[11px]">Polling Unit Name</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[11px]">Ward</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[11px]">Location Details</th>
                  <th className="px-5 py-3 text-right font-bold text-slate-600 uppercase tracking-wider text-[11px]">Record ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredPollingUnits.map((pu) => (
                  <tr key={pu.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap font-mono font-bold text-indigo-700">
                      {pu.code}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {pu.name}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {pu.wardName} ({pu.wardCode})
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {pu.location || <span className="text-slate-400 italic">Not specified</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right font-mono text-xs text-slate-400">
                      #{pu.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredPollingUnits.length} of {pollingUnits.length} registered Polling Units</span>
          <span>Soba Local Government Area Electoral Management</span>
        </div>
      </div>

      {/* Demo Seed Utility & Reset */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">System Demo Testing Seed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Need a quick demo dataset? Load default fictional wards, parties, and candidates for demonstration and testing.
            </p>
          </div>
          <button
            onClick={seedDemoData}
            disabled={seedingLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {seedingLoading ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
        {seedMessage && (
          <p className="text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {seedMessage}
          </p>
        )}
      </div>
    </div>
  );
}
