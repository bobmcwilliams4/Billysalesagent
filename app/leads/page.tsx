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
  assigned_to: string;
  notes: string;
  last_contacted: string;
  next_followup: string;
  created_at: string;
  updated_at: string;
  tags: string[];
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

const SAMPLE_LEADS: Lead[] = [
  {
    id: 'lead_001', first_name: 'Maria', last_name: 'Gonzalez', phone: '(432) 555-0147',
    email: 'maria.gonzalez@email.com', company: 'Gonzalez Auto Body', status: 'new',
    source: 'Facebook Ads', priority: 8, assigned_to: 'Billy', notes: 'Interested in commercial auto policy',
    last_contacted: '', next_followup: '2026-02-18T10:00:00Z', created_at: '2026-02-17T08:30:00Z',
    updated_at: '2026-02-17T08:30:00Z', tags: ['commercial', 'auto'],
  },
  {
    id: 'lead_002', first_name: 'James', last_name: 'Patterson', phone: '(432) 555-0291',
    email: 'jpatterson@permianops.com', company: 'Permian Basin Operations LLC', status: 'contacted',
    source: 'Google Ads', priority: 9, assigned_to: 'Billy', notes: 'Needs workers comp for 45 employees',
    last_contacted: '2026-02-16T14:22:00Z', next_followup: '2026-02-19T09:00:00Z', created_at: '2026-02-14T11:00:00Z',
    updated_at: '2026-02-16T14:22:00Z', tags: ['workers-comp', 'oilfield'],
  },
  {
    id: 'lead_003', first_name: 'Rachel', last_name: 'Thompson', phone: '(432) 555-0183',
    email: 'rachel.t@gmail.com', company: '', status: 'qualified',
    source: 'Referral', priority: 7, assigned_to: 'Billy', notes: 'Referred by James Patterson. Needs home + auto bundle.',
    last_contacted: '2026-02-15T16:45:00Z', next_followup: '2026-02-20T11:00:00Z', created_at: '2026-02-13T09:15:00Z',
    updated_at: '2026-02-15T16:45:00Z', tags: ['bundle', 'personal'],
  },
  {
    id: 'lead_004', first_name: 'Carlos', last_name: 'Reyes', phone: '(432) 555-0374',
    email: 'creyes@reyestrucking.com', company: 'Reyes Trucking Inc', status: 'appointment_set',
    source: 'Cold Call', priority: 10, assigned_to: 'Billy', notes: 'Fleet of 12 trucks. Current policy expires March 1.',
    last_contacted: '2026-02-17T09:00:00Z', next_followup: '2026-02-18T14:00:00Z', created_at: '2026-02-10T13:30:00Z',
    updated_at: '2026-02-17T09:00:00Z', tags: ['commercial', 'fleet', 'trucking'],
  },
  {
    id: 'lead_005', first_name: 'Deborah', last_name: 'Whitfield', phone: '(432) 555-0528',
    email: 'dwhitfield@midlandisd.net', company: 'Midland ISD', status: 'converted',
    source: 'Website', priority: 6, assigned_to: 'Billy', notes: 'Signed home policy. Upsell auto next quarter.',
    last_contacted: '2026-02-12T10:30:00Z', next_followup: '', created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-12T10:30:00Z', tags: ['personal', 'home'],
  },
  {
    id: 'lead_006', first_name: 'Travis', last_name: 'McCoy', phone: '(432) 555-0619',
    email: 'travis.mccoy@outlook.com', company: 'McCoy Welding', status: 'lost',
    source: 'Facebook Ads', priority: 4, assigned_to: 'Billy', notes: 'Went with competitor. Price was deciding factor.',
    last_contacted: '2026-02-11T15:00:00Z', next_followup: '', created_at: '2026-02-05T14:00:00Z',
    updated_at: '2026-02-11T15:00:00Z', tags: ['commercial', 'welding'],
  },
  {
    id: 'lead_007', first_name: 'Sarah', last_name: 'Chen', phone: '(432) 555-0742',
    email: 'schen@basinmedical.com', company: 'Basin Medical Group', status: 'qualified',
    source: 'Referral', priority: 9, assigned_to: 'Billy', notes: 'Medical practice needs malpractice + property. 8 physicians.',
    last_contacted: '2026-02-16T11:00:00Z', next_followup: '2026-02-19T15:00:00Z', created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-16T11:00:00Z', tags: ['commercial', 'medical', 'malpractice'],
  },
  {
    id: 'lead_008', first_name: 'Robert', last_name: 'Hernandez', phone: '(432) 555-0855',
    email: 'robh@gmail.com', company: '', status: 'new',
    source: 'Google Ads', priority: 5, assigned_to: 'Billy', notes: 'Clicked ad for home insurance quote. No response yet.',
    last_contacted: '', next_followup: '2026-02-17T16:00:00Z', created_at: '2026-02-17T07:45:00Z',
    updated_at: '2026-02-17T07:45:00Z', tags: ['personal', 'home'],
  },
  {
    id: 'lead_009', first_name: 'Linda', last_name: 'Foster', phone: '(432) 555-0963',
    email: 'lfoster@fosterranch.com', company: 'Foster Ranch & Land', status: 'contacted',
    source: 'Direct Mail', priority: 7, assigned_to: 'Billy', notes: 'Ranch property 640 acres. Needs farm & ranch policy.',
    last_contacted: '2026-02-15T08:30:00Z', next_followup: '2026-02-18T08:00:00Z', created_at: '2026-02-08T12:00:00Z',
    updated_at: '2026-02-15T08:30:00Z', tags: ['commercial', 'ranch', 'farm'],
  },
  {
    id: 'lead_010', first_name: 'Mike', last_name: 'Sullivan', phone: '(432) 555-1077',
    email: '', company: 'Sullivan Plumbing', status: 'dnc',
    source: 'Cold Call', priority: 1, assigned_to: 'Billy', notes: 'Requested no further contact.',
    last_contacted: '2026-02-06T09:15:00Z', next_followup: '', created_at: '2026-02-06T09:00:00Z',
    updated_at: '2026-02-06T09:15:00Z', tags: [],
  },
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

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#0e0e24]/95 backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Add New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">First Name *</label>
              <input
                type="text" required value={form.first_name}
                onChange={e => handleChange('first_name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Last Name *</label>
              <input
                type="text" required value={form.last_name}
                onChange={e => handleChange('last_name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone *</label>
              <input
                type="tel" required value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="(432) 555-0000"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Company</label>
            <input
              type="text" value={form.company}
              onChange={e => handleChange('company', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source</label>
              <select
                value={form.source} onChange={e => handleChange('source', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
              >
                {SOURCE_OPTIONS.map(s => <option key={s} value={s} className="bg-[#0e0e24]">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={form.status} onChange={e => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#0e0e24]">{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority (1-10)</label>
              <input
                type="number" min={1} max={10} value={form.priority}
                onChange={e => handleChange('priority', parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={form.notes} onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

function SlideOverPanel({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  if (!lead) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} style={{ left: '-100vw', width: '100vw' }} />
      <div className="relative h-full border-l border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0a1a]/90 backdrop-blur-sm border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{lead.first_name} {lead.last_name}</h3>
              {lead.company && <p className="text-sm text-gray-400">{lead.company}</p>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <CloseIcon />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <StatusBadge status={lead.status} />
            <PriorityDots priority={lead.priority} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">Contact</h4>
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
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <p className="text-[10px] text-gray-500 uppercase">Source</p>
                <p className="text-sm text-gray-200">{lead.source}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <p className="text-[10px] text-gray-500 uppercase">Assigned</p>
                <p className="text-sm text-gray-200">{lead.assigned_to || '--'}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <p className="text-[10px] text-gray-500 uppercase">Created</p>
                <p className="text-sm text-gray-200">{formatDate(lead.created_at)}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <p className="text-[10px] text-gray-500 uppercase">Last Contact</p>
                <p className="text-sm text-gray-200">{formatDate(lead.last_contacted)}</p>
              </div>
            </div>
          </div>

          {lead.notes && (
            <div className="space-y-3">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider">Notes</h4>
              <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.03] border border-white/5 rounded-lg p-3">
                {lead.notes}
              </p>
            </div>
          )}

          {lead.tags.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider">Tags</h4>
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
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-sm transition-colors">
                <PhoneIcon /> Call Now
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 text-sm transition-colors">
                <MailIcon /> Email
              </button>
              <a href={`/leads/${lead.id}`}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 text-gray-300 border border-white/10 hover:border-white/20 text-sm transition-colors">
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
      className="w-full text-left rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 p-3 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
          {lead.first_name} {lead.last_name}
        </p>
        <PriorityDots priority={lead.priority} />
      </div>
      <p className="text-xs text-gray-400 mb-1">{lead.phone}</p>
      {lead.company && <p className="text-xs text-gray-500 mb-2">{lead.company}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">{lead.source}</span>
        {lead.last_contacted && (
          <span className="text-[10px] text-gray-600">{formatDate(lead.last_contacted)}</span>
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
                <span className="text-sm font-medium text-gray-300">{cfg.label}</span>
                <span className="ml-auto text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {statusLeads.length}
                </span>
              </div>
              <div className="space-y-2 p-2 rounded-xl bg-white/[0.01] border border-white/5 min-h-[200px]">
                {statusLeads.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-8">No leads</p>
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
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
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
        // Use sample data
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
    <div className="min-h-screen bg-[#0a0a1a] text-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">{leads.length} total leads</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/leads/import"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-colors">
              <UploadIcon /> Import
            </a>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors">
              <PlusIcon /> Add Lead
            </button>
          </div>
        </div>

        {/* Status Summary Bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => { setStatusFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === 'all'
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10'
            }`}>
            All ({leads.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => { setStatusFilter(key as LeadStatus); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === key
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10'
              }`}
              style={statusFilter === key ? { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15` } : {}}>
              <span style={{ color: statusFilter === key ? cfg.color : undefined }}>
                {cfg.label} ({statusCounts[key] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></div>
            <input
              type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, email, or company..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/40 transition-colors placeholder-gray-600"
            />
          </div>
          <div className="flex items-center rounded-xl border border-white/10 overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <ListIcon /> List
            </button>
            <button onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                viewMode === 'pipeline' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <KanbanIcon /> Pipeline
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">Name</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">Phone</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3 hidden md:table-cell">Email</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">Status</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3 hidden lg:table-cell">Source</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3 hidden lg:table-cell">Last Contact</th>
                    <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3 hidden sm:table-cell">Priority</th>
                    <th className="text-right text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500 text-sm">
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
                            <p className="text-sm font-medium text-white">{lead.first_name} {lead.last_name}</p>
                            {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300">{lead.phone}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-400">{lead.email || '--'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-gray-400">{lead.source}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-gray-500">{formatDate(lead.last_contacted)}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <PriorityDots priority={lead.priority} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <a href={`tel:${lead.phone}`}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              title="Call">
                              <PhoneIcon />
                            </a>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                title="Email">
                                <MailIcon />
                              </a>
                            )}
                            <a href={`/leads/${lead.id}`}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.01]">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, filteredLeads.length)} of {filteredLeads.length}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeftIcon /> Previous
                  </button>
                  <span className="text-xs text-gray-500 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
