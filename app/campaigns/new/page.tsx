'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '../../lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Script {
  id: string;
  name: string;
  description: string;
  type: string;
  states_count: number;
  updated_at: string;
}

interface LeadFilter {
  status: string[];
  source: string[];
  tags: string[];
}

interface CampaignForm {
  name: string;
  type: 'outbound' | 'inbound' | 'blended';
  description: string;
  script_id: string;
  lead_filter: LeadFilter;
  schedule_start: string;
  schedule_end: string;
  calling_hours_start: string;
  calling_hours_end: string;
  calling_days: string[];
  max_concurrent: number;
  calls_per_hour: number;
  max_retries: number;
  retry_delay_hours: number;
}

// ── Sample Scripts ──────────────────────────────────────────────────────────

const SAMPLE_SCRIPTS: Script[] = [
  { id: 'script_001', name: 'Real Estate Warm Outreach', description: 'Warm approach for leads who submitted website forms or were referred. Focus on discovery and appointment booking.', type: 'outbound', states_count: 8, updated_at: '2026-02-15T10:00:00Z' },
  { id: 'script_002', name: 'Inbound Qualification', description: 'Handle inbound calls with structured qualification. Extract budget, timeline, requirements, and pre-approval status.', type: 'inbound', states_count: 7, updated_at: '2026-02-14T16:30:00Z' },
  { id: 'script_003', name: 'Cold Re-engagement', description: 'Low-pressure re-engagement for cold leads. Updated listings approach with easy opt-out.', type: 'outbound', states_count: 6, updated_at: '2026-02-10T09:00:00Z' },
  { id: 'script_004', name: 'Appointment Confirmation', description: 'Confirm upcoming appointments, provide directions, and handle rescheduling requests.', type: 'outbound', states_count: 5, updated_at: '2026-02-12T11:00:00Z' },
  { id: 'script_005', name: 'Commercial Property Pitch', description: 'High-value commercial property pitch customized per lead portfolio. Investment-focused language.', type: 'outbound', states_count: 9, updated_at: '2026-02-13T14:00:00Z' },
];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEAD_STATUSES = ['new', 'warm', 'hot', 'cold', 'qualified', 'unqualified'];
const LEAD_SOURCES = ['Website Form', 'Referral', 'Zillow', 'Realtor.com', 'Social Media', 'Walk-in', 'Cold List', 'Event'];
const LEAD_TAGS = ['residential', 'commercial', 'investor', 'first-time-buyer', 'pre-approved', 'relocating', 'permian-basin', 'midland', 'odessa'];

const INITIAL_FORM: CampaignForm = {
  name: '',
  type: 'outbound',
  description: '',
  script_id: '',
  lead_filter: { status: [], source: [], tags: [] },
  schedule_start: new Date().toISOString().split('T')[0],
  schedule_end: '',
  calling_hours_start: '09:00',
  calling_hours_end: '17:00',
  calling_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  max_concurrent: 3,
  calls_per_hour: 30,
  max_retries: 2,
  retry_delay_hours: 4,
};

// ── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { num: 1, label: 'Basics' },
    { num: 2, label: 'Script' },
    { num: 3, label: 'Leads' },
    { num: 4, label: 'Schedule' },
    { num: 5, label: 'Pacing' },
    { num: 6, label: 'Review' },
  ];
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => {
        const isActive = step.num === current;
        const isComplete = step.num < current;
        return (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isActive ? 'bg-blue-500 text-white' :
                isComplete ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-white/5 text-gray-600 border border-white/10'
              }`}>
                {isComplete ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : step.num}
              </div>
              <span className={`text-xs hidden sm:inline ${isActive ? 'text-blue-400 font-medium' : isComplete ? 'text-emerald-400' : 'text-gray-600'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${isComplete ? 'bg-emerald-500/30' : 'bg-white/5'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Multi-Select Pill Component ─────────────────────────────────────────────

function PillSelect({ options, selected, onToggle, color = 'blue' }: { options: string[]; selected: string[]; onToggle: (v: string) => void; color?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
              active
                ? `bg-${color}-500/15 text-${color}-400 border-${color}-500/30`
                : 'bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300'
            }`}
            style={active ? {
              backgroundColor: `rgba(${color === 'blue' ? '59,130,246' : color === 'emerald' ? '16,185,129' : color === 'purple' ? '139,92,246' : '59,130,246'}, 0.15)`,
              color: `rgb(${color === 'blue' ? '96,165,250' : color === 'emerald' ? '52,211,153' : color === 'purple' ? '167,139,250' : '96,165,250'})`,
              borderColor: `rgba(${color === 'blue' ? '59,130,246' : color === 'emerald' ? '16,185,129' : color === 'purple' ? '139,92,246' : '59,130,246'}, 0.3)`,
            } : {}}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);
  const [scripts, setScripts] = useState<Script[]>(SAMPLE_SCRIPTS);
  const [leadCount, setLeadCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch scripts
  useEffect(() => {
    async function fetchScripts() {
      try {
        const res = await apiFetch(`/scripts`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) setScripts(json.data);
        }
      } catch {}
    }
    fetchScripts();
  }, []);

  // Estimate lead count when filters change
  useEffect(() => {
    async function estimateLeads() {
      try {
        const params = new URLSearchParams();
        if (form.lead_filter.status.length) params.set('status', form.lead_filter.status.join(','));
        if (form.lead_filter.source.length) params.set('source', form.lead_filter.source.join(','));
        if (form.lead_filter.tags.length) params.set('tags', form.lead_filter.tags.join(','));
        params.set('count_only', 'true');
        const res = await apiFetch(`/leads?${params}`);
        if (res.ok) {
          const json = await res.json();
          setLeadCount(json.total || 0);
        }
      } catch {
        // Estimate from filters for demo
        let count = 500;
        if (form.lead_filter.status.length) count = Math.floor(count * (form.lead_filter.status.length / LEAD_STATUSES.length));
        if (form.lead_filter.source.length) count = Math.floor(count * (form.lead_filter.source.length / LEAD_SOURCES.length));
        if (form.lead_filter.tags.length) count = Math.floor(count * 0.6);
        setLeadCount(Math.max(count, 0));
      }
    }
    estimateLeads();
  }, [form.lead_filter]);

  const updateForm = useCallback(<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFilter = useCallback((category: keyof LeadFilter, value: string) => {
    setForm((prev) => {
      const current = prev.lead_filter[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, lead_filter: { ...prev.lead_filter, [category]: updated } };
    });
  }, []);

  const toggleDay = useCallback((day: string) => {
    setForm((prev) => {
      const updated = prev.calling_days.includes(day)
        ? prev.calling_days.filter((d) => d !== day)
        : [...prev.calling_days, day];
      return { ...prev, calling_days: updated };
    });
  }, []);

  const selectedScript = scripts.find((s) => s.id === form.script_id);

  // Validation
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return form.name.trim().length > 0;
      case 2: return form.script_id.length > 0;
      case 3: return true; // Leads are optional filters
      case 4: return form.calling_days.length > 0 && form.schedule_start.length > 0;
      case 5: return form.max_concurrent > 0 && form.calls_per_hour > 0;
      case 6: return true;
      default: return false;
    }
  };

  // Submit
  const handleLaunch = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Create campaign
      const createRes = await apiFetch(`/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          description: form.description,
          script_id: form.script_id,
          lead_filter: form.lead_filter,
          schedule: {
            start_date: form.schedule_start,
            end_date: form.schedule_end || null,
            calling_hours_start: form.calling_hours_start,
            calling_hours_end: form.calling_hours_end,
            days: form.calling_days,
          },
          pacing: {
            max_concurrent: form.max_concurrent,
            calls_per_hour: form.calls_per_hour,
            max_retries: form.max_retries,
            retry_delay_hours: form.retry_delay_hours,
          },
        }),
      });

      if (createRes.ok) {
        const json = await createRes.json();
        const campaignId = json.data?.id || json.id;
        if (campaignId) {
          // Start campaign
          await apiFetch(`/campaigns/${campaignId}/start`, { method: 'POST' });
        }
        router.push('/campaigns');
      } else {
        const errJson = await createRes.json().catch(() => null);
        setError(errJson?.error || 'Failed to create campaign');
      }
    } catch {
      // Demo mode: just redirect
      router.push('/campaigns');
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors';
  const labelClass = 'block text-xs text-gray-400 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">New Campaign</h2>
          <p className="text-sm text-gray-500">Step {step} of 6</p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} total={6} />

      {/* Step Content */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-6">

        {/* ─── Step 1: Basics ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-medium text-white">Campaign Basics</h3>
            <div>
              <label className={labelClass}>Campaign Name *</label>
              <input
                type="text"
                placeholder="e.g., Midland Hot Leads Q1"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Campaign Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['outbound', 'inbound', 'blended'] as const).map((t) => {
                  const active = form.type === t;
                  const icons: Record<string, { icon: string; desc: string }> = {
                    outbound: { icon: 'M5 10l7-7m0 0l7 7m-7-7v18', desc: 'AI calls your leads' },
                    inbound:  { icon: 'M19 14l-7 7m0 0l-7-7m7 7V3', desc: 'AI answers incoming calls' },
                    blended:  { icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', desc: 'Both inbound and outbound' },
                  };
                  const cfg = icons[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateForm('type', t)}
                      className={`p-4 rounded-lg border text-center transition-colors ${
                        active
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                          : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10'
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                      </svg>
                      <p className="text-sm font-medium capitalize">{t}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{cfg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>Description (optional)</label>
              <textarea
                placeholder="Brief description of campaign goals and target audience..."
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        )}

        {/* ─── Step 2: Script Selection ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-lg font-medium text-white">Select Script</h3>
            <p className="text-sm text-gray-500">Choose the AI conversation script for this campaign.</p>
            <div className="space-y-3">
              {scripts.map((script) => {
                const active = form.script_id === script.id;
                return (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => updateForm('script_id', script.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      active
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {active && (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className={`text-sm font-medium ${active ? 'text-blue-400' : 'text-white'}`}>{script.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 capitalize">{script.type}</span>
                        <span className="text-[10px] text-gray-600">{script.states_count} states</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{script.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Step 3: Lead Selection ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Lead Selection</h3>
                <p className="text-sm text-gray-500">Filter which leads to include in this campaign.</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30">
                <span className="text-sm text-blue-400 font-bold">{leadCount}</span>
                <span className="text-xs text-blue-400/70 ml-1">leads match</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Filter by Status</label>
              <PillSelect
                options={LEAD_STATUSES}
                selected={form.lead_filter.status}
                onToggle={(v) => toggleFilter('status', v)}
                color="emerald"
              />
              {form.lead_filter.status.length === 0 && (
                <p className="text-[10px] text-gray-600 mt-1">No filter = all statuses included</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Filter by Source</label>
              <PillSelect
                options={LEAD_SOURCES}
                selected={form.lead_filter.source}
                onToggle={(v) => toggleFilter('source', v)}
                color="blue"
              />
            </div>

            <div>
              <label className={labelClass}>Filter by Tags</label>
              <PillSelect
                options={LEAD_TAGS}
                selected={form.lead_filter.tags}
                onToggle={(v) => toggleFilter('tags', v)}
                color="purple"
              />
            </div>
          </div>
        )}

        {/* ─── Step 4: Schedule ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="text-lg font-medium text-white">Schedule</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input
                  type="date"
                  value={form.schedule_start}
                  onChange={(e) => updateForm('schedule_start', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End Date (optional)</label>
                <input
                  type="date"
                  value={form.schedule_end}
                  onChange={(e) => updateForm('schedule_end', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Calling Hours Start</label>
                <input
                  type="time"
                  value={form.calling_hours_start}
                  onChange={(e) => updateForm('calling_hours_start', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Calling Hours End</label>
                <input
                  type="time"
                  value={form.calling_hours_end}
                  onChange={(e) => updateForm('calling_hours_end', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Calling Days *</label>
              <div className="flex gap-2">
                {ALL_DAYS.map((day) => {
                  const active = form.calling_days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors border ${
                        active
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-white/[0.02] text-gray-600 border-white/5 hover:border-white/10 hover:text-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 5: Pacing ─────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Pacing & Retry Policy</h3>

            {/* Max Concurrent */}
            <div>
              <div className="flex justify-between mb-2">
                <label className={labelClass}>Max Concurrent Calls</label>
                <span className="text-sm text-blue-400 font-mono font-bold">{form.max_concurrent}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={form.max_concurrent}
                onChange={(e) => updateForm('max_concurrent', parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>1 (cautious)</span>
                <span>5 (aggressive)</span>
              </div>
            </div>

            {/* Calls Per Hour */}
            <div>
              <div className="flex justify-between mb-2">
                <label className={labelClass}>Calls Per Hour</label>
                <span className="text-sm text-blue-400 font-mono font-bold">{form.calls_per_hour}</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={form.calls_per_hour}
                onChange={(e) => updateForm('calls_per_hour', parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>10/hr</span>
                <span>60/hr</span>
              </div>
            </div>

            {/* Retry Policy */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-4">
              <h4 className="text-sm font-medium text-white">Retry Policy</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Max Retries per Lead</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={form.max_retries}
                      onChange={(e) => updateForm('max_retries', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none"
                    />
                    <span className="text-sm text-white font-mono w-6 text-right">{form.max_retries}</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Retry Delay (hours)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={48}
                      value={form.retry_delay_hours}
                      onChange={(e) => updateForm('retry_delay_hours', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none"
                    />
                    <span className="text-sm text-white font-mono w-8 text-right">{form.retry_delay_hours}h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated Throughput */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span className="text-xs text-blue-400 font-medium">Estimated Throughput</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500">Per Hour</p>
                  <p className="text-sm text-white font-mono">{form.calls_per_hour} calls</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Per Day ({form.calling_hours_end && form.calling_hours_start ? (() => {
                    const [sh, sm] = form.calling_hours_start.split(':').map(Number);
                    const [eh, em] = form.calling_hours_end.split(':').map(Number);
                    return (eh * 60 + em - sh * 60 - sm) / 60;
                  })() : 8}h)</p>
                  <p className="text-sm text-white font-mono">
                    {(() => {
                      const [sh, sm] = form.calling_hours_start.split(':').map(Number);
                      const [eh, em] = form.calling_hours_end.split(':').map(Number);
                      const hours = (eh * 60 + em - sh * 60 - sm) / 60;
                      return Math.floor(form.calls_per_hour * Math.max(hours, 0));
                    })()} calls
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Days to Complete</p>
                  <p className="text-sm text-white font-mono">
                    {leadCount > 0 ? (() => {
                      const [sh, sm] = form.calling_hours_start.split(':').map(Number);
                      const [eh, em] = form.calling_hours_end.split(':').map(Number);
                      const hours = (eh * 60 + em - sh * 60 - sm) / 60;
                      const perDay = form.calls_per_hour * Math.max(hours, 1);
                      const daysNeeded = Math.ceil(leadCount * (1 + form.max_retries * 0.3) / perDay);
                      const calDays = Math.ceil(daysNeeded / (form.calling_days.length / 7));
                      return `~${calDays}`;
                    })() : '--'} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 6: Review & Launch ────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-5">
            <h3 className="text-lg font-medium text-white">Review & Launch</h3>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Campaign Basics */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Campaign</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-600">Name</p>
                    <p className="text-sm text-white">{form.name || '--'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Type</p>
                    <p className="text-sm text-white capitalize">{form.type}</p>
                  </div>
                  {form.description && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-600">Description</p>
                      <p className="text-sm text-gray-400">{form.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Script */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Script</h4>
                <p className="text-sm text-white">{selectedScript?.name || '--'}</p>
                {selectedScript && <p className="text-xs text-gray-500 mt-0.5">{selectedScript.description}</p>}
              </div>

              {/* Leads */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Leads</h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-blue-400">{leadCount}</span>
                  <span className="text-sm text-gray-400">leads matching filters</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.lead_filter.status.length > 0 && form.lead_filter.status.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">{s}</span>
                  ))}
                  {form.lead_filter.source.length > 0 && form.lead_filter.source.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">{s}</span>
                  ))}
                  {form.lead_filter.tags.length > 0 && form.lead_filter.tags.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">{s}</span>
                  ))}
                  {form.lead_filter.status.length === 0 && form.lead_filter.source.length === 0 && form.lead_filter.tags.length === 0 && (
                    <span className="text-xs text-gray-500">All leads (no filters)</span>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Schedule</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-600">Start Date</p>
                    <p className="text-sm text-white">{form.schedule_start || '--'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">End Date</p>
                    <p className="text-sm text-white">{form.schedule_end || 'Until complete'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Calling Hours</p>
                    <p className="text-sm text-white">{form.calling_hours_start} - {form.calling_hours_end}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Days</p>
                    <p className="text-sm text-white">{form.calling_days.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Pacing */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Pacing</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-600">Max Concurrent</p>
                    <p className="text-sm text-white font-mono">{form.max_concurrent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Calls/Hour</p>
                    <p className="text-sm text-white font-mono">{form.calls_per_hour}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Max Retries</p>
                    <p className="text-sm text-white font-mono">{form.max_retries}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600">Retry Delay</p>
                    <p className="text-sm text-white font-mono">{form.retry_delay_hours}h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep(Math.min(6, step + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Launch Campaign
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
