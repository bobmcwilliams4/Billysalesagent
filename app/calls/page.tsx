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

// ── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_CALLS: Call[] = [
  {
    id: 'call_001', lead_name: 'James Thornton', lead_phone: '+14325559012', direction: 'outbound',
    status: 'completed', disposition: 'Appointment Set', duration_seconds: 247, started_at: '2026-02-17T14:32:00Z',
    ended_at: '2026-02-17T14:36:07Z', cost: 0.42, transcript_summary: 'Successfully booked property viewing for Friday 2pm. Lead expressed strong interest in 3BR listings under $350K.',
    campaign_name: 'Midland Hot Leads Q1', script_name: 'Real Estate Warm Outreach', sentiment: 'positive',
  },
  {
    id: 'call_002', lead_name: 'Sarah Mitchell', lead_phone: '+14325558743', direction: 'outbound',
    status: 'completed', disposition: 'Follow-up Needed', duration_seconds: 183, started_at: '2026-02-17T14:15:00Z',
    ended_at: '2026-02-17T14:18:03Z', cost: 0.31, transcript_summary: 'Lead interested but wants to discuss with spouse first. Call back Thursday after 5pm.',
    campaign_name: 'Midland Hot Leads Q1', script_name: 'Real Estate Warm Outreach', sentiment: 'neutral',
  },
  {
    id: 'call_003', lead_name: 'Robert Vasquez', lead_phone: '+14325551234', direction: 'inbound',
    status: 'completed', disposition: 'Qualified', duration_seconds: 412, started_at: '2026-02-17T13:45:00Z',
    ended_at: '2026-02-17T13:51:52Z', cost: 0.68, transcript_summary: 'Inbound from website form. Pre-approved buyer seeking investment property in Odessa. Budget $200-500K.',
    campaign_name: null, script_name: 'Inbound Qualification', sentiment: 'positive',
  },
  {
    id: 'call_004', lead_name: 'Linda Harper', lead_phone: '+14325557890', direction: 'outbound',
    status: 'no_answer', disposition: 'No Answer', duration_seconds: 22, started_at: '2026-02-17T13:30:00Z',
    ended_at: '2026-02-17T13:30:22Z', cost: 0.04, transcript_summary: null,
    campaign_name: 'Reactivation Feb 2026', script_name: 'Cold Re-engagement', sentiment: null,
  },
  {
    id: 'call_005', lead_name: 'Marcus Williams', lead_phone: '+14325556789', direction: 'outbound',
    status: 'failed', disposition: 'Wrong Number', duration_seconds: 8, started_at: '2026-02-17T13:20:00Z',
    ended_at: '2026-02-17T13:20:08Z', cost: 0.02, transcript_summary: null,
    campaign_name: 'Reactivation Feb 2026', script_name: 'Cold Re-engagement', sentiment: null,
  },
  {
    id: 'call_006', lead_name: 'Diana Cheng', lead_phone: '+14325554321', direction: 'outbound',
    status: 'completed', disposition: 'Not Interested', duration_seconds: 67, started_at: '2026-02-17T12:50:00Z',
    ended_at: '2026-02-17T12:51:07Z', cost: 0.12, transcript_summary: 'Lead declined, recently purchased through another agent. Marked as lost.',
    campaign_name: 'Midland Hot Leads Q1', script_name: 'Real Estate Warm Outreach', sentiment: 'negative',
  },
  {
    id: 'call_007', lead_name: 'Kevin O\'Brien', lead_phone: '+14325553456', direction: 'inbound',
    status: 'in_progress', disposition: '', duration_seconds: 0, started_at: '2026-02-17T14:40:00Z',
    ended_at: null, cost: 0.0, transcript_summary: null,
    campaign_name: null, script_name: 'Inbound Qualification', sentiment: null,
  },
  {
    id: 'call_008', lead_name: 'Patricia Gonzalez', lead_phone: '+14325552345', direction: 'outbound',
    status: 'voicemail', disposition: 'Left Voicemail', duration_seconds: 35, started_at: '2026-02-17T12:30:00Z',
    ended_at: '2026-02-17T12:30:35Z', cost: 0.06, transcript_summary: 'Voicemail left. Mentioned availability for callback and open house Saturday.',
    campaign_name: 'Midland Hot Leads Q1', script_name: 'Real Estate Warm Outreach', sentiment: null,
  },
];

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

// ── Direction Icon ──────────────────────────────────────────────────────────

function DirectionIcon({ dir }: { dir: 'inbound' | 'outbound' }) {
  if (dir === 'inbound') {
    return (
      <div className="flex items-center gap-1.5" title="Inbound">
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-[10px] text-cyan-400 uppercase tracking-wider">In</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5" title="Outbound">
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      <span className="text-[10px] text-blue-400 uppercase tracking-wider">Out</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CallLogPage() {
  const [calls, setCalls] = useState<Call[]>(SAMPLE_CALLS);
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
      // API not live yet, keep sample data
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Call Log</h2>
          <p className="text-sm text-gray-500">{filtered.length} calls found</p>
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
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, disposition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Date Presets */}
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
            {(['today', 'week', 'month', 'custom'] as DatePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-2 text-xs capitalize transition-colors ${
                  datePreset === p ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
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
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
            {(['all', 'inbound', 'outbound'] as DirectionFilter[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirectionFilter(d)}
                className={`px-3 py-2 text-xs capitalize transition-colors ${
                  directionFilter === d ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
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
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Calls</p>
          <p className="text-lg font-bold text-white">{filtered.length}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Completed</p>
          <p className="text-lg font-bold text-emerald-400">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Duration</p>
          <p className="text-lg font-bold text-cyan-400">{fmtDuration(totalDuration)}</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Cost</p>
          <p className="text-lg font-bold text-amber-400">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Call Table */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm">No calls match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Date / Time</th>
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Lead</th>
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Dir</th>
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Duration</th>
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Disposition</th>
                  <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Cost</th>
                  <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((call) => (
                  <tr key={call.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{fmtTime(call.started_at)}</p>
                      <p className="text-[10px] text-gray-600">{fmtDate(call.started_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white font-medium">{call.lead_name}</p>
                      <p className="text-[10px] text-gray-500">{call.lead_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <DirectionIcon dir={call.direction} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 font-mono">{fmtDuration(call.duration_seconds)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">{call.disposition || '--'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-300 font-mono">${call.cost.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Play Recording */}
                        {call.status === 'completed' && (
                          <Link
                            href={`/calls/${call.id}`}
                            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
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
                          className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Total cost: <span className="text-amber-400 font-medium">${totalCost.toFixed(2)}</span>
            </span>
            <span className="text-xs text-gray-500">
              Avg cost/call: <span className="text-gray-300">${filtered.length > 0 ? (totalCost / filtered.length).toFixed(3) : '0.000'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
