'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { apiFetch } from '../lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  type: 'outbound' | 'inbound' | 'blended';
  script_name: string;
  script_id: string;
  lead_count: number;
  calls_made: number;
  calls_answered: number;
  appointments_booked: number;
  conversion_rate: number;
  total_cost: number;
  avg_call_duration: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  schedule: {
    days: string[];
    start_hour: string;
    end_hour: string;
  };
  pacing: {
    max_concurrent: number;
    calls_per_hour: number;
  };
}

// ── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_001',
    name: 'Midland Hot Leads Q1',
    description: 'Warm outreach to website form submissions and referral leads in the Midland-Odessa metro area. Focus on residential buyers with pre-approval.',
    status: 'active',
    type: 'outbound',
    script_name: 'Real Estate Warm Outreach',
    script_id: 'script_001',
    lead_count: 248,
    calls_made: 87,
    calls_answered: 52,
    appointments_booked: 14,
    conversion_rate: 0.269,
    total_cost: 18.47,
    avg_call_duration: 195,
    created_at: '2026-02-01T10:00:00Z',
    started_at: '2026-02-03T09:00:00Z',
    completed_at: null,
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start_hour: '09:00', end_hour: '17:00' },
    pacing: { max_concurrent: 3, calls_per_hour: 30 },
  },
  {
    id: 'camp_002',
    name: 'Reactivation Feb 2026',
    description: 'Re-engage cold leads from Q4 2025 who showed initial interest but went quiet. Lower-pressure approach with updated listings.',
    status: 'paused',
    type: 'outbound',
    script_name: 'Cold Re-engagement',
    script_id: 'script_003',
    lead_count: 412,
    calls_made: 156,
    calls_answered: 71,
    appointments_booked: 6,
    conversion_rate: 0.085,
    total_cost: 24.83,
    avg_call_duration: 112,
    created_at: '2026-02-05T14:00:00Z',
    started_at: '2026-02-06T09:00:00Z',
    completed_at: null,
    schedule: { days: ['Mon', 'Wed', 'Fri'], start_hour: '10:00', end_hour: '16:00' },
    pacing: { max_concurrent: 2, calls_per_hour: 20 },
  },
  {
    id: 'camp_003',
    name: 'Commercial Investor Outreach',
    description: 'Target high-value commercial property investors with parcels near I-20 corridor. Custom pitch per lead based on portfolio analysis.',
    status: 'draft',
    type: 'outbound',
    script_name: 'Commercial Property Pitch',
    script_id: 'script_005',
    lead_count: 34,
    calls_made: 0,
    calls_answered: 0,
    appointments_booked: 0,
    conversion_rate: 0,
    total_cost: 0,
    avg_call_duration: 0,
    created_at: '2026-02-15T11:30:00Z',
    started_at: null,
    completed_at: null,
    schedule: { days: ['Tue', 'Thu'], start_hour: '10:00', end_hour: '15:00' },
    pacing: { max_concurrent: 1, calls_per_hour: 10 },
  },
];

// ── Status Badge ────────────────────────────────────────────────────────────

