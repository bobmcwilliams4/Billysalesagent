'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { apiFetch } from '../lib/api';

interface Script {
  id: string;
  name: string;
  description: string;
  industry: string;
  version: number;
  active: boolean;
  states: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const STATE_COLORS: Record<string, string> = {
  GREETING: '#3B82F6', CONSENT_CHECK: '#8B5CF6', DISCOVERY: '#06B6D4', AUTO_DISCOVERY: '#06B6D4',
  PROPERTY_DISCOVERY: '#06B6D4', QUALIFICATION: '#F59E0B', RATE_COMPARISON: '#F59E0B',
  COVERAGE_ANALYSIS: '#F59E0B', BOOKING: '#10B981', OBJECTION_HANDLER: '#EF4444',
  WARM_GOODBYE: '#6B7280',
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIndustry, setNewIndustry] = useState('insurance');

  useEffect(() => {
    apiFetch(`/scripts`).then(r => r.json()).then(d => { if (d.data?.length) setScripts(d.data); }).catch(() => {});
  }, []);

  const createScript = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiFetch(`/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName, description: newDesc, industry: newIndustry,
          states: JSON.stringify({ GREETING: { system_prompt: 'Introduce yourself warmly.', transition_triggers: { DISCOVERY: ['yes', 'sure'] }, max_duration_seconds: 30 }, DISCOVERY: { system_prompt: 'Ask qualifying questions.', transition_triggers: { BOOKING: ['interested'] }, max_duration_seconds: 120 }, BOOKING: { system_prompt: 'Book the appointment.', transition_triggers: {}, max_duration_seconds: 60, is_terminal: true } }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScripts(prev => [data.data, ...prev]);
        setShowCreate(false);
        setNewName(''); setNewDesc('');
      }
    } catch {}
  };

  const duplicateScript = async (script: Script) => {
    try {
      const res = await apiFetch(`/scripts/${script.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScripts(prev => [data.data, ...prev]);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90 tracking-tight">Scripts</h2>
          <p className="text-sm text-white/25">AI call scripts with state machine flow</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white/90 text-sm font-medium transition-colors">
          + New Script
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111128] p-6 space-y-4">
            <h3 className="text-lg font-bold text-white/90 tracking-tight">Create Script</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Script name" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50 resize-none" />
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50">
              <option value="insurance">Insurance (General)</option>
              <option value="auto_insurance">Auto Insurance</option>
              <option value="home_insurance">Home Insurance</option>
              <option value="life_insurance">Life Insurance</option>
              <option value="commercial">Commercial Insurance</option>
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/90 text-sm transition-colors">Cancel</button>
              <button onClick={createScript} className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white/90 text-sm font-medium transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Script Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scripts.map(script => (
          <div key={script.id} className="glass-panel p-5 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white/90">{script.name}</h3>
                  {script.active && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ACTIVE</span>}
                </div>
                <p className="text-xs text-white/25 mt-1">{script.description}</p>
              </div>
              <span className="text-xs text-white/15">v{script.version}</span>
            </div>

            {/* State Flow Visualization */}
            <div className="flex items-center gap-1 my-4 overflow-x-auto pb-2">
              {Object.keys(script.states).map((state, i, arr) => (
                <div key={state} className="flex items-center gap-1 shrink-0">
                  <div className="px-2 py-1 rounded text-[10px] font-mono border" style={{ borderColor: `${STATE_COLORS[state] || '#6B7280'}40`, color: STATE_COLORS[state] || '#6B7280', backgroundColor: `${STATE_COLORS[state] || '#6B7280'}10` }}>
                    {state.replace(/_/g, ' ')}
                  </div>
                  {i < arr.length - 1 && <span className="text-white/15 text-xs">{'\u2192'}</span>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-white/25">
                <span>{Object.keys(script.states).length} states</span>
                <span>{script.industry}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => duplicateScript(script)} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/90 border border-white/[0.04] hover:border-white/10 transition-colors">Duplicate</button>
                <Link href={`/scripts/${script.id}`} className="px-3 py-1.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/30 transition-colors">Edit</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
