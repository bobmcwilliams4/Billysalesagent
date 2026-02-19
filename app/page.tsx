'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from './lib/api';

interface DashboardData {
  calls_today: number;
  calls_answered: number;
  appointments_today: number;
  appointments_this_week: number;
  leads_new: number;
  leads_qualified: number;
  conversion_rate: number;
  avg_call_duration: number;
  cost_today: number;
  cost_per_appointment: number;
  revenue_pipeline: number;
  active_campaigns: number;
}

const DEFAULT_DATA: DashboardData = {
  calls_today: 0, calls_answered: 0, appointments_today: 0, appointments_this_week: 0,
  leads_new: 0, leads_qualified: 0, conversion_rate: 0, avg_call_duration: 0,
  cost_today: 0, cost_per_appointment: 0, revenue_pipeline: 0, active_campaigns: 0,
};

function KPICard({ label, value, subtext, color, icon }: { label: string; value: string | number; subtext?: string; color: string; icon: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function ActivityItem({ time, text, type }: { time: string; text: string; type: 'call' | 'lead' | 'appointment' | 'campaign' }) {
  const colors: Record<string, string> = { call: '#3B82F6', lead: '#10B981', appointment: '#F59E0B', campaign: '#8B5CF6' };
  const icons: Record<string, string> = { call: '\u{260E}', lead: '\u{1F464}', appointment: '\u{1F4C5}', campaign: '\u{1F4E3}' };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: `${colors[type]}20` }}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate">{text}</p>
        <p className="text-[10px] text-gray-600">{time}</p>
      </div>
    </div>
  );
}

function CostMeter({ label, cost, budget, color }: { label: string; cost: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min((cost / budget) * 100, 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }}>${cost.toFixed(2)} / ${budget.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function BillyMCDashboard() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [activities, setActivities] = useState<{ time: string; text: string; type: 'call' | 'lead' | 'appointment' | 'campaign' }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiFetch('/analytics/dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setData(json.data);
        }
      } catch {}

      // Sample activity feed for initial render
      setActivities([
        { time: 'Just now', text: 'System ready - BillyMC AI-SDR platform online', type: 'campaign' },
        { time: '---', text: 'Import leads to get started', type: 'lead' },
        { time: '---', text: 'Create your first campaign', type: 'campaign' },
        { time: '---', text: 'Configure calling scripts', type: 'call' },
      ]);
      setLoading(false);
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
  const fmtDuration = (s: number) => s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-gray-500">Real-time performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Calls Today" value={data.calls_today} subtext={`${data.calls_answered} answered`} color="#3B82F6" icon={'\u{1F4DE}'} />
        <KPICard label="Appointments" value={data.appointments_today} subtext={`${data.appointments_this_week} this week`} color="#10B981" icon={'\u{1F4C5}'} />
        <KPICard label="Conversion Rate" value={fmtPct(data.conversion_rate)} subtext={`${data.leads_qualified} qualified`} color="#F59E0B" icon={'\u{1F4C8}'} />
        <KPICard label="Cost Today" value={fmtCurrency(data.cost_today)} subtext={data.cost_per_appointment > 0 ? `${fmtCurrency(data.cost_per_appointment)}/appointment` : 'No appointments yet'} color="#EF4444" icon={'\u{1F4B0}'} />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="New Leads" value={data.leads_new} color="#8B5CF6" icon={'\u{1F464}'} />
        <KPICard label="Avg Duration" value={fmtDuration(data.avg_call_duration)} color="#06B6D4" icon={'\u{23F1}'} />
        <KPICard label="Pipeline Value" value={fmtCurrency(data.revenue_pipeline)} color="#10B981" icon={'\u{1F4B5}'} />
        <KPICard label="Active Campaigns" value={data.active_campaigns} color="#F97316" icon={'\u{1F4E3}'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-white mb-4">Recent Activity</h3>
          <div className="space-y-0">
            {activities.map((a, i) => (
              <ActivityItem key={i} time={a.time} text={a.text} type={a.type} />
            ))}
          </div>
        </div>

        {/* Cost Center */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-white mb-4">Cost Center</h3>
          <CostMeter label="Twilio (Calls)" cost={data.cost_today * 0.15} budget={50} color="#3B82F6" />
          <CostMeter label="Deepgram (STT)" cost={data.cost_today * 0.05} budget={20} color="#10B981" />
          <CostMeter label="ElevenLabs (TTS)" cost={data.cost_today * 0.8} budget={100} color="#F59E0B" />
          <CostMeter label="LLM (GPT-4.1)" cost={0} budget={0} color="#8B5CF6" />
          <p className="text-[10px] text-gray-600 mt-3">LLM = FREE via Azure/GitHub Models</p>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Total Today</span>
              <span className="text-sm font-bold text-white">{fmtCurrency(data.cost_today)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5">
        <h3 className="text-sm font-medium text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <a href="/leads/import" className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
            <span className="text-lg">{'\u{1F4E5}'}</span>
            <span className="text-sm text-blue-300">Import Leads</span>
          </a>
          <a href="/campaigns/new" className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
            <span className="text-lg">{'\u{1F680}'}</span>
            <span className="text-sm text-emerald-300">New Campaign</span>
          </a>
          <a href="/scripts" className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
            <span className="text-lg">{'\u{1F4DD}'}</span>
            <span className="text-sm text-amber-300">Edit Scripts</span>
          </a>
          <a href="/analytics/costs" className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
            <span className="text-lg">{'\u{1F4CA}'}</span>
            <span className="text-sm text-purple-300">View Costs</span>
          </a>
        </div>
      </div>
    </div>
  );
}
