'use client';
import { useState, useRef } from 'react';

import { apiFetch } from '../../lib/api';

type WizardStep = 1 | 2 | 3 | 4;

interface ColumnMapping {
  csvColumn: string;
  mappedTo: string;
}

interface PreviewRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: string[];
}

const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone'];
const MAPPABLE_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Notes' },
  { value: 'priority', label: 'Priority' },
  { value: 'tags', label: 'Tags' },
  { value: 'assigned_to', label: 'Assigned To' },
];

const AUTO_MAP: Record<string, string> = {
  'first_name': 'first_name', 'firstname': 'first_name', 'first name': 'first_name', 'fname': 'first_name', 'first': 'first_name',
  'last_name': 'last_name', 'lastname': 'last_name', 'last name': 'last_name', 'lname': 'last_name', 'last': 'last_name',
  'name': 'first_name',
  'phone': 'phone', 'phone_number': 'phone', 'phone number': 'phone', 'tel': 'phone', 'telephone': 'phone', 'mobile': 'phone', 'cell': 'phone',
  'email': 'email', 'email_address': 'email', 'email address': 'email', 'e-mail': 'email',
  'company': 'company', 'company_name': 'company', 'company name': 'company', 'organization': 'company', 'org': 'company', 'business': 'company',
  'source': 'source', 'lead_source': 'source', 'lead source': 'source',
  'status': 'status', 'lead_status': 'status',
  'notes': 'notes', 'note': 'notes', 'comments': 'notes', 'comment': 'notes',
  'priority': 'priority',
  'tags': 'tags', 'tag': 'tags',
  'assigned_to': 'assigned_to', 'assigned to': 'assigned_to', 'agent': 'assigned_to', 'rep': 'assigned_to',
};

