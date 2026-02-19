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
  draft: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

const SAMPLE_CAMPAIGN: Campaign = {
  id: '1', name: 'Midland Auto Insurance Blitz', status: 'active', type: 'outbound', script_id: 'insurance-v1',
  lead_filter: '{"status":"new","source":"facebook"}', schedule: '{"days":["mon","tue","wed","thu","fri"],"start":"09:00","end":"17:00"}',
  pacing: { max_concurrent: 1, calls_per_hour: 30 }, retry_policy: { max_retries: 3, retry_delay_hours: 24 },
  stats: { total_leads: 150, calls_made: 89, calls_answered: 61, qualified: 28, appointments: 15, cost: 24.92 },
  started_at: '2026-02-15T09:00:00Z', created_at: '2026-02-14T16:00:00Z',
};

const SAMPLE_LEADS: CampaignLead[] = [
  { id: '1', name: 'John Smith', phone: '(432) 555-0123', status: 'appointment_set', last_call_status: 'completed', attempts: 1 },
  { id: '2', name: 'Mary Johnson', phone: '(432) 555-0456', status: 'qualified', last_call_status: 'completed', attempts: 2 },
  { id: '3', name: 'Robert Williams', phone: '(432) 555-0789', status: 'contacted', last_call_status: 'no_answer', attempts: 1 },
  { id: '4', name: 'Patricia Brown', phone: '(432) 555-0321', status: 'new', attempts: 0 },
  { id: '5', name: 'Michael Davis', phone: '(432) 555-0654', status: 'new', attempts: 0 },
  { id: '6', name: 'Jennifer Garcia', phone: '(432) 555-0987', status: 'lost', last_call_status: 'completed', attempts: 2 },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign>(SAMPLE_CAMPAIGN);
  const [leads, setLeads] = useState<CampaignLead[]>(SAMPLE_LEADS);

  useEffect(() => {
    apiFetch(`/campaigns/${id}`).then(r => r.json()).then(d => { if (d.data) setCampaign(d.data); }).catch(() => {});
  }, [id]);

  const progress = campaign.stats.total_leads > 0 ? (campaign.stats.calls_made / campaign.stats.total_leads) * 100 : 0;
  const sc = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft;

  const togglePause = async () => {
    const action = campaign.status === 'active' ? 'pause' : 'start';
    try { await apiFetch(`/campaigns/${id}/${action}`, { method: 'POST' }); } catch {}
    setCampaign(prev => ({ ...prev, status: action === 'pause' ? 'paused' : 'active' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/campaigns" className="text-xs text-gray-500 hover:text-white transition-colors">&larr; Campaigns</Link>
          <h2 className="text-xl font-bold text-white mt-1">{campaign.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text}`}>{campaign.status.toUpperCase()}</span>
            <span className="text-xs text-gray-500">{campaign.type} &middot; Script: {campaign.script_id}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={togglePause} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${campaign.status === 'active' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
            {campaign.status === 'active' ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs text-gray-400">{campaign.stats.calls_made} / {campaign.stats.total_leads} leads called ({progress.toFixed(0)}%)</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-blue-400">{campaign.stats.calls_made}</p>
          <p className="text-[10px] text-gray-500">Calls Made</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-cyan-400">{campaign.stats.calls_answered}</p>
          <p className="text-[10px] text-gray-500">Answered</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-amber-400">{campaign.stats.qualified}</p>
          <p className="text-[10px] text-gray-500">Qualified</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-emerald-400">{campaign.stats.appointments}</p>
          <p className="text-[10px] text-gray-500">Appointments</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-purple-400">{campaign.stats.total_leads > 0 ? ((campaign.stats.appointments / campaign.stats.calls_made) * 100).toFixed(1) : 0}%</p>
          <p className="text-[10px] text-gray-500">Conversion</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xl font-bold text-red-400">${campaign.stats.cost.toFixed(2)}</p>
          <p className="text-[10px] text-gray-500">Total Cost</p>
        </div>
      </div>

      {/* Campaign Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="text-sm font-medium text-white mb-3">Configuration</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Pacing</span><span className="text-gray-300">{campaign.pacing.calls_per_hour} calls/hr, max {campaign.pacing.max_concurrent} concurrent</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Retry</span><span className="text-gray-300">Max {campaign.retry_policy.max_retries} retries, {campaign.retry_policy.retry_delay_hours}hr delay</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Started</span><span className="text-gray-300">{campaign.started_at ? new Date(campaign.started_at).toLocaleString() : 'Not started'}</span></div>
          </div>
        </div>

        {/* Lead Status Breakdown */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <h3 className="text-sm font-medium text-white mb-3">Lead Status</h3>
          {['new', 'contacted', 'qualified', 'appointment_set', 'converted', 'lost'].map(status => {
            const count = leads.filter(l => l.status === status).length;
            const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
            const colors: Record<string, string> = { new: '#3B82F6', contacted: '#06B6D4', qualified: '#F59E0B', appointment_set: '#10B981', converted: '#8B5CF6', lost: '#EF4444' };
            return (
              <div key={status} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500 w-28">{status.replace('_', ' ')}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[status] || '#6B7280' }} />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead List */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-sm font-medium text-white mb-3">Leads ({leads.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-white/5">
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
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2">
                      <Link href={`/leads/${lead.id}`} className="text-white hover:text-blue-400 transition-colors">{lead.name}</Link>
                    </td>
                    <td className="text-gray-400">{lead.phone}</td>
                    <td><span className="text-xs" style={{ color: colors[lead.status] || '#6B7280' }}>{lead.status.replace('_', ' ')}</span></td>
                    <td className="text-xs text-gray-500">{lead.last_call_status || '-'}</td>
                    <td className="text-right text-gray-400">{lead.attempts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
