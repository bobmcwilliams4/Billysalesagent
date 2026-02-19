'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { apiFetch } from '../lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Call {
  id: string;
  lead_name: string;
  lead_phone: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'failed' | 'no_answer' | 'in_progress' | 'voicemail' | 'busy';
  disposition: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  cost: number;
  transcript_summary: string | null;
  campaign_name: string | null;
  script_name: string | null;
  sentiment: string | null;
}

type DatePreset = 'today' | 'week' | 'month' | 'custom';
type StatusFilter = 'all' | 'completed' | 'failed' | 'no_answer' | 'in_progress' | 'voicemail' | 'busy';
type DirectionFilter = 'all' | 'inbound' | 'outbound';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  if (secs === 0) return '--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Call['status'] }) {
  const cfg: Record<Call['status'], { bg: string; text: string; border: string; label: string; pulse?: boolean }> = {
    completed:   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Completed' },
    failed:      { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Failed' },
    no_answer:   { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'No Answer' },
    in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'In Progress', pulse: true },
    voicemail:   { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Voicemail' },
    busy:        { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'Busy' },
  };
  const c = cfg[status] || cfg.completed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {c.label}
    </span>
  );
}

// ── Sentiment Badge ────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-white/15 text-xs">--</span>;

  const s = sentiment.toLowerCase();
  if (s === 'positive') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        Positive
      </span>
    );
  }
  if (s === 'negative') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400 border border-red-500/20">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-white/40 border border-white/[0.06]">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 12 8 12zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c-1.62 0-3-.5-3-1h6c0 .5-1.38 1-3 1z"/></svg>
      Neutral
    </span>
  );
}

// ── Two-Party Consent ──────────────────────────────────────────────────────

const TWO_PARTY_AREA_CODES: Record<string, string> = {
  // CA
  '209': 'CA', '213': 'CA', '310': 'CA', '323': 'CA', '341': 'CA', '350': 'CA', '408': 'CA', '415': 'CA',
  '424': 'CA', '442': 'CA', '510': 'CA', '530': 'CA', '559': 'CA', '562': 'CA', '619': 'CA', '626': 'CA',
  '628': 'CA', '650': 'CA', '657': 'CA', '661': 'CA', '669': 'CA', '707': 'CA', '714': 'CA', '747': 'CA',
  '760': 'CA', '805': 'CA', '818': 'CA', '820': 'CA', '831': 'CA', '840': 'CA', '858': 'CA', '909': 'CA',
  '916': 'CA', '925': 'CA', '949': 'CA', '951': 'CA',
  // CT
  '203': 'CT', '475': 'CT', '860': 'CT', '959': 'CT',
  // FL
  '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL', '561': 'FL', '727': 'FL',
  '754': 'FL', '772': 'FL', '786': 'FL', '813': 'FL', '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
  // IL
  '217': 'IL', '224': 'IL', '309': 'IL', '312': 'IL', '331': 'IL', '618': 'IL', '630': 'IL', '708': 'IL',
  '773': 'IL', '779': 'IL', '815': 'IL', '847': 'IL', '872': 'IL',
  // MD
  '240': 'MD', '301': 'MD', '410': 'MD', '443': 'MD', '667': 'MD',
  // MA
  '339': 'MA', '351': 'MA', '413': 'MA', '508': 'MA', '617': 'MA', '774': 'MA', '781': 'MA', '857': 'MA', '978': 'MA',
  // MI
  '231': 'MI', '248': 'MI', '269': 'MI', '313': 'MI', '517': 'MI', '586': 'MI', '616': 'MI', '734': 'MI',
  '810': 'MI', '906': 'MI', '947': 'MI', '989': 'MI',
  // MT
  '406': 'MT',
  // NV
  '702': 'NV', '725': 'NV', '775': 'NV',
  // NH
  '603': 'NH',
  // OR
  '458': 'OR', '503': 'OR', '541': 'OR', '971': 'OR',
  // PA
  '215': 'PA', '223': 'PA', '267': 'PA', '272': 'PA', '412': 'PA', '445': 'PA', '484': 'PA', '570': 'PA',
  '582': 'PA', '610': 'PA', '717': 'PA', '724': 'PA', '814': 'PA', '835': 'PA', '878': 'PA',
  // WA
  '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA', '564': 'WA',
};

function getTwoPartyState(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  let areaCode = '';
  if (digits.length === 11 && digits.startsWith('1')) {
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    areaCode = digits.substring(0, 3);
  }
  return TWO_PARTY_AREA_CODES[areaCode] || null;
}

function TwoPartyBadge({ phone }: { phone: string }) {
  const state = getTwoPartyState(phone);
  if (!state) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 ml-1.5"
      title={`Two-party consent state: ${state}`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
      2P
    </span>
  );
}

function getSentimentRowTint(sentiment: string | null): string {
  if (!sentiment) return '';
  const s = sentiment.toLowerCase();
  if (s === 'positive') return 'bg-emerald-500/[0.03]';
  if (s === 'negative') return 'bg-red-500/[0.03]';
  return '';
}

// ── Direction Icon ──────────────────────────────────────────────────────────

