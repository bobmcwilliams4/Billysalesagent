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

const EMPTY: DashboardData = {
  calls_today: 0, calls_answered: 0, appointments_today: 0, appointments_this_week: 0,
  leads_new: 0, leads_qualified: 0, conversion_rate: 0, avg_call_duration: 0,
  cost_today: 0, cost_per_appointment: 0, revenue_pipeline: 0, active_campaigns: 0,
};

interface Activity {
  time: string;
  text: string;
  type: 'call' | 'lead' | 'appointment' | 'campaign';
}

function SkeletonCard() {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-5 w-5 rounded" />
      </div>
      <div className="skeleton h-7 w-16 mb-1.5" />
      <div className="skeleton h-2.5 w-24" />
    </div>
  );
}

function KPICard({ label, value, subtext, color, icon, idx }: { label: string; value: string | number; subtext?: string; color: string; icon: string; idx: number }) {
  return (
    <div className={`kpi-card animate-fadeInUp stagger-${idx + 1}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] text-white/25 uppercase tracking-[0.1em] font-medium">{label}</span>
        <span className="text-base opacity-60">{icon}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight" style={{ color }}>{value}</p>
      {subtext && <p className="text-[11px] text-white/20 mt-1.5">{subtext}</p>}
    </div>
  );
}

function ActivityItem({ time, text, type }: Activity) {
  const colors: Record<string, string> = { call: '#3B82F6', lead: '#10B981', appointment: '#F59E0B', campaign: '#8B5CF6' };
  const icons: Record<string, string> = { call: '\u{260E}', lead: '\u{1F464}', appointment: '\u{1F4C5}', campaign: '\u{1F4E3}' };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: `${colors[type]}15` }}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/60 truncate">{text}</p>
        <p className="text-[10px] text-white/15 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

function CostMeter({ label, cost, budget, color }: { label: string; cost: number; budget: number; color: string }) {
  const pct = budget > 0 ? Math.min((cost / budget) * 100, 100) : 0;
  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-white/30">{label}</span>
        <span className="font-mono" style={{ color: `${color}cc` }}>${cost.toFixed(2)} / ${budget.toFixed(2)}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function BillyMCDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiFetch('/analytics/dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setData(json.data);
          if (json.activities && Array.isArray(json.activities)) setActivities(json.activities);
        }
      } catch {
        // API will return real data — no fallback mock
      }
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
      <div className="flex items-center justify-between animate-fadeIn">
        <div>
          <h2 className="text-xl font-semibold text-white/90 tracking-tight">Dashboard</h2>
          <p className="text-[13px] text-white/25 mt-0.5">Real-time performance overview</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="live-dot" />
          <span className="text-[11px] text-emerald-400/70 font-medium tracking-wide">Live</span>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard idx={0} label="Calls Today" value={data.calls_today} subtext={`${data.calls_answered} answered`} color="#3B82F6" icon={'\u{1F4DE}'} />
            <KPICard idx={1} label="Appointments" value={data.appointments_today} subtext={`${data.appointments_this_week} this week`} color="#10B981" icon={'\u{1F4C5}'} />
            <KPICard idx={2} label="Conversion Rate" value={fmtPct(data.conversion_rate)} subtext={`${data.leads_qualified} qualified`} color="#F59E0B" icon={'\u{1F4C8}'} />
            <KPICard idx={3} label="Cost Today" value={fmtCurrency(data.cost_today)} subtext={data.cost_per_appointment > 0 ? `${fmtCurrency(data.cost_per_appointment)}/appt` : 'No appointments yet'} color="#EF4444" icon={'\u{1F4B0}'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard idx={4} label="New Leads" value={data.leads_new} color="#8B5CF6" icon={'\u{1F464}'} />
            <KPICard idx={5} label="Avg Duration" value={fmtDuration(data.avg_call_duration)} color="#06B6D4" icon={'\u{23F1}'} />
            <KPICard idx={6} label="Pipeline Value" value={fmtCurrency(data.revenue_pipeline)} color="#10B981" icon={'\u{1F4B5}'} />
            <KPICard idx={7} label="Active Campaigns" value={data.active_campaigns} color="#F97316" icon={'\u{1F4E3}'} />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 glass-panel p-5 animate-fadeInUp stagger-5">
          <h3 className="text-sm font-medium text-white/60 mb-4 tracking-wide">Recent Activity</h3>
          {activities.length > 0 ? (
            <div className="space-y-0">
              {activities.map((a, i) => (
                <ActivityItem key={i} time={a.time} text={a.text} type={a.type} />
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white/20">No activity yet. Start a campaign to see live updates.</p>
            </div>
          )}
        </div>

        {/* Cost Center */}
        <div className="glass-panel p-5 animate-fadeInUp stagger-6">
          <h3 className="text-sm font-medium text-white/60 mb-4 tracking-wide">Cost Center</h3>
          <CostMeter label="Twilio (Calls)" cost={data.cost_today * 0.15} budget={50} color="#3B82F6" />
          <CostMeter label="Deepgram (STT)" cost={data.cost_today * 0.05} budget={20} color="#10B981" />
          <CostMeter label="Cartesia (TTS)" cost={data.cost_today * 0.8} budget={100} color="#F59E0B" />
          <CostMeter label="LLM (GPT-5.2)" cost={0} budget={0} color="#8B5CF6" />
          <p className="text-[10px] text-white/15 mt-3">LLM = FREE via Azure</p>
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex justify-between">
              <span className="text-sm text-white/30">Total Today</span>
              <span className="text-sm font-semibold text-white/80 font-mono">{fmtCurrency(data.cost_today)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel p-5 animate-fadeInUp stagger-7">
        <h3 className="text-sm font-medium text-white/60 mb-4 tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/leads/import', icon: '\u{1F4E5}', label: 'Import Leads', color: 'blue' },
            { href: '/campaigns/new', icon: '\u{1F680}', label: 'New Campaign', color: 'emerald' },
            { href: '/scripts', icon: '\u{1F4DD}', label: 'Edit Scripts', color: 'amber' },
            { href: '/analytics/costs', icon: '\u{1F4CA}', label: 'View Costs', color: 'purple' },
          ].map((action) => (
            <a
              key={action.href}
              href={action.href}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 hover:translate-y-[-1px]
                bg-${action.color}-500/[0.06] border-${action.color}-500/[0.12] hover:bg-${action.color}-500/[0.12] hover:border-${action.color}-500/[0.2]`}
            >
              <span className="text-base">{action.icon}</span>
              <span className={`text-sm text-${action.color}-300/80`}>{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
