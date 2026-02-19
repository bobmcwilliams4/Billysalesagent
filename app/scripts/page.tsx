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

interface Objection {
  id: string;
  category: string;
  objection_text: string;
  rebuttal: string;
  success_rate: number;
  times_used: number;
  last_used: string;
}

const OBJECTION_CATEGORIES = ['Price', 'Timing', 'Competitor', 'Trust', 'Need', 'Authority', 'Spouse/Partner'] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Price: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  Timing: { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  Competitor: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  Trust: { bg: 'rgba(139,92,246,0.08)', text: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  Need: { bg: 'rgba(6,182,212,0.08)', text: '#06b6d4', border: 'rgba(6,182,212,0.25)' },
  Authority: { bg: 'rgba(249,115,22,0.08)', text: '#f97316', border: 'rgba(249,115,22,0.25)' },
  'Spouse/Partner': { bg: 'rgba(16,185,129,0.08)', text: '#10b981', border: 'rgba(16,185,129,0.25)' },
};

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

  // Objection Library state
  const [objections, setObjections] = useState<Objection[]>([]);
  const [objectionSearch, setObjectionSearch] = useState('');
  const [objectionFilter, setObjectionFilter] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showNewObjection, setShowNewObjection] = useState(false);
  const [newObjection, setNewObjection] = useState({ category: 'Price', objection_text: '', rebuttal: '' });

  useEffect(() => {
    apiFetch(`/scripts`).then(r => r.json()).then(d => { if (d.data?.length) setScripts(d.data); }).catch(() => {});
    apiFetch(`/scripts/objections`).then(r => r.json()).then(d => { if (d.data?.length) setObjections(d.data); }).catch(() => {});
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

  const addObjection = async () => {
    if (!newObjection.objection_text.trim() || !newObjection.rebuttal.trim()) return;
    try {
      const res = await apiFetch(`/scripts/objections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObjection),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) setObjections(prev => [data.data, ...prev]);
      }
    } catch {}
    setShowNewObjection(false);
    setNewObjection({ category: 'Price', objection_text: '', rebuttal: '' });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Filter and group objections
  const filteredObjections = objections.filter(o => {
    const matchesSearch = !objectionSearch || o.objection_text.toLowerCase().includes(objectionSearch.toLowerCase()) || o.rebuttal.toLowerCase().includes(objectionSearch.toLowerCase());
    const matchesFilter = objectionFilter === 'All' || o.category === objectionFilter;
    return matchesSearch && matchesFilter;
  });

  const groupedObjections: Record<string, Objection[]> = {};
  for (const o of filteredObjections) {
    if (!groupedObjections[o.category]) groupedObjections[o.category] = [];
    groupedObjections[o.category].push(o);
  }

  const rateColor = (rate: number) => rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>Scripts</h2>
          <p className="text-sm" style={{ color: 'var(--text-24)' }}>AI call scripts with state machine flow</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm font-medium">
          + New Script
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel-elevated p-6 space-y-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>Create Script</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Script name" className="input-glass w-full px-4 py-2.5" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={3} className="input-glass w-full px-4 py-2.5 resize-none" />
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className="input-glass w-full px-4 py-2.5">
              <option value="insurance">Insurance (General)</option>
              <option value="auto_insurance">Auto Insurance</option>
              <option value="home_insurance">Home Insurance</option>
              <option value="life_insurance">Life Insurance</option>
              <option value="commercial">Commercial Insurance</option>
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
              <button onClick={createScript} className="btn-primary flex-1 py-2 text-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Script Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scripts.map(script => (
          <div key={script.id} className="glass-panel p-5 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-100)' }}>{script.name}</h3>
                  {script.active && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ACTIVE</span>}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-24)' }}>{script.description}</p>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-12)' }}>v{script.version}</span>
            </div>

            {/* State Flow Visualization */}
            <div className="flex items-center gap-1 my-4 overflow-x-auto pb-2">
              {Object.keys(script.states).map((state, i, arr) => (
                <div key={state} className="flex items-center gap-1 shrink-0">
                  <div className="px-2 py-1 rounded text-[10px] font-mono border" style={{ borderColor: `${STATE_COLORS[state] || '#6B7280'}40`, color: STATE_COLORS[state] || '#6B7280', backgroundColor: `${STATE_COLORS[state] || '#6B7280'}10` }}>
                    {state.replace(/_/g, ' ')}
                  </div>
                  {i < arr.length - 1 && <span className="text-xs" style={{ color: 'var(--text-12)' }}>{'\u2192'}</span>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-24)' }}>
                <span>{Object.keys(script.states).length} states</span>
                <span>{script.industry}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => duplicateScript(script)} className="btn-ghost px-3 py-1.5 text-xs">Duplicate</button>
                <Link href={`/scripts/${script.id}`} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.2)' }}>Edit</Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OBJECTION LIBRARY
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>Objection Library</h2>
            <p className="text-sm" style={{ color: 'var(--text-24)' }}>Winning rebuttals organized by category</p>
          </div>
          <button onClick={() => setShowNewObjection(true)} className="btn-primary px-4 py-2 text-sm font-medium">
            + New Objection
          </button>
        </div>

        {/* Search + Filter Bar */}
        <div className="filter-bar flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-24)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={objectionSearch}
              onChange={e => setObjectionSearch(e.target.value)}
              placeholder="Search objections and rebuttals..."
              className="input-glass w-full pl-10 pr-4 py-2"
            />
          </div>
          <select value={objectionFilter} onChange={e => setObjectionFilter(e.target.value)} className="input-glass px-4 py-2">
            <option value="All">All Categories</option>
            {OBJECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* New Objection Modal */}
        {showNewObjection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg glass-panel-elevated p-6 space-y-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>Add Objection</h3>
              <select value={newObjection.category} onChange={e => setNewObjection(p => ({ ...p, category: e.target.value }))} className="input-glass w-full px-4 py-2.5">
                {OBJECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={newObjection.objection_text} onChange={e => setNewObjection(p => ({ ...p, objection_text: e.target.value }))} placeholder="What the prospect says..." rows={2} className="input-glass w-full px-4 py-2.5 resize-none" />
              <textarea value={newObjection.rebuttal} onChange={e => setNewObjection(p => ({ ...p, rebuttal: e.target.value }))} placeholder="Winning rebuttal..." rows={4} className="input-glass w-full px-4 py-2.5 resize-none" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowNewObjection(false); setNewObjection({ category: 'Price', objection_text: '', rebuttal: '' }); }} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
                <button onClick={addObjection} className="btn-primary flex-1 py-2 text-sm">Add Objection</button>
              </div>
            </div>
          </div>
        )}

        {/* Objection Accordion */}
        {objections.length === 0 ? (
          <div className="empty-state glass-panel">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <h3>No objections recorded yet</h3>
            <p>They'll appear here as calls happen.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(objectionFilter === 'All' ? OBJECTION_CATEGORIES : [objectionFilter]).map(category => {
              const items = groupedObjections[category];
              if (!items || items.length === 0) return null;
              const isExpanded = expandedCategories.has(category);
              const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Price;
              return (
                <div key={category} className="glass-panel overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
                    style={{ background: isExpanded ? colors.bg : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.text }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-100)' }}>{category}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                        {items.length}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-48)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Objection Items */}
                  {isExpanded && (
                    <div className="divide-y" style={{ borderColor: 'var(--border-base)' }}>
                      {items.map(obj => (
                        <div key={obj.id} className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid var(--border-base)' }}>
                          {/* Objection text */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-24)' }}>Objection</p>
                            <p className="text-sm" style={{ color: 'var(--text-72)' }}>"{obj.objection_text}"</p>
                          </div>
                          {/* Rebuttal */}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: colors.text }}>Winning Rebuttal</p>
                            <p className="text-sm" style={{ color: 'var(--text-100)' }}>{obj.rebuttal}</p>
                          </div>
                          {/* Stats row */}
                          <div className="flex items-center gap-6">
                            {/* Success rate bar */}
                            <div className="flex-1 max-w-[200px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-24)' }}>Success Rate</span>
                                <span className="text-xs font-medium" style={{ color: rateColor(obj.success_rate) }}>{obj.success_rate}%</span>
                              </div>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${obj.success_rate}%`, backgroundColor: rateColor(obj.success_rate) }} />
                              </div>
                            </div>
                            {/* Times used */}
                            <div className="text-center">
                              <p className="text-xs font-medium" style={{ color: 'var(--text-72)' }}>{obj.times_used}</p>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-24)' }}>Used</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
