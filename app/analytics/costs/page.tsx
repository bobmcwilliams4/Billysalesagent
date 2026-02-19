'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

interface CostBreakdown {
  service: string;
  cost: number;
  units: number;
  unit_type: string;
  color: string;
}

interface DailyCost {
  date: string;
  twilio: number;
  deepgram: number;
  elevenlabs: number;
  llm: number;
  total: number;
}

export default function CostCenterPage() {
  const [costs, setCosts] = useState<CostBreakdown[]>([]);
  const [daily, setDaily] = useState<DailyCost[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    apiFetch(`/analytics/costs?period=${period}`).then(r => r.json()).then(d => {
      if (d.breakdown) setCosts(d.breakdown);
      if (d.daily) setDaily(d.daily);
    }).catch(() => {});
  }, [period]);

  const totalCost = costs.reduce((s, c) => s + c.cost, 0);
  const maxDaily = Math.max(...daily.map(d => d.total), 1);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90 tracking-tight">Cost Center</h2>
          <p className="text-sm text-white/25">Real-time cost tracking by service and period</p>
        </div>
        <div className="flex rounded-lg border border-white/[0.04] overflow-hidden">
          {(['today', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs capitalize ${period === p ? 'bg-blue-500/20 text-blue-400' : 'text-white/25 hover:text-white/90'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="glass-panel bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
        <p className="text-xs text-white/25 uppercase tracking-wider mb-1">Total Cost ({period})</p>
        <p className="text-4xl font-bold text-white/90 tracking-tight">${totalCost.toFixed(2)}</p>
        <p className="text-sm text-white/40 mt-1">{costs.reduce((s, c) => s + c.units, 0).toLocaleString()} total units across {costs.length} services</p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white/90 tracking-tight">By Service</h3>
          {costs.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No cost data available</p>
          ) : (
            costs.map(c => (
              <div key={c.service} className="glass-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/90">{c.service}</span>
                  <span className="text-sm font-bold" style={{ color: c.color }}>${c.cost.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalCost > 0 ? (c.cost / totalCost) * 100 : 0}%`, backgroundColor: c.color }} />
                </div>
                <div className="flex justify-between text-[10px] text-white/25">
                  <span>{c.units.toLocaleString()} {c.unit_type}</span>
                  <span>{totalCost > 0 ? ((c.cost / totalCost) * 100).toFixed(1) : 0}% of total</span>
                </div>
                {c.cost === 0 && <p className="text-[10px] text-emerald-400 mt-1">FREE via Azure/GitHub Models</p>}
              </div>
            ))
          )}
        </div>

        {/* Daily Chart */}
        <div>
          <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Daily Spend</h3>
          <div className="glass-panel p-4">
            {daily.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-8">No daily data available</p>
            ) : (
              <>
                <div className="flex items-end gap-1 h-48">
                  {daily.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full flex flex-col-reverse gap-0 rounded-t overflow-hidden" style={{ height: `${(d.total / maxDaily) * 160}px` }}>
                        <div style={{ height: `${d.total > 0 ? d.twilio / d.total * 100 : 0}%`, backgroundColor: '#3B82F640' }} />
                        <div style={{ height: `${d.total > 0 ? d.deepgram / d.total * 100 : 0}%`, backgroundColor: '#10B98140' }} />
                        <div style={{ height: `${d.total > 0 ? d.elevenlabs / d.total * 100 : 0}%`, backgroundColor: '#F59E0B40' }} />
                      </div>
                      <p className="text-[9px] text-white/15 mt-1">{d.date.slice(5)}</p>
                      <p className="text-[10px] text-white/90 font-medium">${d.total.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-blue-500/40" /><span className="text-[10px] text-white/25">Twilio</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-emerald-500/40" /><span className="text-[10px] text-white/25">Deepgram</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-amber-500/40" /><span className="text-[10px] text-white/25">ElevenLabs</span></div>
                </div>
              </>
            )}
          </div>

          {/* Per-Call Economics */}
          <div className="mt-4 glass-panel p-4">
            <h4 className="text-xs text-white/25 mb-3">PER-CALL ECONOMICS</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 stat-mini">
                <p className="text-lg font-bold text-blue-400">--</p>
                <p className="text-[10px] text-white/25">Avg Cost/Call</p>
              </div>
              <div className="text-center p-3 stat-mini">
                <p className="text-lg font-bold text-emerald-400">--</p>
                <p className="text-[10px] text-white/25">Cost/Appointment</p>
              </div>
              <div className="text-center p-3 stat-mini">
                <p className="text-lg font-bold text-amber-400">--</p>
                <p className="text-[10px] text-white/25">Cost/Qualified Lead</p>
              </div>
              <div className="text-center p-3 stat-mini">
                <p className="text-lg font-bold text-purple-400">--</p>
                <p className="text-[10px] text-white/25">Cost/Conversion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Alert */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">&#x26A0;&#xFE0F;</span>
          <div>
            <p className="text-sm text-amber-400 font-medium">Budget Tracking</p>
            <p className="text-xs text-white/40">ElevenLabs is 80% of costs. Consider: shorter AI responses, response caching for common phrases, or switching to browser TTS for non-critical calls.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