function DirectionIcon({ dir }: { dir: 'inbound' | 'outbound' }) {
  if (dir === 'inbound') {
    return (
      <div className="flex items-center gap-1.5" title="Inbound">
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-[10px] text-cyan-400 uppercase tracking-[0.1em]">In</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5" title="Outbound">
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      <span className="text-[10px] text-blue-400 uppercase tracking-[0.1em]">Out</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CallLogPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 25;

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(perPage), offset: String((page - 1) * perPage) });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (directionFilter !== 'all') params.set('direction', directionFilter);
      if (search) params.set('search', search);
      if (datePreset === 'today') {
        params.set('date_from', new Date().toISOString().split('T')[0]);
      } else if (datePreset === 'week') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.set('date_from', d.toISOString().split('T')[0]);
      } else if (datePreset === 'month') {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        params.set('date_from', d.toISOString().split('T')[0]);
      } else if (datePreset === 'custom') {
        if (customStart) params.set('date_from', customStart);
        if (customEnd) params.set('date_to', customEnd);
      }
      const res = await apiFetch(`/calls?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setCalls(json.data);
          setTotalPages(Math.max(1, Math.ceil((json.total || json.data.length) / perPage)));
        }
      }
    } catch {
      // fetch failed
    }
    setLoading(false);
  }, [page, statusFilter, directionFilter, search, datePreset, customStart, customEnd]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  // ── Filtering (client-side on sample data) ────────────────────────────────

  const filtered = calls.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (directionFilter !== 'all' && c.direction !== directionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.lead_name.toLowerCase().includes(q) && !c.lead_phone.includes(q) && !(c.disposition || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalCost = filtered.reduce((s, c) => s + c.cost, 0);
  const totalDuration = filtered.reduce((s, c) => s + c.duration_seconds, 0);
  const completedCount = filtered.filter(c => c.status === 'completed').length;

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white/90">Call Log</h2>
          <p className="text-sm text-white/25">{filtered.length} calls found</p>
        </div>
        <Link
          href="/calls/live"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Live Calls
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, disposition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-glass w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Date Presets */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
            {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-2 text-xs capitalize transition-colors ${
                  datePreset === p ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p}
              </button>
            ))}
          </div>

          {/* Custom Dates */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-glass px-3 py-2 rounded-lg text-xs text-white/90 focus:outline-none focus:border-blue-500/50"
              />
              <span className="text-white/25 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-glass px-3 py-2 rounded-lg text-xs text-white/90 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input-glass px-3 py-2 rounded-lg text-xs text-white/90 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0a0a1a]">All Status</option>
            <option value="completed" className="bg-[#0a0a1a]">Completed</option>
            <option value="failed" className="bg-[#0a0a1a]">Failed</option>
            <option value="no_answer" className="bg-[#0a0a1a]">No Answer</option>
            <option value="in_progress" className="bg-[#0a0a1a]">In Progress</option>
            <option value="voicemail" className="bg-[#0a0a1a]">Voicemail</option>
            <option value="busy" className="bg-[#0a0a1a]">Busy</option>
          </select>

          {/* Direction Toggle */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
            {(['all', 'inbound', 'outbound'] as DirectionFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirectionFilter(d)}
                className={`px-3 py-2 text-xs capitalize transition-colors ${
                  directionFilter === d ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-mini p-3">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Total Calls</p>
          <p className="text-lg font-bold tracking-tight text-white/90">{filtered.length}</p>
        </div>
        <div className="stat-mini p-3">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Completed</p>
          <p className="text-lg font-bold tracking-tight text-emerald-400">{completedCount}</p>
        </div>
        <div className="stat-mini p-3">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Total Duration</p>
          <p className="text-lg font-bold tracking-tight text-cyan-400">{fmtDuration(totalDuration)}</p>
        </div>
        <div className="stat-mini p-3">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.1em]">Total Cost</p>
          <p className="text-lg font-bold tracking-tight text-amber-400">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Call Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="skeleton h-8 w-8 rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/25">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm">No calls yet. Start a campaign to begin making calls.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Date / Time</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Lead</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Dir</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Disposition</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Sentiment</th>
                  <th className="text-right px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => (
                  <tr key={call.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group ${getSentimentRowTint(call.sentiment)}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white/60">{fmtTime(call.started_at)}</p>
                      <p className="text-[10px] text-white/15">{fmtDate(call.started_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white/90 font-medium">{call.lead_name}</p>
                      <p className="text-[10px] text-white/25">{call.lead_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <DirectionIcon dir={call.direction} />
                        <TwoPartyBadge phone={call.lead_phone} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/60 font-mono">{fmtDuration(call.duration_seconds)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/40">{call.disposition || '--'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <SentimentBadge sentiment={call.sentiment} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white/60 font-mono">${call.cost.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Play Recording */}
                        {call.status === 'completed' && (
                          <Link
                            href={`/calls/${call.id}`}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-blue-400 transition-colors"
                            title="Play Recording"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                          </Link>
                        )}
                        {/* View Details */}
                        <Link
                          href={`/calls/${call.id}`}
                          className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/90 transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                        {/* Live indicator for in-progress calls */}
                        {call.status === 'in_progress' && (
                          <Link
                            href={`/calls/live?callId=${call.id}`}
                            className="p-1.5 rounded-md hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="View Live"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: cost + pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/25">
              Total cost: <span className="text-amber-400 font-medium">${totalCost.toFixed(2)}</span>
            </span>
            <span className="text-xs text-white/25">
              Avg cost/call: <span className="text-white/60">${filtered.length > 0 ? (totalCost / filtered.length).toFixed(3) : '0.000'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md text-xs text-white/40 hover:text-white/90 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-white/25">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md text-xs text-white/40 hover:text-white/90 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
