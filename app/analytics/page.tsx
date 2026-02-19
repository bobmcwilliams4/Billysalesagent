'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../lib/api';

interface FunnelStage { label: string; count: number; color: string; pct: number; }

const SAMPLE_FUNNEL: FunnelStage[] = [
  { label: 'Calls Made', count: 247, color: '#3B82F6', pct: 100 },
  { label: 'Connected', count: 168, color: '#06B6D4', pct: 68 },
  { label: 'Qualified', count: 89, color: '#F59E0B', pct: 36 },
  { label: 'Appointment Set', count: 41, color: '#10B981', pct: 17 },
  { label: 'Converted', count: 12, color: '#8B5CF6', pct: 5 },
];

const SAMPLE_WEEKLY = [
  { day: 'Mon', calls: 42, appointments: 7, conversions: 2 },
  { day: 'Tue', calls: 38, appointments: 5, conversions: 1 },
  { day: 'Wed', calls: 51, appointments: 9, conversions: 3 },
  { day: 'Thu', calls: 47, appointments: 8, conversions: 2 },
  { day: 'Fri', calls: 36, appointments: 6, conversions: 2 },
  { day: 'Sat', calls: 18, appointments: 3, conversions: 1 },
  { day: 'Sun', calls: 15, appointments: 3, conversions: 1 },
];

const SAMPLE_CAMPAIGNS = [
  { name: 'Midland Auto Insurance', calls: 89, appointments: 15, conversion: 16.9, cost: 24.92, cost_per_appt: 1.66 },
  { name: 'Permian Basin Home', calls: 67, appointments: 11, conversion: 16.4, cost: 18.76, cost_per_appt: 1.71 },
  { name: 'Life Insurance 65+', calls: 45, appointments: 8, conversion: 17.8, cost: 12.60, cost_per_appt: 1.58 },
  { name: 'Commercial Property', calls: 46, appointments: 7, conversion: 15.2, cost: 12.88, cost_per_appt: 1.84 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [funnel, setFunnel] = useState<FunnelStage[]>(SAMPLE_FUNNEL);
  const [weekly, setWeekly] = useState(SAMPLE_WEEKLY);
  const [campaigns, setCampaigns] = useState(SAMPLE_CAMPAIGNS);

  useEffect(() => {
    apiFetch(`/analytics/performance?period=${period}`).then(r => r.json()).then(d => {
      if (d.funnel) setFunnel(d.funnel);
    }).catch(() => {});
  }, [period]);

  const maxCalls = Math.max(...weekly.map(d => d.calls), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Analytics</h2>
          <p className="text-sm text-gray-500">Performance metrics and conversion analysis</p>
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(['today', 'week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs capitalize ${period === p ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h3 className="text-sm font-medium text-white mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {funnel.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="text-xs text-gray-400 w-32 shrink-0">{stage.label}</span>
              <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                <div className="h-full rounded-lg transition-all duration-700 flex items-center justify-end px-3" style={{ width: `${stage.pct}%`, backgroundColor: `${stage.color}30`, borderRight: `2px solid ${stage.color}` }}>
                  <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count}</span>
                </div>
              </div>
              <span className="text-xs text-gray-500 w-12 text-right">{stage.pct}%</span>
              {i > 0 && <span className="text-[10px] text-gray-600 w-16 text-right">{((stage.count / funnel[i - 1].count) * 100).toFixed(0)}% conv</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-medium text-white mb-4">Weekly Activity</h3>
          <div className="flex items-end gap-2 h-48">
            {weekly.map(day => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
                  <div className="w-full rounded-t bg-blue-500/40 transition-all duration-500" style={{ height: `${(day.calls / maxCalls) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{day.day}</span>
                <span className="text-[10px] text-blue-400">{day.calls}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/40" /><span className="text-[10px] text-gray-500">Calls</span></div>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-medium text-white mb-4">Campaign Performance</h3>
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.name} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white font-medium">{c.name}</span>
                  <span className="text-xs text-emerald-400">{c.conversion}% conv</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-sm font-bold text-blue-400">{c.calls}</p><p className="text-[10px] text-gray-600">calls</p></div>
                  <div><p className="text-sm font-bold text-emerald-400">{c.appointments}</p><p className="text-[10px] text-gray-600">appts</p></div>
                  <div><p className="text-sm font-bold text-amber-400">${c.cost.toFixed(2)}</p><p className="text-[10px] text-gray-600">cost</p></div>
                  <div><p className="text-sm font-bold text-purple-400">${c.cost_per_appt.toFixed(2)}</p><p className="text-[10px] text-gray-600">/appt</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">$0.28</p>
          <p className="text-[10px] text-gray-500">Avg Cost/Call</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">$1.68</p>
          <p className="text-[10px] text-gray-500">Avg Cost/Appointment</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">2:47</p>
          <p className="text-[10px] text-gray-500">Avg Call Duration</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">68%</p>
          <p className="text-[10px] text-gray-500">Connect Rate</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">17%</p>
          <p className="text-[10px] text-gray-500">Booking Rate</p>
        </div>
      </div>
    </div>
  );
}
