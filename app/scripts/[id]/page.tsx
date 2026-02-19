'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { apiFetch } from '../../lib/api';

interface ScriptState {
  system_prompt: string;
  transition_triggers: Record<string, string[]>;
  objection_map: Record<string, string>;
  max_duration_seconds: number;
  required_data: string[];
  is_terminal?: boolean;
}

interface Script {
  id: string;
  name: string;
  description: string;
  industry: string;
  version: number;
  personality: string;
  states: Record<string, ScriptState>;
  objection_handlers: Record<string, string>;
}

const STATE_COLORS: Record<string, string> = {
  GREETING: '#3B82F6', CONSENT_CHECK: '#8B5CF6', DISCOVERY: '#06B6D4',
  QUALIFICATION: '#F59E0B', BOOKING: '#10B981', OBJECTION_HANDLER: '#EF4444', WARM_GOODBYE: '#6B7280',
};

export default function ScriptEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const [script, setScript] = useState<Script | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingDuration, setEditingDuration] = useState(30);
  const [editingPersonality, setEditingPersonality] = useState('');
  const [saving, setSaving] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScript() {
      try {
        const res = await apiFetch(`/scripts/${id}`);
        if (res.ok) {
          const d = await res.json();
          if (d.data) {
            const s = d.data;
            s.states = typeof s.states === 'string' ? JSON.parse(s.states) : s.states;
            s.objection_handlers = typeof s.objection_handlers === 'string' ? JSON.parse(s.objection_handlers) : (s.objection_handlers || {});
            setScript(s);
            setEditingPersonality(s.personality || '');
            const firstState = Object.keys(s.states)[0];
            if (firstState) {
              setSelectedState(firstState);
              setEditingPrompt(s.states[firstState].system_prompt || '');
              setEditingDuration(s.states[firstState].max_duration_seconds || 30);
            }
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchScript();
  }, [id]);

  const selectState = (state: string) => {
    if (!script) return;
    setSelectedState(state);
    setEditingPrompt(script.states[state]?.system_prompt || '');
    setEditingDuration(script.states[state]?.max_duration_seconds || 30);
  };

  const saveScript = async () => {
    if (!script || !selectedState) return;
    setSaving(true);
    const updated = { ...script };
    updated.states[selectedState] = { ...updated.states[selectedState], system_prompt: editingPrompt, max_duration_seconds: editingDuration };
    updated.personality = editingPersonality;
    try {
      await apiFetch(`/scripts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: JSON.stringify(updated.states), personality: editingPersonality }),
      });
      setScript(updated);
    } catch {}
    setSaving(false);
  };

  const testScript = async () => {
    if (!testInput.trim()) return;
    setTestOutput('Thinking...');
    try {
      const res = await apiFetch('/billy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `[SCRIPT TEST] State: ${selectedState}. Lead says: "${testInput}". Respond in character using this prompt: ${editingPrompt}` }),
      });
      const data = await res.json();
      setTestOutput(data.response || 'No response');
    } catch {
      setTestOutput('API not available. Deploy billymc-api first.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="animate-fadeInUp">
        <div className="glass-panel p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white/90 tracking-tight mb-2">Script Not Found</h3>
          <p className="text-sm text-white/25">Script #{id} could not be loaded. It may not exist or the API is unavailable.</p>
          <a href="/scripts" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors">Back to Scripts</a>
        </div>
      </div>
    );
  }

  const stateNames = Object.keys(script.states);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90 tracking-tight">{script.name}</h2>
          <p className="text-sm text-white/25">{script.description} &middot; v{script.version}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setTestMode(!testMode)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${testMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'border border-white/10 text-white/40 hover:text-white/90'}`}>
            {testMode ? 'Exit Test' : 'Test Mode'}
          </button>
          <button onClick={saveScript} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white/90 text-sm font-medium transition-colors">
            {saving ? 'Saving...' : 'Save Script'}
          </button>
        </div>
      </div>

      {/* State Flow */}
      <div className="glass-panel p-4">
        <p className="text-xs text-white/25 mb-3">CALL FLOW</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stateNames.map((state, i) => (
            <div key={state} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => selectState(state)}
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                  selectedState === state
                    ? 'ring-2 ring-offset-2 ring-offset-[#060612]'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  borderColor: `${STATE_COLORS[state] || '#6B7280'}60`,
                  color: STATE_COLORS[state] || '#6B7280',
                  backgroundColor: `${STATE_COLORS[state] || '#6B7280'}15`,
                  ...(selectedState === state ? { ringColor: STATE_COLORS[state] || '#6B7280' } : {}),
                }}
              >
                {state.replace(/_/g, ' ')}
              </button>
              {i < stateNames.length - 1 && <span className="text-white/15">{'\u2192'}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          {/* System Prompt */}
          <div className="glass-panel p-5">
            <label className="text-xs text-white/25 uppercase tracking-wider mb-2 block">System Prompt {selectedState ? `\u2014 ${selectedState}` : ''}</label>
            <textarea
              value={editingPrompt}
              onChange={e => setEditingPrompt(e.target.value)}
              rows={8}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/90 font-mono placeholder-white/15 focus:outline-none focus:border-blue-500/50 resize-y"
              placeholder="Enter the AI's instructions for this state..."
            />
          </div>

          {/* Duration */}
          <div className="glass-panel p-5">
            <label className="text-xs text-white/25 uppercase tracking-wider mb-2 block">Max Duration: {editingDuration}s</label>
            <input type="range" min={10} max={180} value={editingDuration} onChange={e => setEditingDuration(Number(e.target.value))} className="w-full accent-blue-500" />
          </div>

          {/* Personality */}
          <div className="glass-panel p-5">
            <label className="text-xs text-white/25 uppercase tracking-wider mb-2 block">Global Personality</label>
            <textarea
              value={editingPersonality}
              onChange={e => setEditingPersonality(e.target.value)}
              rows={4}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/90 font-mono placeholder-white/15 focus:outline-none focus:border-blue-500/50 resize-y"
              placeholder="Overall AI personality..."
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Transitions */}
          {selectedState && script.states[selectedState] && (
            <div className="glass-panel p-5">
              <p className="text-xs text-white/25 uppercase tracking-wider mb-3">Transitions from {selectedState}</p>
              {Object.keys(script.states[selectedState].transition_triggers || {}).length === 0 ? (
                <p className="text-xs text-white/15">No transitions defined.</p>
              ) : (
                Object.entries(script.states[selectedState].transition_triggers || {}).map(([target, triggers]) => (
                  <div key={target} className="mb-3 p-3 rounded-lg bg-white/5 border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/40">{'\u2192'}</span>
                      <span className="text-xs font-mono" style={{ color: STATE_COLORS[target] || '#6B7280' }}>{target}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(triggers as string[]).map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/40 border border-white/[0.04]">{t}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Objections */}
          {selectedState && script.states[selectedState]?.objection_map && Object.keys(script.states[selectedState].objection_map).length > 0 && (
            <div className="glass-panel p-5">
              <p className="text-xs text-white/25 uppercase tracking-wider mb-3">Objection Handlers</p>
              {Object.entries(script.states[selectedState].objection_map).map(([key, response]) => (
                <div key={key} className="mb-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-xs font-mono text-red-400 mb-1">{key}</p>
                  <p className="text-xs text-white/40">{response as string}</p>
                </div>
              ))}
            </div>
          )}

          {/* Required Data */}
          {selectedState && script.states[selectedState]?.required_data?.length > 0 && (
            <div className="glass-panel p-5">
              <p className="text-xs text-white/25 uppercase tracking-wider mb-3">Data to Extract</p>
              <div className="flex flex-wrap gap-2">
                {script.states[selectedState].required_data.map(field => (
                  <span key={field} className="px-3 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{field}</span>
                ))}
              </div>
            </div>
          )}

          {/* Test Mode */}
          {testMode && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-xs text-amber-400 uppercase tracking-wider mb-3">Test -- Simulate Lead Response</p>
              <input
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && testScript()}
                placeholder="Type what the lead would say..."
                className="w-full bg-black/30 border border-amber-500/20 rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-amber-500/50 mb-3"
              />
              <button onClick={testScript} className="w-full px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors mb-3">Run Test</button>
              {testOutput && (
                <div className="p-3 rounded-lg bg-black/30 border border-white/[0.04]">
                  <p className="text-xs text-white/25 mb-1">AI Response:</p>
                  <p className="text-sm text-white/60">{testOutput}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
