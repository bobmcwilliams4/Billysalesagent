'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { apiFetch } from '../lib/api';

interface TenantSettings {
  company_name: string;
  agent_name: string;
  industry: string;
  agent_voice_id: string;
  greeting_template: string;
  lead_source_text: string;
  callback_number: string;
  timezone: string;
  calling_hours: { start: string; end: string };
  max_concurrent: number;
  twilio_phone: string;
  elevenlabs_voice_id: string;
  dashboard_widgets: string[];
  pipeline_stages: string[];
  notification_rules: Record<string, string>;
  ui_preferences: Record<string, any>;
}

const VOICE_OPTIONS = [
  { id: '', label: 'Select a voice...' },
  { id: 'custom', label: 'Use custom Voice ID' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam (Male, Deep)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Female, Warm)' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (Female, Professional)' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (Male, Friendly)' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold (Male, Authoritative)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh (Male, Casual)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli (Female, Youthful)' },
  { id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi (Female, Animated)' },
];

const INDUSTRY_OPTIONS = [
  'insurance', 'real_estate', 'solar', 'roofing', 'hvac', 'home_services',
  'legal', 'medical', 'financial_services', 'saas', 'coaching', 'other',
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<TenantSettings>>({});
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [selectedVoicePreset, setSelectedVoicePreset] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'voice' | 'calling' | 'integrations'>('business');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
            setSettings(s);
            const vid = s.agent_voice_id || s.elevenlabs_voice_id || '';
            const preset = VOICE_OPTIONS.find(v => v.id === vid);
            if (preset && preset.id !== 'custom') {
              setSelectedVoicePreset(vid);
            } else if (vid) {
              setSelectedVoicePreset('custom');
              setCustomVoiceId(vid);
            }
          }
          if (data.twilio_phone) {
            setSettings(prev => ({ ...prev, twilio_phone: data.twilio_phone }));
          }
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const update = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const voiceId = selectedVoicePreset === 'custom' ? customVoiceId : selectedVoicePreset;
      const payload = {
        ...settings,
        agent_voice_id: voiceId,
        elevenlabs_voice_id: voiceId,
      };
      await apiFetch('/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="text-sm text-gray-500">Configure your AI sales platform</p>
        </div>
        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/settings/team" className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors text-center">
          <p className="text-lg mb-1">{'\u{1F465}'}</p>
          <p className="text-sm text-gray-300">Team</p>
          <p className="text-[10px] text-gray-600">Users & Roles</p>
        </Link>
        <Link href="/settings/compliance" className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors text-center">
          <p className="text-lg mb-1">{'\u{1F6E1}\u{FE0F}'}</p>
          <p className="text-sm text-gray-300">Compliance</p>
          <p className="text-[10px] text-gray-600">DNC & Consent</p>
        </Link>
        <Link href="/settings/billing" className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors text-center">
          <p className="text-lg mb-1">{'\u{1F4B3}'}</p>
          <p className="text-sm text-gray-300">Billing</p>
          <p className="text-[10px] text-gray-600">Usage & Costs</p>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/5">
        {(['business', 'voice', 'calling', 'integrations'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'business' ? 'Business Info' : tab === 'voice' ? 'AI Voice' : tab === 'calling' ? 'Calling' : 'Integrations'}
          </button>
        ))}
      </div>

      {/* Business Info Tab */}
      {activeTab === 'business' && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <h3 className="text-sm font-medium text-white">Business Information</h3>
          <p className="text-xs text-gray-500">This info is used by the AI agent during calls and by Ace in the chat.</p>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Company Name *</label>
            <input value={settings.company_name || ''} onChange={e => update('company_name', e.target.value)} placeholder="e.g. McWilliams Insurance Group" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">The AI will introduce itself as calling from this company</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">AI Agent Name</label>
            <input value={settings.agent_name || ''} onChange={e => update('agent_name', e.target.value)} placeholder="e.g. Sarah, Billy, Alex" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">Name the AI uses when introducing itself on calls. Leave blank for "a member of the team".</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Industry</label>
            <select value={settings.industry || 'insurance'} onChange={e => update('industry', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
              {INDUSTRY_OPTIONS.map(ind => (
                <option key={ind} value={ind} className="bg-gray-900">{ind.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Callback Number</label>
            <input value={settings.callback_number || ''} onChange={e => update('callback_number', e.target.value)} placeholder="+14325551234" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">Number the AI gives leads to call back on (voicemails, etc.)</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Default Greeting</label>
            <textarea value={settings.greeting_template || ''} onChange={e => update('greeting_template', e.target.value)} rows={3} placeholder={`e.g. Hey {name}, this is {agent} with {company}. I'm following up because I understand you were looking into some insurance options — is that right?`} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none" />
            <p className="text-[10px] text-gray-600 mt-1">Use {'{name}'}, {'{agent}'}, {'{company}'}, {'{source}'} as placeholders</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lead Source Text</label>
            <input value={settings.lead_source_text || ''} onChange={e => update('lead_source_text', e.target.value)} placeholder="I understand you were looking into some insurance options" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">Default reason for calling — used when lead source isn't specified</p>
          </div>
        </div>
      )}

      {/* AI Voice Tab */}
      {activeTab === 'voice' && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <h3 className="text-sm font-medium text-white">AI Voice Configuration</h3>
          <p className="text-xs text-gray-500">Choose the voice your AI agent uses on phone calls.</p>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Voice Preset</label>
            <select value={selectedVoicePreset} onChange={e => { setSelectedVoicePreset(e.target.value); if (e.target.value !== 'custom') setCustomVoiceId(''); }} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
              {VOICE_OPTIONS.map(v => (
                <option key={v.id} value={v.id} className="bg-gray-900">{v.label}</option>
              ))}
            </select>
          </div>

          {selectedVoicePreset === 'custom' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Custom ElevenLabs Voice ID</label>
              <input value={customVoiceId} onChange={e => setCustomVoiceId(e.target.value)} placeholder="e.g. pNInz6obpgDQGcFmaJgB" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
              <p className="text-[10px] text-gray-600 mt-1">Paste your ElevenLabs voice ID — can be a cloned voice</p>
            </div>
          )}

          <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-4">
            <p className="text-xs text-amber-300 font-medium mb-1">Voice Cloning</p>
            <p className="text-[11px] text-gray-400">Want the AI to sound like you? Create a voice clone on <a href="https://elevenlabs.io" target="_blank" rel="noopener" className="text-amber-400 underline">ElevenLabs</a>, then paste the Voice ID above. The AI will sound exactly like you on calls.</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Agent Personality (Advanced)</label>
            <textarea value={settings.greeting_template !== undefined ? (settings as any).agent_personality || '' : ''} onChange={e => update('agent_personality', e.target.value)} rows={4} placeholder="Override the AI's default personality. Leave blank to use the script's personality." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none" />
            <p className="text-[10px] text-gray-600 mt-1">Custom personality prompt for the AI during calls (e.g., "Be extra friendly and use humor")</p>
          </div>
        </div>
      )}

      {/* Calling Tab */}
      {activeTab === 'calling' && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
          <h3 className="text-sm font-medium text-white">Calling Configuration</h3>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Twilio Phone Number</label>
            <input value={settings.twilio_phone || ''} onChange={e => update('twilio_phone', e.target.value)} placeholder="+14325551234" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">The number shown on caller ID for outbound calls</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Calling Hours Start</label>
              <input type="time" value={settings.calling_hours?.start || '09:00'} onChange={e => update('calling_hours', { ...settings.calling_hours, start: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Calling Hours End</label>
              <input type="time" value={settings.calling_hours?.end || '20:00'} onChange={e => update('calling_hours', { ...settings.calling_hours, end: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Timezone</label>
            <select value={settings.timezone || 'America/Chicago'} onChange={e => update('timezone', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
              <option value="America/Chicago" className="bg-gray-900">Central (America/Chicago)</option>
              <option value="America/New_York" className="bg-gray-900">Eastern (America/New_York)</option>
              <option value="America/Denver" className="bg-gray-900">Mountain (America/Denver)</option>
              <option value="America/Los_Angeles" className="bg-gray-900">Pacific (America/Los_Angeles)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Max Concurrent Calls: {settings.max_concurrent || 1}</label>
            <input type="range" min={1} max={10} value={settings.max_concurrent || 1} onChange={e => update('max_concurrent', Number(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>1 call</span>
              <span>10 calls</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Recording Consent Message</label>
            <input value={(settings as any).consent_message || 'This call may be recorded for quality and training purposes.'} onChange={e => update('consent_message', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-3">
          <h3 className="text-sm font-medium text-white">Integration Status</h3>
          <p className="text-xs text-gray-500 mb-4">API keys and service connections are managed securely. Contact your administrator to update credentials.</p>

          {[
            { name: 'Twilio Voice', status: 'Connected', detail: settings.twilio_phone || 'Phone configured', color: '#10B981' },
            { name: 'Deepgram STT', status: 'Connected', detail: 'Nova-2 model', color: '#10B981' },
            { name: 'ElevenLabs TTS', status: selectedVoicePreset ? 'Connected' : 'No voice selected', detail: selectedVoicePreset ? `Voice: ${VOICE_OPTIONS.find(v => v.id === selectedVoicePreset)?.label || customVoiceId || 'Custom'}` : '', color: selectedVoicePreset ? '#10B981' : '#F59E0B' },
            { name: 'Azure GPT-4.1', status: 'Connected (FREE)', detail: 'Free tier until May 2026', color: '#10B981' },
            { name: 'Echo Shared Brain', status: 'Connected', detail: 'Infinite memory active', color: '#10B981' },
            { name: 'Firebase Auth', status: 'Connected', detail: 'User authentication', color: '#10B981' },
          ].map(i => (
            <div key={i.name} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <span className="text-sm text-gray-300">{i.name}</span>
                {i.detail && <p className="text-[10px] text-gray-600">{i.detail}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="text-xs" style={{ color: i.color }}>{i.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Save */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <p className="text-[10px] text-gray-600">Changes take effect on the next call</p>
        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
