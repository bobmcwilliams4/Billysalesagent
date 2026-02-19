'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../lib/api';

// -- Existing Types ---------------------------------------------------------------

interface FunnelStage { label: string; count: number; color: string; pct: number; }

interface WeeklyDay { day: string; calls: number; appointments: number; conversions: number; }

interface Campaign { name: string; calls: number; appointments: number; conversion: number; cost: number; cost_per_appt: number; }

// -- Conversation Intelligence Types ----------------------------------------------

interface ObjectionRank {
  category: string;
  count: number;
  color: string;
}

interface TalkListenRatio {
  agent_pct: number;
  lead_pct: number;
}

interface GoldenPathStep {
  label: string;
  pct: number;
  is_winning: boolean;
}

interface GoldenPath {
  steps: GoldenPathStep[];
  conversion_rate: number;
}

interface CoachingSummary {
  avg_grade: string;
  avg_grade_score: number;
  most_common_improvements: string[];
  week_over_week_change: number; // positive = improvement, negative = regression
}

interface IntelligenceData {
  objection_ranking: ObjectionRank[];
  talk_listen_ratio: TalkListenRatio;
  golden_paths: GoldenPath[];
  coaching_summary: CoachingSummary;
}

// -- Revenue Attribution Types ----------------------------------------------------

interface RevenueByCampaign {
  name: string;
  revenue: number;
  color: string;
}

interface RevenueByScript {
  name: string;
  revenue: number;
  conversion: number;
}

interface RevenueData {
  by_campaign: RevenueByCampaign[];
  by_script: RevenueByScript[];
  cost_per_qualified_lead: number;
  cost_per_appointment: number;
  projected_monthly_revenue: number;
  total_spend: number;
  total_revenue: number;
  roi_pct: number;
}

// -- Grade color helper -----------------------------------------------------------

function gradeColor(grade: string): string {
  if (grade === 'A') return 'text-emerald-400';
  if (grade === 'B') return 'text-blue-400';
  if (grade === 'C') return 'text-amber-400';
  if (grade === 'D') return 'text-orange-400';
  return 'text-red-400';
}

