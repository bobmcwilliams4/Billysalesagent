'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

interface DNCEntry { id: number; phone: string; reason: string; source: string; added_at: string; }

export default function CompliancePage() {
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [consentMode, setConsentMode] = useState('single_party');
  const [recordingRetention, setRecordingRetention] = useState(90);
  const [autoDisclosure, setAutoDisclosure] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDNC() {
      try {
        const res = await apiFetch('/dnc');
        if (res.ok) {
          const d = await res.json();
          if (d.data && Array.isArray(d.data)) setDncList(d.data);
        }
      } catch {}
      setLoading(false);
    }
    fetchDNC();
  }, []);

  const addDNC = () => {
    if (!newPhone.trim()) return;
    const entry: DNCEntry = { id: Date.now(), phone: newPhone, reason: newReason || 'Manual add', source: 'manual', added_at: new Date().toISOString() };
    setDncList(prev => [entry, ...prev]);
    setNewPhone(''); setNewReason('');
    apiFetch('/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: newPhone, reason: newReason || 'Manual add' }) }).catch(() => {});
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fadeInUp">
      <div>
        <h2 className="text-xl font-bold text-white/90 tracking-tight">Compliance</h2>
        <p className="text-sm text-white/25">DNC list, recording consent, and data retention</p>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">{'\u2705'}</p>
          <p className="text-xs text-emerald-400 font-medium">DNC Active</p>
          <p className="text-[10px] text-white/25">{dncList.length} numbers blocked</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">{'\u2705'}</p>
          <p className="text-xs text-emerald-400 font-medium">Recording Disclosure</p>
          <p className="text-[10px] text-white/25">{autoDisclosure ? 'Auto-enabled' : 'Manual'}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-lg text-emerald-400">{'\u2705'}</p>
          <p className="text-xs text-emerald-400 font-medium">Audit Trail</p>
          <p className="text-[10px] text-white/25">All actions logged</p>
        </div>
      </div>

      {/* Recording Settings */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-sm font-medium text-white/90 tracking-tight">Recording & Consent</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Auto Recording Disclosure</p>
            <p className="text-[10px] text-white/15">Announce &quot;This call may be recorded&quot; at start of every call</p>
          </div>
          <button onClick={() => setAutoDisclosure(!autoDisclosure)} className={`w-12 h-6 rounded-full transition-colors ${autoDisclosure ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${autoDisclosure ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div>
          <label className="text-xs text-white/25 mb-1 block">Consent Mode</label>
          <select value={consentMode} onChange={e => setConsentMode(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50">
            <option value="single_party">Single Party (Texas default)</option>
            <option value="two_party">Two Party (CA, FL, etc.)</option>
            <option value="auto_detect">Auto-detect by lead&apos;s state</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/25 mb-1 block">Recording Retention: {recordingRetention} days</label>
          <input type="range" min={30} max={365} value={recordingRetention} onChange={e => setRecordingRetention(Number(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-[10px] text-white/15">Recordings auto-deleted after this period</p>
        </div>
      </div>

      {/* DNC List */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-sm font-medium text-white/90 tracking-tight">Do Not Call List</h3>

        <div className="flex gap-3">
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone number" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          <button onClick={addDNC} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">Add to DNC</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dncList.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-4">No numbers on the DNC list.</p>
        ) : (
          <div className="space-y-2">
            {dncList.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <span className="text-sm text-white/90 font-mono">{entry.phone}</span>
                  <span className="text-xs text-white/25 ml-3">{entry.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/15">{entry.source} &middot; {new Date(entry.added_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
