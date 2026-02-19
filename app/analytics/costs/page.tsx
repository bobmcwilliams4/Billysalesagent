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

const SAMPLE_COSTS: CostBreakdown[] = [
  { service: 'Twilio (Voice)', cost: 10.37, units: 247, unit_type: 'calls', color: '#3B82F6' },
  { service: 'Deepgram (STT)', cost: 3.21, units: 747, unit_type: 'minutes', color: '#10B981' },
  { service: 'ElevenLabs (TTS)', cost: 55.58, units: 185200, unit_type: 'characters', color: '#F59E0B' },
  { service: 'Azure GPT-4.1', cost: 0, units: 247, unit_type: 'calls', color: '#8B5CF6' },
];

const SAMPLE_DAILY: DailyCost[] = [
  { date: '2026-02-11', twilio: 1.48, deepgram: 0.46, elevenlabs: 7.94, llm: 0, total: 9.88 },
  { date: '2026-02-12', twilio: 1.20, deepgram: 0.37, elevenlabs: 6.42, llm: 0, total: 7.99 },
  { date: '2026-02-13', twilio: 1.62, deepgram: 0.50, elevenlabs: 8.65, llm: 0, total: 10.77 },
  { date: '2026-02-14', twilio: 1.49, deepgram: 0.46, elevenlabs: 7.96, llm: 0, total: 9.91 },
  { date: '2026-02-15', twilio: 1.14, deepgram: 0.35, elevenlabs: 6.08, llm: 0, total: 7.57 },
  { date: '2026-02-16', twilio: 0.57, deepgram: 0.18, elevenlabs: 3.05, llm: 0, total: 3.80 },
  { date: '2026-02-17', twilio: 2.87, deepgram: 0.89, elevenlabs: 15.48, llm: 0, total: 19.24 },
];

export default function CostCenterPage() {
  const [costs, setCosts] = useState<CostBreakdown[]>(SAMPLE_COSTS);
  const [daily, setDaily] = useState<DailyCost[]>(SAMPLE_DAILY);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Cost Center</h2>
          <p className="text-sm text-gray-500">Real-time cost tracking by service and period</p>
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(['today', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs capitalize ${period === p ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-xl border border-white/5 bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Cost ({period})</p>
        <p className="text-4xl font-bold text-white">${totalCost.toFixed(2)}</p>
        <p className="text-sm text-gray-400 mt-1">{costs.reduce((s, c) => s + c.units, 0).toLocaleString()} total units across {costs.length} services</p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">By Service</h3>
          {costs.map(c => (
            <div key={c.service} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">{c.service}</span>
                <span className="text-sm font-bold" style={{ color: c.color }}>${c.cost.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalCost > 0 ? (c.cost / totalCost) * 100 : 0}%`, backgroundColor: c.color }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>{c.units.toLocaleString()} {c.unit_type}</span>
                <span>{totalCost > 0 ? ((c.cost / totalCost) * 100).toFixed(1) : 0}% of total</span>
              </div>
              {c.cost === 0 && <p className="text-[10px] text-emerald-400 mt-1">FREE via Azure/GitHub Models</p>}
            </div>
          ))}
        </div>

        {/* Daily Chart */}
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Daily Spend</h3>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-end gap-1 h-48">
              {daily.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full flex flex-col-reverse gap-0 rounded-t overflow-hidden" style={{ height: `${(d.total / maxDaily) * 160}px` }}>
                    <div style={{ height: `${d.twilio / d.total * 100}%`, backgroundColor: '#3B82F640' }} />
                    <div style={{ height: `${d.deepgram / d.total * 100}%`, backgroundColor: '#10B98140' }} />
                    <div style={{ height: `${d.elevenlabs / d.total * 100}%`, backgroundColor: '#F59E0B40' }} />
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">{d.date.slice(5)}</p>
                  <p className="text-[10px] text-white font-medium">${d.total.toFixed(0)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-blue-500/40" /><span className="text-[10px] text-gray-500">Twilio</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-emerald-500/40" /><span className="text-[10px] text-gray-500">Deepgram</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-amber-500/40" /><span className="text-[10px] text-gray-500">ElevenLabs</span></div>
            </div>
          </div>

          {/* Per-Call Economics */}
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <h4 className="text-xs text-gray-500 mb-3">PER-CALL ECONOMICS</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                <p className="text-lg font-bold text-blue-400">$0.28</p>
                <p className="text-[10px] text-gray-500">Avg Cost/Call</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                <p className="text-lg font-bold text-emerald-400">$1.68</p>
                <p className="text-[10px] text-gray-500">Cost/Appointment</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                <p className="text-lg font-bold text-amber-400">$5.75</p>
                <p className="text-[10px] text-gray-500">Cost/Qualified Lead</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                <p className="text-lg font-bold text-purple-400">$23.33</p>
                <p className="text-[10px] text-gray-500">Cost/Conversion</p>
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
            <p className="text-xs text-gray-400">ElevenLabs is 80% of costs. Consider: shorter AI responses, response caching for common phrases, or switching to browser TTS for non-critical calls.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
