'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { apiFetch } from '../../lib/api';

interface DNCEntry { id: number; phone: string; reason: string; source: string; added_at: string; }

const TWO_PARTY_CONSENT_STATES = [
  { code: 'CA', name: 'California' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'FL', name: 'Florida' },
  { code: 'IL', name: 'Illinois' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MT', name: 'Montana' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'WA', name: 'Washington' },
];

const RETENTION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '365 days' },
];

export default function CompliancePage() {
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [consentMode, setConsentMode] = useState('single_party');
  const [recordingRetention, setRecordingRetention] = useState(90);
  const [autoDisclosure, setAutoDisclosure] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Two-party consent states
  const [twoPartyStates, setTwoPartyStates] = useState<string[]>(
    TWO_PARTY_CONSENT_STATES.map(s => s.code)
  );

  // Calling hours
  const [callingHoursStart, setCallingHoursStart] = useState('09:00');
  const [callingHoursEnd, setCallingHoursEnd] = useState('20:00');
  const [callingTimezone, setCallingTimezone] = useState('America/Chicago');

  // Import DNC file ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dncRes, settingsRes] = await Promise.all([
          apiFetch('/dnc'),
          apiFetch('/settings'),
        ]);
        if (dncRes.ok) {
          const d = await dncRes.json();
          if (d.data && Array.isArray(d.data)) setDncList(d.data);
        }
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          const settings = typeof s.settings === 'string' ? JSON.parse(s.settings) : (s.settings || {});
          if (settings.auto_disclosure !== undefined) setAutoDisclosure(settings.auto_disclosure);
          if (settings.consent_mode) setConsentMode(settings.consent_mode);
          if (settings.recording_retention) setRecordingRetention(settings.recording_retention);
          if (settings.two_party_states && Array.isArray(settings.two_party_states)) setTwoPartyStates(settings.two_party_states);
          if (settings.compliance_calling_hours) {
            if (settings.compliance_calling_hours.start) setCallingHoursStart(settings.compliance_calling_hours.start);
            if (settings.compliance_calling_hours.end) setCallingHoursEnd(settings.compliance_calling_hours.end);
            if (settings.compliance_calling_hours.timezone) setCallingTimezone(settings.compliance_calling_hours.timezone);
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, []);

  const addDNC = () => {
    if (!newPhone.trim()) return;
    const entry: DNCEntry = { id: Date.now(), phone: newPhone, reason: newReason || 'Manual add', source: 'manual', added_at: new Date().toISOString() };
    setDncList(prev => [entry, ...prev]);
    setNewPhone(''); setNewReason('');
    apiFetch('/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: newPhone, reason: newReason || 'Manual add' }) }).catch(() => {});
  };

  const handleImportDNC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const imported: DNCEntry[] = [];
      for (const line of lines) {
        const parts = line.split(',');
        const phone = parts[0]?.trim();
        if (!phone || phone.toLowerCase() === 'phone') continue; // skip header
        const reason = parts[1]?.trim() || 'Imported from CSV';
        imported.push({ id: Date.now() + Math.random(), phone, reason, source: 'csv_import', added_at: new Date().toISOString() });
      }
      if (imported.length > 0) {
        setDncList(prev => [...imported, ...prev]);
        // Bulk send to API
        apiFetch('/dnc/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: imported.map(e => ({ phone: e.phone, reason: e.reason })) }),
        }).catch(() => {});
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTwoPartyState = (code: string) => {
    setTwoPartyStates(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  };

  const saveComplianceSettings = async () => {
    setSaving(true);
    try {
      await apiFetch('/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_disclosure: autoDisclosure,
          consent_mode: consentMode,
          recording_retention: recordingRetention,
          two_party_states: twoPartyStates,
          compliance_calling_hours: {
            start: callingHoursStart,
            end: callingHoursEnd,
            timezone: callingTimezone,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/settings" className="text-white/25 hover:text-white/60 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <h2 className="text-xl font-bold text-white/90 tracking-tight">Compliance</h2>
          </div>
          <p className="text-sm text-white/25">DNC list, recording consent, two-party consent, calling hours, and data retention</p>
        </div>
        <button onClick={saveComplianceSettings} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-xs text-emerald-400 font-medium mt-1">DNC Active</p>
          <p className="text-lg font-bold text-emerald-400">{dncList.length}</p>
          <p className="text-[10px] text-white/25">numbers blocked</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-xs text-emerald-400 font-medium mt-1">Recording Disclosure</p>
          <p className="text-lg font-bold text-emerald-400">{autoDisclosure ? 'ON' : 'OFF'}</p>
          <p className="text-[10px] text-white/25">{autoDisclosure ? 'Auto-enabled' : 'Manual'}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
          <p className="text-xs text-blue-400 font-medium mt-1">Two-Party States</p>
          <p className="text-lg font-bold text-blue-400">{twoPartyStates.length}</p>
          <p className="text-[10px] text-white/25">states enforced</p>
        </div>
      </div>

      {/* Recording Settings */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-sm font-medium text-white/90 tracking-tight">Recording & Consent</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Announce Recording at Call Start</p>
            <p className="text-[10px] text-white/15">Plays &quot;This call may be recorded&quot; disclosure automatically</p>
          </div>
          <button onClick={() => setAutoDisclosure(!autoDisclosure)} className={`w-12 h-6 rounded-full transition-colors ${autoDisclosure ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoDisclosure ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="text-xs text-white/25 mb-1 block">Consent Mode</label>
          <select value={consentMode} onChange={e => setConsentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50">
            <option value="single_party" className="bg-gray-900">Single Party (Texas default)</option>
            <option value="two_party" className="bg-gray-900">Two Party (all calls)</option>
            <option value="auto_detect" className="bg-gray-900">Auto-detect by lead&apos;s state</option>
          </select>
          <p className="text-[10px] text-white/15 mt-1">Auto-detect uses the lead&apos;s area code to determine consent requirements</p>
        </div>

        <div>
          <label className="text-xs text-white/25 mb-1 block">Data Retention Period</label>
          <select value={recordingRetention} onChange={e => setRecordingRetention(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50">
            {RETENTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-white/15 mt-1">Recordings and transcripts auto-deleted after this period</p>
        </div>
      </div>

      {/* Two-Party Consent States */}
      <div className="glass-panel p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-white/90 tracking-tight">Two-Party Consent States</h3>
          <p className="text-[10px] text-white/15 mt-1">When consent mode is &quot;auto-detect&quot;, calls to leads in these states will include a recording disclosure. Check all states where two-party consent applies.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TWO_PARTY_CONSENT_STATES.map(state => {
            const checked = twoPartyStates.includes(state.code);
            return (
              <label
                key={state.code}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTwoPartyState(state.code)}
                  className="w-4 h-4 rounded accent-blue-500 bg-white/5 border-white/20"
                />
                <div>
                  <span className="text-sm text-white/80">{state.name}</span>
                  <span className="text-[10px] text-white/25 ml-2">({state.code})</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Calling Hours */}
      <div className="glass-panel p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-white/90 tracking-tight">Calling Hours</h3>
          <p className="text-[10px] text-white/15 mt-1">Restrict outbound calls to these hours to comply with TCPA and state regulations</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/25 mb-1 block">Start Time</label>
            <input
              type="time"
              value={callingHoursStart}
              onChange={e => setCallingHoursStart(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/25 mb-1 block">End Time</label>
            <input
              type="time"
              value={callingHoursEnd}
              onChange={e => setCallingHoursEnd(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/25 mb-1 block">Timezone</label>
          <select
            value={callingTimezone}
            onChange={e => setCallingTimezone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50"
          >
            <option value="America/Chicago" className="bg-gray-900">Central (America/Chicago)</option>
            <option value="America/New_York" className="bg-gray-900">Eastern (America/New_York)</option>
            <option value="America/Denver" className="bg-gray-900">Mountain (America/Denver)</option>
            <option value="America/Los_Angeles" className="bg-gray-900">Pacific (America/Los_Angeles)</option>
          </select>
          <p className="text-[10px] text-white/15 mt-1">Calls outside these hours will be queued until the next allowed window</p>
        </div>

        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-4">
          <p className="text-xs text-amber-300 font-medium mb-1">TCPA Compliance</p>
          <p className="text-[11px] text-gray-400">Federal law prohibits unsolicited telemarketing calls before 8:00 AM or after 9:00 PM in the consumer&apos;s local time zone. Ensure your calling hours comply with both federal and state regulations.</p>
        </div>
      </div>

      {/* DNC List */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/90 tracking-tight">Do Not Call List</h3>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleImportDNC}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/25 transition-colors"
            >
              <svg className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import DNC List
            </button>
          </div>
        </div>

        <p className="text-[10px] text-white/15">Import a CSV file with phone numbers in the first column. Optional reason in the second column.</p>

        <div className="flex gap-3">
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" onKeyDown={e => e.key === 'Enter' && addDNC()} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" onKeyDown={e => e.key === 'Enter' && addDNC()} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          <button onClick={addDNC} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors whitespace-nowrap">Add to DNC</button>
        </div>

        {dncList.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-4">No numbers on the DNC list.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {dncList.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/90 font-mono">{entry.phone}</span>
                  <span className="text-xs text-white/25">{entry.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-white/25">{entry.source}</span>
                  <span className="text-[10px] text-white/15">{new Date(entry.added_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <p className="text-[10px] text-white/15">Changes take effect on the next call</p>
        <button onClick={saveComplianceSettings} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
