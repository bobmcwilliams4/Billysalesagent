'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../lib/api';

interface Approval {
  id: string;
  change_type: string;
  description: string;
  details: string;
  status: string;
  requested_by: string;
  created_at: string;
  responded_at?: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  script_edit: { label: 'Script Change', icon: '\u{1F4DD}', color: '#F59E0B' },
  campaign_config: { label: 'Campaign Config', icon: '\u{1F4E3}', color: '#3B82F6' },
  billing: { label: 'Billing Change', icon: '\u{1F4B0}', color: '#EF4444' },
  integration: { label: 'New Integration', icon: '\u{1F50C}', color: '#8B5CF6' },
  customization: { label: 'Customization', icon: '\u{1F3A8}', color: '#06B6D4' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  calling: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  denied: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  expired: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

const SAMPLE_APPROVALS: Approval[] = [
  { id: '1', change_type: 'script_edit', description: 'Add home insurance questions to the qualification script', details: '{"before":"auto only","after":"auto + home + life"}', status: 'pending', requested_by: 'Billy', created_at: '2026-02-17T10:00:00Z' },
  { id: '2', change_type: 'campaign_config', description: 'Increase calling pace from 30/hr to 50/hr for Midland Auto campaign', details: '{"pacing_before":30,"pacing_after":50}', status: 'approved', requested_by: 'Billy', created_at: '2026-02-16T14:00:00Z', responded_at: '2026-02-16T14:05:00Z' },
  { id: '3', change_type: 'customization', description: 'Add cost-per-appointment widget to main dashboard', details: '{}', status: 'approved', requested_by: 'Billy', created_at: '2026-02-15T09:00:00Z', responded_at: '2026-02-15T09:02:00Z' },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>(SAMPLE_APPROVALS);

  useEffect(() => {
    apiFetch(`/commander/approvals`).then(r => r.json()).then(d => { if (d.data?.length) setApprovals(d.data); }).catch(() => {});
  }, []);

  const pending = approvals.filter(a => a.status === 'pending' || a.status === 'calling');
  const resolved = approvals.filter(a => a.status !== 'pending' && a.status !== 'calling');

  const manualApprove = async (id: string, status: 'approved' | 'denied') => {
    try {
      await apiFetch(`/commander/approvals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    } catch {}
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status, responded_at: new Date().toISOString() } : a));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Commander Approvals</h2>
        <p className="text-sm text-gray-500">Major changes require Commander approval via phone call to 432-269-3446</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-amber-400 mb-3">Pending ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(a => {
              const type = TYPE_LABELS[a.change_type] || { label: a.change_type, icon: '\u{2753}', color: '#6B7280' };
              const style = STATUS_STYLES[a.status] || STATUS_STYLES.pending;
              return (
                <div key={a.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{type.icon}</span>
                      <div>
                        <p className="text-sm text-white font-medium">{a.description}</p>
                        <p className="text-xs text-gray-500">{type.label} &middot; Requested by {a.requested_by} &middot; {new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${style.bg} ${style.text} border ${style.border}`}>{a.status.toUpperCase()}</span>
                  </div>
                  {a.status === 'calling' && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-xs text-blue-400">Calling Commander at 432-269-3446...</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => manualApprove(a.id, 'approved')} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors border border-emerald-500/20">Approve (Manual)</button>
                    <button onClick={() => manualApprove(a.id, 'denied')} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors border border-red-500/20">Deny</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Resolved</h3>
          <div className="space-y-2">
            {resolved.map(a => {
              const type = TYPE_LABELS[a.change_type] || { label: a.change_type, icon: '\u{2753}', color: '#6B7280' };
              const style = STATUS_STYLES[a.status] || STATUS_STYLES.expired;
              return (
                <div key={a.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span>{type.icon}</span>
                    <div>
                      <p className="text-sm text-gray-300">{a.description}</p>
                      <p className="text-[10px] text-gray-600">{type.label} &middot; {a.responded_at ? new Date(a.responded_at).toLocaleString() : ''}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${style.bg} ${style.text} border ${style.border}`}>{a.status.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && resolved.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No approval requests yet</p>
          <p className="text-sm text-gray-700 mt-2">The copilot will request approval for major changes</p>
        </div>
      )}
    </div>
  );
}
