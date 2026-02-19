'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

interface DNCEntry { id: number; phone: string; reason: string; source: string; added_at: string; }

const SAMPLE_DNC: DNCEntry[] = [
  { id: 1, phone: '(432) 555-9999', reason: 'Requested removal', source: 'manual', added_at: '2026-02-15T10:00:00Z' },
  { id: 2, phone: '(432) 555-8888', reason: 'Threatened legal action', source: 'call', added_at: '2026-02-14T16:30:00Z' },
  { id: 3, phone: '(915) 555-7777', reason: 'Wrong number', source: 'agent', added_at: '2026-02-13T11:00:00Z' },
];

export default function CompliancePage() {
  const [dncList, setDncList] = useState<DNCEntry[]>(SAMPLE_DNC);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [consentMode, setConsentMode] = useState('single_party');
  const [recordingRetention, setRecordingRetention] = useState(90);
  const [autoDisclosure, setAutoDisclosure] = useState(true);

  useEffect(() => {
    apiFetch(`/dnc`).then(r => r.json()).then(d => { if (d.data?.length) setDncList(d.data); }).catch(() => {});
  }, []);

  const addDNC = () => {
    if (!newPhone.trim()) return;
    const entry: DNCEntry = { id: Date.now(), phone: newPhone, reason: newReason || 'Manual add', source: 'manual', added_at: new Date().toISOString() };
    setDncList(prev => [entry, ...prev]);
    setNewPhone(''); setNewReason('');
    apiFetch(`/dnc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: newPhone, reason: newReason || 'Manual add' }) }).catch(() => {});
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Compliance</h2>
        <p className="text-sm text-gray-500">DNC list, recording consent, and data retention</p>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">\u2705</p>
          <p className="text-xs text-emerald-400 font-medium">DNC Active</p>
          <p className="text-[10px] text-gray-500">{dncList.length} numbers blocked</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">\u2705</p>
          <p className="text-xs text-emerald-400 font-medium">Recording Disclosure</p>
          <p className="text-[10px] text-gray-500">{autoDisclosure ? 'Auto-enabled' : 'Manual'}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">\u2705</p>
          <p className="text-xs text-emerald-400 font-medium">Audit Trail</p>
          <p className="text-[10px] text-gray-500">All actions logged</p>
        </div>
      </div>

      {/* Recording Settings */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-sm font-medium text-white">Recording & Consent</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300">Auto Recording Disclosure</p>
            <p className="text-[10px] text-gray-600">Announce "This call may be recorded" at start of every call</p>
          </div>
          <button onClick={() => setAutoDisclosure(!autoDisclosure)} className={`w-12 h-6 rounded-full transition-colors ${autoDisclosure ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoDisclosure ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Consent Mode</label>
          <select value={consentMode} onChange={e => setConsentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
            <option value="single_party">Single Party (Texas default)</option>
            <option value="two_party">Two Party (CA, FL, etc.)</option>
            <option value="auto_detect">Auto-detect by lead's state</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Recording Retention: {recordingRetention} days</label>
          <input type="range" min={30} max={365} value={recordingRetention} onChange={e => setRecordingRetention(Number(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-[10px] text-gray-600">Recordings auto-deleted after this period</p>
        </div>
      </div>

      {/* DNC List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-sm font-medium text-white">Do Not Call List</h3>

        <div className="flex gap-3">
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <button onClick={addDNC} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">Add to DNC</button>
        </div>

        <div className="space-y-2">
          {dncList.map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <span className="text-sm text-white font-mono">{entry.phone}</span>
                <span className="text-xs text-gray-500 ml-3">{entry.reason}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-600">{entry.source} &middot; {new Date(entry.added_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
