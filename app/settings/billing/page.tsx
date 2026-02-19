'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

interface BillingBreakdown {
  service: string;
  cost: number;
  pct: number;
  note?: string;
}

interface BillingData {
  current_period: { start: string; end: string };
  total: number;
  breakdown: BillingBreakdown[];
  calls_count: number;
  minutes_used: number;
  characters_tts: number;
}

interface BillingHistory {
  period: string;
  total: number;
  calls: number;
  status: string;
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [history, setHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await apiFetch('/billing/summary');
        if (res.ok) {
          const d = await res.json();
          if (d.data) {
            setBilling(d.data);
          }
        }
      } catch {}

      try {
        const res = await apiFetch('/billing/history');
        if (res.ok) {
          const d = await res.json();
          if (d.data && Array.isArray(d.data)) {
            setHistory(d.data);
          }
        }
      } catch {}

      setLoading(false);
    }
    fetchBilling();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fadeInUp">
      <div>
        <h2 className="text-xl font-bold text-white/90 tracking-tight">Billing</h2>
        <p className="text-sm text-white/25">Usage and cost tracking</p>
      </div>

      {!billing ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-sm text-white/25">No billing data available yet. Usage will appear after your first calls.</p>
        </div>
      ) : (
        <>
          {/* Current Period */}
          <div className="glass-panel bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-white/25">Current Period</p>
                <p className="text-sm text-white/40">{billing.current_period.start} to {billing.current_period.end}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white/90 tracking-tight">${billing.total.toFixed(2)}</p>
                <p className="text-xs text-white/25">{billing.calls_count} calls &middot; {billing.minutes_used} minutes</p>
              </div>
            </div>

            <div className="space-y-3">
              {billing.breakdown.map(item => (
                <div key={item.service} className="flex items-center justify-between">
                  <span className="text-sm text-white/60">{item.service}</span>
                  <div className="flex items-center gap-3">
                    {item.note && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{item.note}</span>}
                    <span className="text-sm text-white/90 font-medium">${item.cost.toFixed(2)}</span>
                    <span className="text-xs text-white/25 w-12 text-right">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-mini p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{billing.calls_count}</p>
              <p className="text-xs text-white/25">Total Calls</p>
            </div>
            <div className="stat-mini p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{billing.minutes_used}</p>
              <p className="text-xs text-white/25">Minutes Used</p>
            </div>
            <div className="stat-mini p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{(billing.characters_tts / 1000).toFixed(0)}K</p>
              <p className="text-xs text-white/25">TTS Characters</p>
            </div>
          </div>
        </>
      )}

      {/* Cost Optimization Tips */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h3 className="text-sm font-medium text-amber-400 tracking-tight mb-3">Cost Optimization</h3>
        <ul className="space-y-2 text-xs text-white/40">
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">{'\u2192'}</span> ElevenLabs TTS is typically the largest cost. Keep AI responses short and punchy.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">{'\u2192'}</span> Cache common phrases (greetings, disclosures) to avoid repeated TTS calls.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">{'\u2192'}</span> Azure free tier models reduce LLM costs significantly.</li>
          <li className="flex items-start gap-2"><span className="text-amber-400 shrink-0">{'\u2192'}</span> Monitor per-call costs in the analytics dashboard.</li>
        </ul>
      </div>

      {/* History */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Billing History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-white/25">No billing history yet.</p>
        ) : (
          history.map(h => (
            <div key={h.period} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-white/60">{h.period}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/25">{h.calls} calls</span>
                <span className="text-sm text-white/90 font-medium">${h.total.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${h.status === 'current' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{h.status === 'current' ? 'CURRENT' : 'PAID'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
