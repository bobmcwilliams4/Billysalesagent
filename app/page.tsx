'use client';
import { useState, useEffect, useMemo } from 'react';

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

// ── Gamification Types ────────────────────────────────────────────────────────

interface GamificationData {
  score_today: number;
  calls_made: number;
  calls_target: number;
  leads_qualified: number;
  leads_target: number;
  appointments_booked: number;
  appointments_target: number;
  streak_days: number;
  badges: Badge[];
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  color: string;
}

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_call', label: 'First Call', icon: '\u{1F4DE}', earned: false, color: '#3B82F6' },
  { id: '10_calls', label: '10 Calls', icon: '\u{1F525}', earned: false, color: '#F97316' },
  { id: '50_calls', label: '50 Calls', icon: '\u{26A1}', earned: false, color: '#F59E0B' },
  { id: '100_calls', label: '100 Calls', icon: '\u{1F3C6}', earned: false, color: '#EF4444' },
  { id: 'first_appt', label: 'First Appt', icon: '\u{1F4C5}', earned: false, color: '#10B981' },
  { id: '10_appts', label: '10 Appts', icon: '\u{1F389}', earned: false, color: '#8B5CF6' },
  { id: 'under_budget', label: 'Under Budget', icon: '\u{1F4B0}', earned: false, color: '#06B6D4' },
];

interface BestTimesData {
  // 7 days (0=Mon..6=Sun) x 12 hours (8am-8pm) pickup rates 0-1
  heatmap: number[][];
}

// ── Gamification Components ──────────────────────────────────────────────────

function ProgressMetric({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-white/40">{label}</span>
        <span className="font-mono text-white/60">{current} / {target}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function GamificationSection({ data }: { data: GamificationData | null }) {
  if (!data) {
    return (
      <div className="glass-panel p-5 animate-fadeInUp stagger-8">
        <h3 className="text-sm font-medium text-white/60 mb-4 tracking-wide">Daily Scoreboard</h3>
        <div className="empty-state py-8">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" />
          </svg>
          <p className="text-sm text-white/20">Start making calls to earn achievements!</p>
        </div>
      </div>
    );
  }

  const badges = data.badges.length > 0 ? data.badges : DEFAULT_BADGES;

  return (
    <div className="glass-panel p-5 animate-fadeInUp stagger-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 tracking-wide">Daily Scoreboard</h3>
        {data.streak_days > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            Streak: {data.streak_days} day{data.streak_days !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="text-center">
          <p className="text-3xl font-bold text-white/90 tracking-tight">{data.score_today.toLocaleString()}</p>
          <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Today&apos;s Score</p>
        </div>
        <div className="w-px h-12 bg-white/[0.06]" />
        <div className="flex-1 space-y-0">
          <ProgressMetric label="Calls Made" current={data.calls_made} target={data.calls_target} color="#3B82F6" />
          <ProgressMetric label="Leads Qualified" current={data.leads_qualified} target={data.leads_target} color="#10B981" />
          <ProgressMetric label="Appointments Booked" current={data.appointments_booked} target={data.appointments_target} color="#F59E0B" />
        </div>
      </div>

      {/* Badge Row */}
      <div>
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Achievements</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all"
              style={{
                backgroundColor: badge.earned ? `${badge.color}12` : 'rgba(255,255,255,0.02)',
                borderColor: badge.earned ? `${badge.color}30` : 'rgba(255,255,255,0.04)',
                opacity: badge.earned ? 1 : 0.35,
              }}
              title={badge.label}
            >
              <span className="text-xs">{badge.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: badge.earned ? badge.color : 'rgba(255,255,255,0.25)' }}>
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Best Time to Call Heatmap ────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = ['8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p'];

function BestTimeHeatmap({ data }: { data: BestTimesData | null }) {
  const hasData = data && data.heatmap && data.heatmap.length > 0 && data.heatmap.some(row => row.some(v => v > 0));

  return (
    <div className="glass-panel p-5 animate-fadeInUp stagger-8">
      <h3 className="text-sm font-medium text-white/60 mb-4 tracking-wide">Best Time to Call</h3>
      {!hasData ? (
        <div className="empty-state py-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <p className="text-xs text-white/20">Not enough data yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Hour labels */}
          <div className="flex mb-1 pl-8">
            {HOUR_LABELS.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-white/20">{h}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="space-y-[3px]">
            {DAY_LABELS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1">
                <span className="text-[9px] text-white/25 w-7 text-right shrink-0">{day}</span>
                <div className="flex flex-1 gap-[3px]">
                  {HOUR_LABELS.map((_, hourIdx) => {
                    const val = data!.heatmap[dayIdx]?.[hourIdx] ?? 0;
                    // Map 0-1 to green intensity
                    const alpha = Math.max(0.04, val * 0.8);
                    return (
                      <div
                        key={hourIdx}
                        className="flex-1 h-5 rounded-[3px] transition-colors"
                        style={{
                          backgroundColor: val > 0
                            ? `rgba(16, 185, 129, ${alpha})`
                            : 'rgba(255,255,255,0.02)',
                        }}
                        title={`${day} ${HOUR_LABELS[hourIdx]}: ${(val * 100).toFixed(0)}% pickup`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <span className="text-[9px] text-white/20">Low</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div key={v} className="w-4 h-3 rounded-[2px]" style={{ backgroundColor: `rgba(16, 185, 129, ${v * 0.8})` }} />
            ))}
            <span className="text-[9px] text-white/20">High</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillyMCDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [bestTimes, setBestTimes] = useState<BestTimesData | null>(null);

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

    async function fetchGamification() {
      try {
        const res = await apiFetch('/analytics/gamification');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setGamification(json.data);
        }
      } catch {
        // No gamification data yet
      }
    }

    async function fetchBestTimes() {
      try {
        const res = await apiFetch('/analytics/best-times');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setBestTimes(json.data);
        }
      } catch {
        // No best times data yet
      }
    }

    fetchDashboard();
    fetchGamification();
    fetchBestTimes();
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

      {/* Gamification + Best Time to Call */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GamificationSection data={gamification} />
        </div>
        <BestTimeHeatmap data={bestTimes} />
      </div>
    </div>
  );
}
