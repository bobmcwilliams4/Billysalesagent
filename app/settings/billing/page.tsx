'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

const SAMPLE_BILLING = {
  current_period: { start: '2026-02-01', end: '2026-02-28' },
  total: 69.16,
  breakdown: [
    { service: 'Twilio', cost: 10.37, pct: 15 },
    { service: 'Deepgram', cost: 3.21, pct: 4.6 },
    { service: 'ElevenLabs', cost: 55.58, pct: 80.4 },
    { service: 'Azure GPT-4.1', cost: 0, pct: 0, note: 'FREE until May 2026' },
  ],
  calls_count: 247,
  minutes_used: 747,
  characters_tts: 185200,
};

const SAMPLE_HISTORY = [
  { period: 'Feb 2026', total: 69.16, calls: 247, status: 'current' },
];

export default function BillingPage() {
  const [billing, setBilling] = useState(SAMPLE_BILLING);
  const [history, setHistory] = useState(SAMPLE_HISTORY);

  useEffect(() => {
    apiFetch(`/billing/summary`).then(r => r.json()).then(d => { if (d.data) setBilling(d.data); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Billing</h2>
        <p className="text-sm text-gray-500">Usage and cost tracking</p>
      </div>

      {/* Current Period */}
      <div className="rounded-xl border border-white/5 bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">Current Period</p>
            <p className="text-sm text-gray-400">{billing.current_period.start} to {billing.current_period.end}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">${billing.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{billing.calls_count} calls &middot; {billing.minutes_used} minutes</p>
          </div>
        </div>

        <div className="space-y-3">
          {billing.breakdown.map(item => (
            <div key={item.service} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{item.service}</span>
              <div className="flex items-center gap-3">
                {item.note && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{item.note}</span>}
                <span className="text-sm text-white font-medium">${item.cost.toFixed(2)}</span>
                <span className="text-xs text-gray-500 w-12 text-right">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{billing.calls_count}</p>
          <p className="text-xs text-gray-500">Total Calls</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{billing.minutes_used}</p>
          <p className="text-xs text-gray-500">Minutes Used</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{(billing.characters_tts / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-500">TTS Characters</p>
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h3 className="text-sm font-medium text-amber-400 mb-3">Cost Optimization</h3>
        <ul className="space-y-2 text-xs text-gray-400">
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">\u2192</span> ElevenLabs is 80% of costs. Keep AI responses short and punchy.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">\u2192</span> Cache common phrases (greetings, disclosures) to avoid repeated TTS calls.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">\u2192</span> Azure GPT-4.1 is FREE until May 2026 — maximize LLM-heavy features now.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">\u2192</span> At $0.28/call average, 1,000 calls/month = ~$280 total.</li>
        </ul>
      </div>

      {/* History */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-sm font-medium text-white mb-3">Billing History</h3>
        {history.map(h => (
          <div key={h.period} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-gray-300">{h.period}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">{h.calls} calls</span>
              <span className="text-sm text-white font-medium">${h.total.toFixed(2)}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${h.status === 'current' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{h.status === 'current' ? 'CURRENT' : 'PAID'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
