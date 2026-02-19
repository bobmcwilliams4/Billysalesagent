'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../lib/api';

interface FunnelStage { label: string; count: number; color: string; pct: number; }

interface WeeklyDay { day: string; calls: number; appointments: number; conversions: number; }

interface Campaign { name: string; calls: number; appointments: number; conversion: number; cost: number; cost_per_appt: number; }

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [weekly, setWeekly] = useState<WeeklyDay[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    apiFetch(`/analytics/performance?period=${period}`).then(r => r.json()).then(d => {
      if (d.funnel) setFunnel(d.funnel);
      if (d.weekly) setWeekly(d.weekly);
      if (d.campaigns) setCampaigns(d.campaigns);
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
    </div>
  );
}