// -- Page Component ---------------------------------------------------------------

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [weekly, setWeekly] = useState<WeeklyDay[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  // Fetch performance data
  useEffect(() => {
    apiFetch(`/analytics/performance?period=${period}`).then(r => r.json()).then(d => {
      if (d.funnel) setFunnel(d.funnel);
      if (d.weekly) setWeekly(d.weekly);
      if (d.campaigns) setCampaigns(d.campaigns);
    }).catch(() => {});
  }, [period]);

  // Fetch conversation intelligence
  useEffect(() => {
    apiFetch(`/analytics/intelligence?period=${period}`).then(r => r.json()).then(d => {
      if (d.data) setIntelligence(d.data);
    }).catch(() => {});
  }, [period]);

  // Fetch revenue attribution
  useEffect(() => {
    apiFetch(`/analytics/revenue?period=${period}`).then(r => r.json()).then(d => {
      if (d.data) setRevenue(d.data);
    }).catch(() => {});
  }, [period]);

  const maxCalls = Math.max(...weekly.map(d => d.calls), 1);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90 tracking-tight">Analytics</h2>
          <p className="text-sm text-white/25">Performance metrics and conversion analysis</p>
        </div>
        <div className="flex rounded-lg border border-white/[0.04] overflow-hidden">
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs capitalize ${period === p ? 'bg-blue-500/20 text-blue-400' : 'text-white/25 hover:text-white/90'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4">Conversion Funnel</h3>
        {funnel.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-8">No funnel data available</p>
        ) : (
          <div className="space-y-3">
            {funnel.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-4">
                <span className="text-xs text-white/40 w-32 shrink-0">{stage.label}</span>
                <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <div className="h-full rounded-lg transition-all duration-700 flex items-center justify-end px-3" style={{ width: `${stage.pct}%`, backgroundColor: `${stage.color}30`, borderRight: `2px solid ${stage.color}` }}>
                    <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count}</span>
                  </div>
                </div>
                <span className="text-xs text-white/25 w-12 text-right">{stage.pct}%</span>
                {i > 0 && <span className="text-[10px] text-white/15 w-16 text-right">{((stage.count / funnel[i - 1].count) * 100).toFixed(0)}% conv</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4">Weekly Activity</h3>
          {weekly.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No weekly data available</p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-48">
                {weekly.map(day => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
                      <div className="w-full rounded-t bg-blue-500/40 transition-all duration-500" style={{ height: `${(day.calls / maxCalls) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-white/25">{day.day}</span>
                    <span className="text-[10px] text-blue-400">{day.calls}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/40" /><span className="text-[10px] text-white/25">Calls</span></div>
              </div>
            </>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4">Campaign Performance</h3>
          {campaigns.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No campaign data available</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <div key={c.name} className="stat-mini p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/90 font-medium">{c.name}</span>
                    <span className="text-xs text-emerald-400">{c.conversion}% conv</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-sm font-bold text-blue-400">{c.calls}</p><p className="text-[10px] text-white/15">calls</p></div>
                    <div><p className="text-sm font-bold text-emerald-400">{c.appointments}</p><p className="text-[10px] text-white/15">appts</p></div>
                    <div><p className="text-sm font-bold text-amber-400">${c.cost.toFixed(2)}</p><p className="text-[10px] text-white/15">cost</p></div>
                    <div><p className="text-sm font-bold text-purple-400">${c.cost_per_appt.toFixed(2)}</p><p className="text-[10px] text-white/15">/appt</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">--</p>
          <p className="text-[10px] text-white/25">Avg Cost/Call</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">--</p>
          <p className="text-[10px] text-white/25">Avg Cost/Appointment</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">--</p>
          <p className="text-[10px] text-white/25">Avg Call Duration</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">--</p>
          <p className="text-[10px] text-white/25">Connect Rate</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">--</p>
          <p className="text-[10px] text-white/25">Booking Rate</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
         CONVERSATION INTELLIGENCE
         ════════════════════════════════════════════════════════════════════════ */}

      <div className="pt-2">
        <h2 className="text-lg font-bold text-white/90 tracking-tight mb-1">Conversation Intelligence</h2>
        <p className="text-sm text-white/25 mb-5">Deep analysis of call patterns, objection handling, and coaching trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objection Ranking */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            Objection Ranking
          </h3>
          {!intelligence || intelligence.objection_ranking.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No objection data available yet</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxCount = Math.max(...intelligence.objection_ranking.map(o => o.count), 1);
                return intelligence.objection_ranking.map((obj) => (
                  <div key={obj.category} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-28 shrink-0 truncate">{obj.category}</span>
                    <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                        style={{ width: `${(obj.count / maxCount) * 100}%`, backgroundColor: `${obj.color}40` }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: obj.color }}>{obj.count}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Talk-to-Listen Ratio */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Talk-to-Listen Ratio
          </h3>
          {!intelligence ? (
            <p className="text-xs text-white/25 text-center py-8">No ratio data available yet</p>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div className="h-10 rounded-lg overflow-hidden flex">
                <div
                  className="h-full flex items-center justify-center transition-all duration-700"
                  style={{ width: `${intelligence.talk_listen_ratio.agent_pct}%`, backgroundColor: 'rgba(59,130,246,0.4)' }}
                >
                  <span className="text-[11px] font-bold text-blue-300">{intelligence.talk_listen_ratio.agent_pct}%</span>
                </div>
                <div
                  className="h-full flex items-center justify-center transition-all duration-700"
                  style={{ width: `${intelligence.talk_listen_ratio.lead_pct}%`, backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="text-[11px] font-bold text-white/40">{intelligence.talk_listen_ratio.lead_pct}%</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/40" />
                  <span className="text-[10px] text-white/40">Agent Talk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-white/10" />
                  <span className="text-[10px] text-white/40">Lead Talk</span>
                </div>
              </div>

              {/* Target indicator */}
              <div className="stat-mini p-3 flex items-center justify-between">
                <span className="text-[10px] text-white/25">Target Ratio</span>
                <span className="text-[10px] text-white/60 font-mono">30 / 70 (agent / lead)</span>
              </div>

              {/* Actual ratio text */}
              <div className="text-center">
                <span className="text-xs text-white/40">
                  Actual: <span className="text-blue-400 font-bold">{intelligence.talk_listen_ratio.agent_pct}%</span> agent / <span className="text-white/60 font-bold">{intelligence.talk_listen_ratio.lead_pct}%</span> lead
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Golden Path Analysis */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Golden Path Analysis
        </h3>
        {!intelligence || intelligence.golden_paths.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-8">No path data available yet. Golden paths are computed after sufficient call volume.</p>
        ) : (
          <div className="space-y-4">
            {intelligence.golden_paths.map((path, pi) => {
              const isWinning = path.steps.every(s => s.is_winning);
              return (
                <div key={pi} className={`rounded-xl border p-4 ${isWinning ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/[0.04] bg-white/[0.01]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isWinning && (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className={`text-xs font-medium ${isWinning ? 'text-emerald-400' : 'text-white/40'}`}>
                        {isWinning ? 'Winning Path' : `Path ${pi + 1}`}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${isWinning ? 'text-emerald-400' : 'text-white/40'}`}>
                      {path.conversion_rate}% conversion
                    </span>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {path.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-1 shrink-0">
                        <div className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border ${
                          step.is_winning
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                        }`}>
                          {step.label}
                          <span className={`ml-1.5 text-[9px] ${step.is_winning ? 'text-emerald-400/60' : 'text-white/20'}`}>{step.pct}%</span>
                        </div>
                        {si < path.steps.length - 1 && (
                          <svg className={`w-3 h-3 shrink-0 ${step.is_winning ? 'text-emerald-500/30' : 'text-white/10'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coaching Summary */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Coaching Summary
        </h3>
        {!intelligence?.coaching_summary ? (
          <p className="text-xs text-white/25 text-center py-8">No coaching summary available yet. Requires analyzed calls.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Average Grade */}
            <div className="stat-mini p-4 text-center">
              <p className={`text-3xl font-bold ${gradeColor(intelligence.coaching_summary.avg_grade)}`}>
                {intelligence.coaching_summary.avg_grade}
              </p>
              <p className="text-[10px] text-white/25 mt-1">Average Call Grade</p>
            </div>

            {/* Week-over-Week Trend */}
            <div className="stat-mini p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {intelligence.coaching_summary.week_over_week_change >= 0 ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                  </svg>
                )}
                <span className={`text-2xl font-bold ${intelligence.coaching_summary.week_over_week_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {intelligence.coaching_summary.week_over_week_change >= 0 ? '+' : ''}{intelligence.coaching_summary.week_over_week_change}%
                </span>
              </div>
              <p className="text-[10px] text-white/25 mt-1">Week-over-Week</p>
            </div>

            {/* Most Common Improvements */}
            <div className="stat-mini p-4">
              <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Top Improvement Areas</p>
              {intelligence.coaching_summary.most_common_improvements.length === 0 ? (
                <p className="text-xs text-white/25">None identified</p>
              ) : (
                <ul className="space-y-1">
                  {intelligence.coaching_summary.most_common_improvements.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-white/60">
                      <svg className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
         REVENUE & ROI
         ════════════════════════════════════════════════════════════════════════ */}

      <div className="pt-2">
        <h2 className="text-lg font-bold text-white/90 tracking-tight mb-1">Revenue & ROI</h2>
        <p className="text-sm text-white/25 mb-5">Revenue attribution, cost efficiency, and return on investment</p>
      </div>

      {/* ROI Dashboard KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-emerald-400">{revenue ? `$${revenue.total_revenue.toLocaleString()}` : '--'}</p>
          <p className="text-[10px] text-white/25 mt-1">Total Revenue</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-red-400">{revenue ? `$${revenue.total_spend.toLocaleString()}` : '--'}</p>
          <p className="text-[10px] text-white/25 mt-1">Total Spend</p>
        </div>
        <div className="kpi-card text-center">
          <p className={`text-2xl font-bold ${revenue && revenue.roi_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {revenue ? `${revenue.roi_pct >= 0 ? '+' : ''}${revenue.roi_pct.toFixed(0)}%` : '--'}
          </p>
          <p className="text-[10px] text-white/25 mt-1">ROI</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-amber-400">{revenue ? `$${revenue.cost_per_qualified_lead.toFixed(2)}` : '--'}</p>
          <p className="text-[10px] text-white/25 mt-1">Cost / Qualified Lead</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-blue-400">{revenue ? `$${revenue.cost_per_appointment.toFixed(2)}` : '--'}</p>
          <p className="text-[10px] text-white/25 mt-1">Cost / Appointment</p>
        </div>
      </div>

      {/* Projected Monthly Revenue */}
      <div className="glass-panel p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-white/90 tracking-tight">Projected Monthly Revenue</h3>
            <p className="text-[10px] text-white/25">Based on current conversion rate and call volume</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-cyan-400 font-mono">
          {revenue ? `$${revenue.projected_monthly_revenue.toLocaleString()}` : '--'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Campaign */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Revenue by Campaign
          </h3>
          {!revenue || revenue.by_campaign.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No revenue data by campaign available</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxRevenue = Math.max(...revenue.by_campaign.map(c => c.revenue), 1);
                return revenue.by_campaign.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-32 shrink-0 truncate">{c.name}</span>
                    <div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center justify-end px-2"
                        style={{ width: `${(c.revenue / maxRevenue) * 100}%`, backgroundColor: `${c.color}30`, borderRight: `2px solid ${c.color}` }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: c.color }}>${c.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Revenue by Script */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Revenue by Script
          </h3>
          {!revenue || revenue.by_script.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No revenue data by script available</p>
          ) : (
            <div className="space-y-3">
              {revenue.by_script.map((s) => (
                <div key={s.name} className="stat-mini p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/90 font-medium">{s.name}</span>
                    <span className="text-xs text-emerald-400 font-bold">${s.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">Conversion Rate</span>
                    <span className="text-[10px] text-purple-400 font-mono">{s.conversion}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
