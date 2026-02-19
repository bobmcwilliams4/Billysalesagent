'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { apiFetch } from '../../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  script_id: string;
  lead_filter: string;
  schedule: string;
  pacing: { max_concurrent: number; calls_per_hour: number };
  retry_policy: { max_retries: number; retry_delay_hours: number };
  stats: { total_leads: number; calls_made: number; calls_answered: number; qualified: number; appointments: number; cost: number };
  started_at: string;
  created_at: string;
}

interface CampaignLead {
  id: string;
  name: string;
  phone: string;
  status: string;
  last_call_status?: string;
  attempts: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-white/[0.04]', text: 'text-white/40' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className || ''}`} />;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/campaigns/${id}`);
        if (res.ok) {
          const d = await res.json();
          if (d.data) setCampaign(d.data);
          if (d.leads) setLeads(d.leads);
        }
      } catch {
        // API not live yet
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const togglePause = async () => {
    if (!campaign) return;
    const action = campaign.status === 'active' ? 'pause' : 'start';
    try { await apiFetch(`/campaigns/${id}/${action}`, { method: 'POST' }); } catch {}
    setCampaign(prev => prev ? { ...prev, status: action === 'pause' ? 'paused' : 'active' } : null);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeInUp">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-7 w-64" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <SkeletonBlock className="h-16 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeInUp">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white/40 tracking-tight mb-1">Campaign not found</p>
        <p className="text-sm text-white/25 mb-4">This campaign may not exist or has not been created yet.</p>
        <Link href="/campaigns" className="text-blue-400 hover:text-blue-300 text-sm">Back to Campaigns</Link>
      </div>
    );
  }

  const progress = campaign.stats.total_leads > 0 ? (campaign.stats.calls_made / campaign.stats.total_leads) * 100 : 0;
  const sc = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft;

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/campaigns" className="text-xs text-white/25 hover:text-white/90 transition-colors">&larr; Campaigns</Link>
          <h2 className="text-xl font-bold text-white/90 mt-1 tracking-tight">{campaign.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text}`}>{campaign.status.toUpperCase()}</span>
            <span className="text-xs text-white/25">{campaign.type} &middot; Script: {campaign.script_id}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={togglePause} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${campaign.status === 'active' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
            {campaign.status === 'active' ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/25">Progress</span>
          <span className="text-xs text-white/40">{campaign.stats.calls_made} / {campaign.stats.total_leads} leads called ({progress.toFixed(0)}%)</span>
        </div>
        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-blue-400">{campaign.stats.calls_made}</p>
          <p className="text-[10px] text-white/25">Calls Made</p>
        </div>
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-cyan-400">{campaign.stats.calls_answered}</p>
          <p className="text-[10px] text-white/25">Answered</p>
        </div>
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-amber-400">{campaign.stats.qualified}</p>
          <p className="text-[10px] text-white/25">Qualified</p>
        </div>
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-emerald-400">{campaign.stats.appointments}</p>
          <p className="text-[10px] text-white/25">Appointments</p>
        </div>
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-purple-400">{campaign.stats.calls_made > 0 ? ((campaign.stats.appointments / campaign.stats.calls_made) * 100).toFixed(1) : '0.0'}%</p>
          <p className="text-[10px] text-white/25">Conversion</p>
        </div>
        <div className="stat-mini p-4 text-center">
          <p className="text-xl font-bold text-red-400">${campaign.stats.cost.toFixed(2)}</p>
          <p className="text-[10px] text-white/25">Total Cost</p>
        </div>
      </div>

      {/* Campaign Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Configuration</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-white/25">Pacing</span><span className="text-white/60">{campaign.pacing.calls_per_hour} calls/hr, max {campaign.pacing.max_concurrent} concurrent</span></div>
            <div className="flex justify-between"><span className="text-white/25">Retry</span><span className="text-white/60">Max {campaign.retry_policy.max_retries} retries, {campaign.retry_policy.retry_delay_hours}hr delay</span></div>
            <div className="flex justify-between"><span className="text-white/25">Started</span><span className="text-white/60">{campaign.started_at ? new Date(campaign.started_at).toLocaleString() : 'Not started'}</span></div>
          </div>
        </div>

        {/* Lead Status Breakdown */}
        <div className="glass-panel p-5">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Lead Status</h3>
          {leads.length === 0 ? (
            <p className="text-xs text-white/25 py-4 text-center">No leads loaded for this campaign</p>
          ) : (
            ['new', 'contacted', 'qualified', 'appointment_set', 'converted', 'lost'].map(status => {
              const count = leads.filter(l => l.status === status).length;
              const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
              const colors: Record<string, string> = { new: '#3B82F6', contacted: '#06B6D4', qualified: '#F59E0B', appointment_set: '#10B981', converted: '#8B5CF6', lost: '#EF4444' };
              return (
                <div key={status} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-white/25 w-28">{status.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[status] || '#6B7280' }} />
                  </div>
                  <span className="text-xs text-white/40 w-8 text-right">{count}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lead List */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Leads ({leads.length})</h3>
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-white/25 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm text-white/40">No leads in this campaign</p>
            <p className="text-xs text-white/25 mt-1">Leads will appear once assigned to the campaign</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-white/25 border-b border-white/[0.04]">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Last Call</th>
                  <th className="text-right">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const colors: Record<string, string> = { new: '#3B82F6', contacted: '#06B6D4', qualified: '#F59E0B', appointment_set: '#10B981', converted: '#8B5CF6', lost: '#EF4444' };
                  return (
                    <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2">
                        <Link href={`/leads/${lead.id}`} className="text-white/90 hover:text-blue-400 transition-colors">{lead.name}</Link>
                      </td>
                      <td className="text-white/40">{lead.phone}</td>
                      <td><span className="text-xs" style={{ color: colors[lead.status] || '#6B7280' }}>{lead.status.replace('_', ' ')}</span></td>
                      <td className="text-xs text-white/25">{lead.last_call_status || '-'}</td>
                      <td className="text-right text-white/40">{lead.attempts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