function CampaignStatusBadge({ status }: { status: Campaign['status'] }) {
  const cfg: Record<Campaign['status'], { bg: string; text: string; border: string; label: string; pulse?: boolean }> = {
    draft:     { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Draft' },
    active:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Active', pulse: true },
    paused:    { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Paused' },
    completed: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Completed' },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {c.label}
    </span>
  );
}

// ── Type Badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Campaign['type'] }) {
  const cfg: Record<Campaign['type'], { icon: string; label: string; color: string }> = {
    outbound: {
      icon: 'M5 10l7-7m0 0l7 7m-7-7v18',
      label: 'Outbound',
      color: 'text-blue-400',
    },
    inbound: {
      icon: 'M19 14l-7 7m0 0l-7-7m7 7V3',
      label: 'Inbound',
      color: 'text-cyan-400',
    },
    blended: {
      icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
      label: 'Blended',
      color: 'text-purple-400',
    },
  };
  const c = cfg[type];
  return (
    <div className={`flex items-center gap-1 ${c.color}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
      </svg>
      <span className="text-[10px] uppercase tracking-wider">{c.label}</span>
    </div>
  );
}

// ── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-500">{current} / {total} calls</span>
        <span style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(SAMPLE_CAMPAIGNS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/campaigns`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setCampaigns(json.data);
        }
      }
    } catch {
      // API not live, keep sample data
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const startCampaign = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/campaigns/${id}/start`, { method: 'POST' });
      if (res.ok) {
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'active' as const, started_at: new Date().toISOString() } : c));
      }
    } catch {}
    setActionLoading(null);
  };

  const pauseCampaign = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/campaigns/${id}/pause`, { method: 'POST' });
      if (res.ok) {
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'paused' as const } : c));
      }
    } catch {
      // Optimistic update for demo
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'paused' as const } : c));
    }
    setActionLoading(null);
  };

  const resumeCampaign = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/campaigns/${id}/resume`, { method: 'POST' });
      if (res.ok) {
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'active' as const } : c));
      }
    } catch {
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: 'active' as const } : c));
    }
    setActionLoading(null);
  };

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalLeads = campaigns.reduce((s, c) => s + c.lead_count, 0);
  const totalCost = campaigns.reduce((s, c) => s + c.total_cost, 0);
  const totalAppts = campaigns.reduce((s, c) => s + c.appointments_booked, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Campaigns</h2>
          <p className="text-sm text-gray-500">{totalCampaigns} campaigns, {activeCampaigns} active</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Campaign
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Campaigns', value: totalCampaigns, color: '#3B82F6' },
          { label: 'Active Now', value: activeCampaigns, color: '#10B981' },
          { label: 'Total Leads', value: totalLeads.toLocaleString(), color: '#8B5CF6' },
          { label: 'Appointments', value: totalAppts, color: '#F59E0B' },
          { label: 'Total Spend', value: `$${totalCost.toFixed(2)}`, color: '#EF4444' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="text-white font-medium mb-1">No Campaigns Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first campaign to start making calls.</p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-400 transition-colors"
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const isLoading = actionLoading === campaign.id;
            return (
              <div
                key={campaign.id}
                className={`rounded-xl border bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-colors ${
                  campaign.status === 'active' ? 'border-emerald-500/20' : 'border-white/5'
                }`}
              >
                <div className="p-5">
                  {/* Top Row: Name + Status + Type */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Link href={`/campaigns/${campaign.id}`} className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
                          {campaign.name}
                        </Link>
                        <CampaignStatusBadge status={campaign.status} />
                        <TypeBadge type={campaign.type} />
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{campaign.description}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Script</p>
                      <p className="text-sm text-gray-300 truncate">{campaign.script_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Leads</p>
                      <p className="text-sm text-white font-mono">{campaign.lead_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Calls Made</p>
                      <p className="text-sm text-white font-mono">{campaign.calls_made} / {campaign.lead_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Appointments</p>
                      <p className="text-sm text-emerald-400 font-mono font-bold">{campaign.appointments_booked}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Conversion</p>
                      <p className="text-sm text-amber-400 font-mono">{campaign.calls_answered > 0 ? `${(campaign.conversion_rate * 100).toFixed(1)}%` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">Cost</p>
                      <p className="text-sm text-gray-300 font-mono">${campaign.total_cost.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Progress Bar (active/paused campaigns) */}
                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <div className="mb-4">
                      <ProgressBar
                        current={campaign.calls_made}
                        total={campaign.lead_count}
                        color={campaign.status === 'active' ? '#10B981' : '#F59E0B'}
                      />
                    </div>
                  )}

                  {/* Schedule + Pacing Info */}
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{campaign.schedule.start_hour} - {campaign.schedule.end_hour}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span>{campaign.schedule.days.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                      <span>{campaign.pacing.calls_per_hour}/hr, {campaign.pacing.max_concurrent} concurrent</span>
                    </div>
                    {campaign.avg_call_duration > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <span>Avg {Math.floor(campaign.avg_call_duration / 60)}m {campaign.avg_call_duration % 60}s</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => startCampaign(campaign.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        {isLoading ? 'Starting...' : 'Start'}
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => pauseCampaign(campaign.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                        {isLoading ? 'Pausing...' : 'Pause'}
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => resumeCampaign(campaign.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        {isLoading ? 'Resuming...' : 'Resume'}
                      </button>
                    )}
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      View Stats
                    </Link>
                    <Link
                      href={`/campaigns/new?edit=${campaign.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
