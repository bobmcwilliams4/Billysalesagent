'use client';
import { useState, useEffect, useRef } from 'react';

import { apiFetch } from '../lib/api';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment_set' | 'converted' | 'lost' | 'dnc';
type ViewMode = 'list' | 'pipeline';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
  status: LeadStatus;
  source: string;
  priority: number;
  score?: number;
  assigned_to: string;
  notes: string;
  last_contacted: string;
  next_followup: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface ScoreBreakdown {
  engagement: number;
  recency: number;
  data_completeness: number;
  call_history: number;
  overall: number;
}

interface VerifyResult {
  verified: boolean;
  confidence: number;
  details: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  contacted: { label: 'Contacted', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  qualified: { label: 'Qualified', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  appointment_set: { label: 'Appointment Set', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  converted: { label: 'Converted', color: '#06D6A0', bg: 'rgba(6,214,160,0.15)' },
  lost: { label: 'Lost', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  dnc: { label: 'DNC', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

const SOURCE_OPTIONS = [
  'Facebook Ads', 'Google Ads', 'Referral', 'Cold Call', 'Website', 'Walk-In', 'Direct Mail', 'Other',
];

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function PriorityDots({ priority }: { priority: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: i < priority
              ? priority >= 8 ? '#EF4444' : priority >= 5 ? '#F59E0B' : '#3B82F6'
              : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  );
}

function LeadScore({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white/15 bg-white/[0.03] border border-white/[0.04]">
        --
      </span>
    );
  }
  let label: string;
  let color: string;
  let bg: string;
  if (score <= 30) {
    label = 'Cold';
    color = '#EF4444';
    bg = 'rgba(239,68,68,0.15)';
  } else if (score <= 60) {
    label = 'Warm';
    color = '#F59E0B';
    bg = 'rgba(245,158,11,0.15)';
  } else if (score <= 80) {
    label = 'Hot';
    color = '#10B981';
    bg = 'rgba(16,185,129,0.15)';
  } else {
    label = 'On Fire';
    color = '#059669';
    bg = 'rgba(5,150,105,0.15)';
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ color, backgroundColor: bg }}
    >
      {score >= 81 && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 16.09V13.5H8l4-7.59v4.59H14.5l-3.91 7.59z" />
        </svg>
      )}
      {score} - {label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  let gradientEnd: string;
  if (pct <= 30) gradientEnd = '#EF4444';
  else if (pct <= 60) gradientEnd = '#F59E0B';
  else if (pct <= 80) gradientEnd = '#10B981';
  else gradientEnd = '#059669';
  return (
    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, #EF4444 0%, #F59E0B 35%, #10B981 65%, ${gradientEnd} 100%)`,
          backgroundSize: '100% 100%',
        }}
      />
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AddLeadModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (lead: Lead) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', company: '',
    source: 'Website', status: 'new' as LeadStatus, notes: '', priority: 5,
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        onAdd(data.lead || {
          ...form,
          id: `lead_${Date.now()}`,
          assigned_to: 'Billy',
          last_contacted: '',
          next_followup: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [],
        });
      } else {
        onAdd({
          ...form,
          id: `lead_${Date.now()}`,
          assigned_to: 'Billy',
          last_contacted: '',
          next_followup: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tags: [],
        });
      }
    } catch {
      onAdd({
        ...form,
        id: `lead_${Date.now()}`,
        assigned_to: 'Billy',
        last_contacted: '',
        next_followup: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
      });
    } finally {
      setSaving(false);
      setForm({ first_name: '', last_name: '', phone: '', email: '', company: '', source: 'Website', status: 'new', notes: '', priority: 5 });
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/[0.04] bg-[#0e0e24]/95 backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-white/90">Add New Lead</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/90 transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">First Name *</label>
              <input
                type="text" required value={form.first_name}
                onChange={e => handleChange('first_name', e.target.value)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Last Name *</label>
              <input
                type="text" required value={form.last_name}
                onChange={e => handleChange('last_name', e.target.value)}
                className="input-glass w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Phone *</label>
              <input
                type="tel" required value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="(432) 555-0000"
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                className="input-glass w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Company</label>
            <input
              type="text" value={form.company}
              onChange={e => handleChange('company', e.target.value)}
              className="input-glass w-full"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Source</label>
              <select
                value={form.source} onChange={e => handleChange('source', e.target.value)}
                className="input-glass w-full appearance-none"
              >
                {SOURCE_OPTIONS.map(s => <option key={s} value={s} className="bg-surface-1">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Status</label>
              <select
                value={form.status} onChange={e => handleChange('status', e.target.value)}
                className="input-glass w-full appearance-none"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-surface-1">{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Priority (1-10)</label>
              <input
                type="number" min={1} max={10} value={form.priority}
                onChange={e => handleChange('priority', parseInt(e.target.value) || 5)}
                className="input-glass w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Notes</label>
            <textarea
              value={form.notes} onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="input-glass w-full resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white/90 border border-white/[0.04] hover:border-white/10 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-white/90 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving ? (
                <div className="skeleton h-4 w-4 rounded-full" />
              ) : (
                <PlusIcon />
              )}
              {saving ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadIntelligenceSection({ lead }: { lead: Lead }) {
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchScore() {
      setLoadingScore(true);
      try {
        const res = await apiFetch(`/leads/${lead.id}/score`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBreakdown(data);
        }
      } catch {
        // API unavailable
      } finally {
        if (!cancelled) setLoadingScore(false);
      }
    }
    fetchScore();
    return () => { cancelled = true; };
  }, [lead.id]);

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await apiFetch(`/leads/${lead.id}/verify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVerifyResult(data);
      }
    } catch {
      // API unavailable
    } finally {
      setVerifying(false);
    }
  }

  const scoreFactors = [
    { label: 'Engagement', key: 'engagement' as const, color: '#3B82F6' },
    { label: 'Recency', key: 'recency' as const, color: '#8B5CF6' },
    { label: 'Data Completeness', key: 'data_completeness' as const, color: '#10B981' },
    { label: 'Call History', key: 'call_history' as const, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Lead Intelligence</h4>

      {/* Score Bar */}
      <div className="stat-mini p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Lead Score</span>
          <span className="text-sm font-bold text-white/90">{lead.score ?? '--'} / 100</span>
        </div>
        <ScoreBar score={lead.score ?? 0} />
        <LeadScore score={lead.score} />
      </div>

      {/* Score Breakdown */}
      <div className="stat-mini p-4 space-y-3">
        <span className="text-xs text-white/40">Score Breakdown</span>
        {loadingScore ? (
          <div className="flex items-center gap-2 py-2">
            <div className="skeleton h-4 w-4 rounded-full" />
            <span className="text-xs text-white/25">Loading score data...</span>
          </div>
        ) : breakdown ? (
          <div className="space-y-2.5">
            {scoreFactors.map(({ label, key, color }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-white/40">{label}</span>
                  <span className="text-[11px] font-medium" style={{ color }}>{breakdown[key]}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${breakdown[key]}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/15 py-2">Score data unavailable</p>
        )}
      </div>

      {/* Verify Lead */}
      <button
        onClick={handleVerify}
        disabled={verifying}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 text-sm transition-colors disabled:opacity-50"
      >
        {verifying ? (
          <div className="skeleton h-4 w-4 rounded-full" />
        ) : (
          <ShieldIcon />
        )}
        {verifying ? 'Verifying...' : 'Verify Lead'}
      </button>
      {verifyResult && (
        <div className={`stat-mini p-3 space-y-1 border ${verifyResult.verified ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${verifyResult.verified ? 'text-emerald-400' : 'text-red-400'}`}>
              {verifyResult.verified ? 'Verified' : 'Not Verified'}
            </span>
            <span className="text-[10px] text-white/25">Confidence: {verifyResult.confidence}%</span>
          </div>
          {verifyResult.details && (
            <p className="text-[11px] text-white/40">{verifyResult.details}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SlideOverPanel({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  if (!lead) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} style={{ left: '-100vw', width: '100vw' }} />
      <div className="relative h-full border-l border-white/[0.04] bg-[#0a0a1a]/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a1a]/90 backdrop-blur-sm border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white/90">{lead.first_name} {lead.last_name}</h3>
              {lead.company && <p className="text-sm text-white/40">{lead.company}</p>}
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/90 transition-colors">
              <CloseIcon />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <StatusBadge status={lead.status} />
            <LeadScore score={lead.score} />
            <PriorityDots priority={lead.priority} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Lead Intelligence Section */}
          <LeadIntelligenceSection lead={lead} />

          <div className="space-y-3">
            <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Contact</h4>
            <div className="space-y-2">
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                <PhoneIcon /> {lead.phone}
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  <MailIcon /> {lead.email}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-mini p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Source</p>
                <p className="text-sm text-white/60">{lead.source}</p>
              </div>
              <div className="stat-mini p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Assigned</p>
                <p className="text-sm text-white/60">{lead.assigned_to || '--'}</p>
              </div>
              <div className="stat-mini p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Created</p>
                <p className="text-sm text-white/60">{formatDate(lead.created_at)}</p>
              </div>
              <div className="stat-mini p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Last Contact</p>
                <p className="text-sm text-white/60">{formatDate(lead.last_contacted)}</p>
              </div>
            </div>
          </div>

          {lead.notes && (
            <div className="space-y-3">
              <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Notes</h4>
              <p className="text-sm text-white/60 leading-relaxed stat-mini p-3">
                {lead.notes}
              </p>
            </div>
          )}

          {lead.tags.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-sm transition-colors">
                <PhoneIcon /> Call Now
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 text-sm transition-colors">
                <MailIcon /> Email
              </button>
              <a href={`/leads/${lead.id}`}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 text-white/60 border border-white/[0.04] hover:border-white/10 text-sm transition-colors">
                View Full Profile
                <ChevronRightIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left stat-mini hover:bg-white/[0.04] hover:border-white/10 p-3 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-white/90 group-hover:text-blue-300 transition-colors">
          {lead.first_name} {lead.last_name}
        </p>
        <PriorityDots priority={lead.priority} />
      </div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-white/40">{lead.phone}</p>
        <LeadScore score={lead.score} />
      </div>
      {lead.company && <p className="text-xs text-white/25 mb-2">{lead.company}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/15">{lead.source}</span>
        {lead.last_contacted && (
          <span className="text-[10px] text-white/15">{formatDate(lead.last_contacted)}</span>
        )}
      </div>
    </button>
  );
}

function PipelineView({ leads, onLeadClick }: { leads: Lead[]; onLeadClick: (lead: Lead) => void }) {
  const pipelineStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'appointment_set', 'converted', 'lost'];
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {pipelineStatuses.map(status => {
          const cfg = STATUS_CONFIG[status];
          const statusLeads = leads.filter(l => l.status === status);
          return (
            <div key={status} className="w-72 shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-sm font-medium text-white/60">{cfg.label}</span>
                <span className="ml-auto text-xs text-white/15 bg-white/5 px-2 py-0.5 rounded-full">
                  {statusLeads.length}
                </span>
              </div>
              <div className="space-y-2 p-2 rounded-xl bg-white/[0.01] border border-white/[0.04] min-h-[200px]">
                {statusLeads.length === 0 ? (
                  <p className="text-xs text-white/15 text-center py-8">No leads</p>
                ) : (
                  statusLeads.map(lead => (
                    <PipelineCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await apiFetch(`/leads?limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (data.leads && data.leads.length > 0) {
            setLeads(data.leads);
          }
        }
      } catch {
        // API unavailable
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = search === '' ||
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / perPage));
  const paginatedLeads = filteredLeads.slice((page - 1) * perPage, page * perPage);

  function handleAddLead(lead: Lead) {
    setLeads(prev => [lead, ...prev]);
  }

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white/60 animate-fadeInUp">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white/90">Leads</h1>
            <p className="text-sm text-white/25 mt-0.5">{leads.length} total leads</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/leads/import"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/60 border border-white/[0.04] hover:border-white/10 hover:text-white/90 transition-colors">
              <UploadIcon /> Import
            </a>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/90 bg-blue-600 hover:bg-blue-500 transition-colors">
              <PlusIcon /> Add Lead
            </button>
          </div>
        </div>

        {/* Status Summary Bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === 'all'
                ? 'border-white/20 bg-white/10 text-white/90'
                : 'border-white/[0.04] bg-white/[0.02] text-white/40 hover:border-white/10'
            }`}>
            All ({leads.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => { setStatusFilter(key as LeadStatus); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === key
                  ? 'border-white/20 bg-white/10 text-white/90'
                  : 'border-white/[0.04] bg-white/[0.02] text-white/40 hover:border-white/10'
              }`}
              style={statusFilter === key ? { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15` } : {}}>
              <span style={{ color: statusFilter === key ? cfg.color : undefined }}>
                {cfg.label} ({statusCounts[key] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Search + View Toggle */}
        <div className="filter-bar flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></div>
            <input
              type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, email, or company..."
              className="input-glass w-full pl-10 pr-4"
            />
          </div>
          <div className="flex items-center rounded-xl border border-white/[0.04] overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white/10 text-white/90' : 'text-white/25 hover:text-white/60'
              }`}>
              <ListIcon /> List
            </button>
            <button onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                viewMode === 'pipeline' ? 'bg-white/10 text-white/90' : 'text-white/25 hover:text-white/60'
              }`}>
              <KanbanIcon /> Pipeline
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="skeleton h-8 w-8 rounded-full" />
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
          <div className="glass-panel overflow-hidden">
            <div className="data-table overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3">Name</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3">Phone</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3 hidden md:table-cell">Email</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3">Status</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3 hidden md:table-cell">Score</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3 hidden lg:table-cell">Source</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3 hidden lg:table-cell">Last Contact</th>
                    <th className="text-left text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3 hidden sm:table-cell">Priority</th>
                    <th className="text-right text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-white/25 text-sm">
                        No leads found matching your filters
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map(lead => (
                      <tr key={lead.id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setSelectedLead(lead)}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-white/90">{lead.first_name} {lead.last_name}</p>
                            {lead.company && <p className="text-xs text-white/25">{lead.company}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-white/60">{lead.phone}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-white/40">{lead.email || '--'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <LeadScore score={lead.score} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-white/40">{lead.source}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-white/25">{formatDate(lead.last_contacted)}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <PriorityDots priority={lead.priority} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <a href={`tel:${lead.phone}`}
                              className="p-1.5 rounded-lg text-white/25 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              title="Call">
                              <PhoneIcon />
                            </a>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`}
                                className="p-1.5 rounded-lg text-white/25 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                title="Email">
                                <MailIcon />
                              </a>
                            )}
                            <a href={`/leads/${lead.id}`}
                              className="p-1.5 rounded-lg text-white/25 hover:text-white/90 hover:bg-white/10 transition-colors"
                              title="View Details">
                              <ChevronRightIcon />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredLeads.length > perPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-xs text-white/25">
                  Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, filteredLeads.length)} of {filteredLeads.length}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/40 border border-white/[0.04] hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeftIcon /> Previous
                  </button>
                  <span className="text-xs text-white/25 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/40 border border-white/[0.04] hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pipeline View */}
        {!loading && viewMode === 'pipeline' && (
          <PipelineView leads={filteredLeads} onLeadClick={setSelectedLead} />
        )}
      </div>

      {/* Slide-over Panel */}
      <SlideOverPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />

      {/* Add Lead Modal */}
      <AddLeadModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddLead} />
    </div>
  );
}