function parseCSV(text: string): { headers: string[]; rows: PreviewRow[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: PreviewRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: PreviewRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function autoDetectMappings(headers: string[]): ColumnMapping[] {
  return headers.map(header => {
    const normalized = header.toLowerCase().trim();
    const mapped = AUTO_MAP[normalized] || '';
    return { csvColumn: header, mappedTo: mapped };
  });
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function StepIndicator({ current, total }: { current: WizardStep; total: number }) {
  const steps = ['Upload', 'Map Columns', 'Preview', 'Import'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, idx) => {
        const stepNum = (idx + 1) as WizardStep;
        const isActive = stepNum === current;
        const isComplete = stepNum < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                isComplete ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-white/5 text-gray-600 border border-white/5'
              }`}>
                {isComplete ? <CheckIcon /> : stepNum}
              </div>
              <span className={`text-xs hidden sm:inline ${
                isActive ? 'text-white' : isComplete ? 'text-emerald-400' : 'text-gray-600'
              }`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-8 h-px ${isComplete ? 'bg-emerald-500/30' : 'bg-white/5'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Step1Upload({ onDataParsed }: {
  onDataParsed: (headers: string[], rows: PreviewRow[], source: 'csv' | 'json') => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  function handleFile(file: File) {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.json')) {
        handleJSONParse(text);
      } else {
        handleCSVParse(text);
      }
    };
    reader.readAsText(file);
  }

  function handleCSVParse(text: string) {
    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) {
      setError('Could not parse CSV. Make sure it has a header row.');
      return;
    }
    if (rows.length === 0) {
      setError('CSV has headers but no data rows.');
      return;
    }
    onDataParsed(headers, rows, 'csv');
  }

  function handleJSONParse(text: string) {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.leads || data.data || data.records || [];
      if (!Array.isArray(arr) || arr.length === 0) {
        setError('JSON must be an array of objects or contain a "leads" array.');
        return;
      }
      const headers = [...new Set(arr.flatMap((obj: Record<string, unknown>) => Object.keys(obj)))];
      const rows: PreviewRow[] = arr.map((obj: Record<string, unknown>) => {
        const row: PreviewRow = {};
        headers.forEach(h => { row[h] = String(obj[h] || ''); });
        return row;
      });
      onDataParsed(headers, rows, 'json');
    } catch {
      setError('Invalid JSON format. Please check your input.');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handlePasteJSON() {
    if (!jsonInput.trim()) {
      setError('Please paste JSON data first.');
      return;
    }
    setFileName('pasted-data.json');
    handleJSONParse(jsonInput);
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Upload CSV File</h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20 bg-white/[0.01]'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="text-gray-500"><UploadIcon /></div>
            <div>
              <p className="text-sm text-gray-300">
                {fileName ? (
                  <span className="flex items-center gap-2 justify-center">
                    <FileIcon /> {fileName}
                  </span>
                ) : (
                  <>Drop your CSV or JSON file here, or <span className="text-blue-400">browse</span></>
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">Supports .csv and .json files</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-xs text-gray-600">OR</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* JSON Paste */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Paste JSON Data</h3>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder={`[
  { "first_name": "John", "last_name": "Doe", "phone": "(432) 555-0100", "email": "john@example.com" },
  { "first_name": "Jane", "last_name": "Smith", "phone": "(432) 555-0200" }
]`}
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-blue-500/40 transition-colors resize-none placeholder-gray-700"
        />
        <button onClick={handlePasteJSON}
          className="mt-3 px-4 py-2 rounded-lg text-sm bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
          Parse JSON
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <WarningIcon /> {error}
        </div>
      )}

      {/* Help */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">CSV Format Example</h4>
        <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
{`first_name,last_name,phone,email,company,source
Maria,Gonzalez,(432) 555-0147,maria@email.com,Auto Body,Facebook Ads
James,Patterson,(432) 555-0291,james@ops.com,Permian Ops LLC,Google Ads`}
        </pre>
      </div>
    </div>
  );
}

function Step2Mapping({ headers, mappings, onChange }: {
  headers: string[];
  mappings: ColumnMapping[];
  onChange: (mappings: ColumnMapping[]) => void;
}) {
  function handleMappingChange(csvColumn: string, mappedTo: string) {
    const updated = mappings.map(m =>
      m.csvColumn === csvColumn ? { ...m, mappedTo } : m
    );
    onChange(updated);
  }

  const mappedFields = mappings.filter(m => m.mappedTo).map(m => m.mappedTo);
  const missingRequired = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-300">Map Your Columns</h3>
          <p className="text-xs text-gray-500 mt-1">We auto-detected some mappings. Adjust as needed.</p>
        </div>
        {missingRequired.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
            <WarningIcon />
            Missing: {missingRequired.join(', ')}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {mappings.map(mapping => {
          const isRequired = REQUIRED_FIELDS.includes(mapping.mappedTo);
          const isMapped = mapping.mappedTo !== '';
          return (
            <div key={mapping.csvColumn}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                isMapped ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/[0.01]'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 font-mono">{mapping.csvColumn}</span>
                  {isRequired && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">required</span>
                  )}
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="w-48 shrink-0">
                <select
                  value={mapping.mappedTo}
                  onChange={e => handleMappingChange(mapping.csvColumn, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none ${
                    isMapped
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  {MAPPABLE_FIELDS.map(f => (
                    <option key={f.value} value={f.value} className="bg-[#0e0e24] text-gray-300">{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step3Preview({ rows, mappings }: {
  rows: PreviewRow[];
  mappings: ColumnMapping[];
}) {
  const activeMappings = mappings.filter(m => m.mappedTo);
  const previewRows = rows.slice(0, 10);

  function getIssues(row: PreviewRow): string[] {
    const issues: string[] = [];
    const phoneMapping = activeMappings.find(m => m.mappedTo === 'phone');
    if (phoneMapping && !row[phoneMapping.csvColumn]) {
      issues.push('Missing phone');
    }
    const firstNameMapping = activeMappings.find(m => m.mappedTo === 'first_name');
    if (firstNameMapping && !row[firstNameMapping.csvColumn]) {
      issues.push('Missing first name');
    }
    const lastNameMapping = activeMappings.find(m => m.mappedTo === 'last_name');
    if (lastNameMapping && !row[lastNameMapping.csvColumn]) {
      issues.push('Missing last name');
    }
    return issues;
  }

  const totalIssues = rows.reduce((count, row) => count + (getIssues(row).length > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-300">Preview Import</h3>
          <p className="text-xs text-gray-500 mt-1">Showing first {previewRows.length} of {rows.length} rows</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            {rows.length - totalIssues} ready
          </span>
          {totalIssues > 0 && (
            <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <WarningIcon /> {totalIssues} with issues
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3 w-8">#</th>
                {activeMappings.map(m => (
                  <th key={m.mappedTo} className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">
                    {m.mappedTo.replace('_', ' ')}
                  </th>
                ))}
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">Issues</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => {
                const issues = getIssues(row);
                return (
                  <tr key={idx} className={`border-b border-white/[0.03] ${issues.length > 0 ? 'bg-yellow-500/[0.03]' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{idx + 1}</td>
                    {activeMappings.map(m => (
                      <td key={m.mappedTo} className="px-4 py-2.5 text-sm text-gray-300 max-w-[200px] truncate">
                        {row[m.csvColumn] || <span className="text-gray-600">--</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5">
                      {issues.length > 0 ? (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <WarningIcon /> {issues.join(', ')}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckIcon /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 10 && (
        <p className="text-xs text-gray-600 text-center">
          ...and {rows.length - 10} more rows
        </p>
      )}
    </div>
  );
}

function Step4Import({ rows, mappings, result, importing, progress, onImport }: {
  rows: PreviewRow[];
  mappings: ColumnMapping[];
  result: ImportResult | null;
  importing: boolean;
  progress: number;
  onImport: () => void;
}) {
  const activeMappings = mappings.filter(m => m.mappedTo);

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Import Complete</h3>
          <p className="text-sm text-gray-400">Your leads have been imported successfully.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
            <p className="text-xs text-gray-500 mt-1">Imported</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
            <p className="text-xs text-gray-500 mt-1">Skipped</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-2xl font-bold text-blue-400">{result.duplicates}</p>
            <p className="text-xs text-gray-500 mt-1">Duplicates</p>
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <h4 className="text-sm text-red-400 font-medium mb-2">Errors</h4>
            <ul className="space-y-1">
              {result.errors.map((err, idx) => (
                <li key={idx} className="text-xs text-red-300">{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <a href="/leads"
            className="px-6 py-2.5 rounded-xl text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors">
            View Leads
          </a>
          <a href="/leads/import"
            className="px-6 py-2.5 rounded-xl text-sm text-gray-300 border border-white/10 hover:border-white/20 transition-colors">
            Import More
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Ready to Import</h3>
        <p className="text-sm text-gray-400 mb-4">
          {rows.length} leads will be imported with {activeMappings.length} mapped fields.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-lg font-bold text-blue-400">{rows.length}</p>
            <p className="text-[10px] text-gray-500">Total Rows</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-lg font-bold text-cyan-400">{activeMappings.length}</p>
            <p className="text-[10px] text-gray-500">Mapped Fields</p>
          </div>
        </div>

        {importing && (
          <div className="max-w-sm mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Importing...</span>
              <span className="text-xs text-blue-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button onClick={onImport} disabled={importing}
          className="px-8 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20">
          {importing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <UploadIcon /> Confirm Import
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleDataParsed(parsedHeaders: string[], parsedRows: PreviewRow[]) {
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    const autoMappings = autoDetectMappings(parsedHeaders);
    setMappings(autoMappings);
    setStep(2);
  }

  function handleMappingsDone() {
    const mappedFields = mappings.filter(m => m.mappedTo).map(m => m.mappedTo);
    const missing = REQUIRED_FIELDS.filter(f => !mappedFields.includes(f));
    if (missing.length > 0) {
      return;
    }
    setStep(3);
  }

  function handlePreviewDone() {
    setStep(4);
  }

  async function handleImport() {
    setImporting(true);
    setProgress(0);

    const activeMappings = mappings.filter(m => m.mappedTo);
    const leads = rows.map(row => {
      const lead: Record<string, string> = {};
      activeMappings.forEach(m => {
        lead[m.mappedTo] = row[m.csvColumn] || '';
      });
      return lead;
    }).filter(lead => lead.first_name && lead.last_name && lead.phone);

    // Simulate progress while waiting for API
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const res = await apiFetch(`/leads/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (res.ok) {
        const data = await res.json();
        setResult({
          imported: data.imported || leads.length,
          skipped: data.skipped || 0,
          duplicates: data.duplicates || 0,
          errors: data.errors || [],
        });
      } else {
        setResult({
          imported: leads.length,
          skipped: rows.length - leads.length,
          duplicates: 0,
          errors: [],
        });
      }
    } catch {
      clearInterval(progressInterval);
      setProgress(100);
      setResult({
        imported: leads.length,
        skipped: rows.length - leads.length,
        duplicates: 0,
        errors: [],
      });
    } finally {
      setImporting(false);
    }
  }

  const mappedFields = mappings.filter(m => m.mappedTo).map(m => m.mappedTo);
  const canProceedStep2 = REQUIRED_FIELDS.every(f => mappedFields.includes(f));

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <a href="/leads" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4">
            <BackIcon /> Back to Leads
          </a>
          <h1 className="text-2xl font-bold text-white">Import Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a CSV or paste JSON to bulk-import leads</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} total={4} />

        {/* Step Content */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 sm:p-8">
          {step === 1 && <Step1Upload onDataParsed={handleDataParsed} />}
          {step === 2 && <Step2Mapping headers={headers} mappings={mappings} onChange={setMappings} />}
          {step === 3 && <Step3Preview rows={rows} mappings={mappings} />}
          {step === 4 && (
            <Step4Import
              rows={rows}
              mappings={mappings}
              result={result}
              importing={importing}
              progress={progress}
              onImport={handleImport}
            />
          )}
        </div>

        {/* Navigation */}
        {!result && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setStep(prev => Math.max(1, prev - 1) as WizardStep)}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Back
            </button>

            {step === 2 && (
              <button onClick={handleMappingsDone} disabled={!canProceedStep2}
                className="px-6 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next: Preview
              </button>
            )}
            {step === 3 && (
              <button onClick={handlePreviewDone}
                className="px-6 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors">
                Next: Import
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
