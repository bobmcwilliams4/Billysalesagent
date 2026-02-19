'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment_set' | 'converted' | 'lost' | 'dnc';
type TabId = 'timeline' | 'memory' | 'calls' | 'emails' | 'notes';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
  status: LeadStatus;
  source: string;
  priority: number;
  assigned_to: string;
  notes: string;
  last_contacted: string;
  next_followup: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface TimelineEvent {
  id: string;
  type: 'call' | 'email' | 'status_change' | 'note' | 'appointment' | 'sms';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, string>;
}

interface MemoryFact {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  source: string;
  extracted_at: string;
}

interface CallRecord {
  id: string;
  direction: 'inbound' | 'outbound';
  duration_seconds: number;
  disposition: string;
  recording_url: string;
  summary: string;
  timestamp: string;
}

interface EmailRecord {
  id: string;
  subject: string;
  direction: 'sent' | 'received';
  preview: string;
  timestamp: string;
  opened: boolean;
  clicked: boolean;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  contacted: { label: 'Contacted', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  qualified: { label: 'Qualified', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  appointment_set: { label: 'Appointment Set', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  converted: { label: 'Converted', color: '#06D6A0', bg: 'rgba(6,214,160,0.15)' },
  lost: { label: 'Lost', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  dnc: { label: 'DNC', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

const SAMPLE_LEAD: Lead = {
  id: 'lead_004', first_name: 'Carlos', last_name: 'Reyes', phone: '(432) 555-0374',
  email: 'creyes@reyestrucking.com', company: 'Reyes Trucking Inc', status: 'appointment_set',
  source: 'Cold Call', priority: 10, assigned_to: 'Billy', notes: 'Fleet of 12 trucks, mostly long-haul routes through TX, NM, OK. Current policy with Progressive expires March 1. Getting quotes from 3 agencies. Key decision maker. Prefers face-to-face meetings. Office is on 1405 N Big Spring St.',
  last_contacted: '2026-02-17T09:00:00Z', next_followup: '2026-02-18T14:00:00Z',
  created_at: '2026-02-10T13:30:00Z', updated_at: '2026-02-17T09:00:00Z',
  tags: ['commercial', 'fleet', 'trucking', 'high-value'],
};

const SAMPLE_TIMELINE: TimelineEvent[] = [
  {
    id: 'evt_001', type: 'appointment', title: 'Appointment scheduled',
    description: 'In-person meeting at 1405 N Big Spring St. Policy review + quote presentation.',
    timestamp: '2026-02-17T09:15:00Z', metadata: { date: '2026-02-18T14:00:00Z', location: '1405 N Big Spring St' },
  },
  {
    id: 'evt_002', type: 'call', title: 'Outbound call (4m 32s)',
    description: 'Discussed fleet details. 12 trucks, 15 drivers. Wants to include cargo coverage. Confirmed appointment for tomorrow at 2 PM.',
    timestamp: '2026-02-17T09:00:00Z', metadata: { duration: '4:32', disposition: 'appointment_set' },
  },
  {
    id: 'evt_003', type: 'status_change', title: 'Status changed to Qualified',
    description: 'Moved from Contacted to Qualified after confirming fleet size and decision-making authority.',
    timestamp: '2026-02-15T14:30:00Z', metadata: { from: 'contacted', to: 'qualified' },
  },
  {
    id: 'evt_004', type: 'email', title: 'Email sent: Fleet Insurance Quote Request',
    description: 'Sent initial information packet and quote request form.',
    timestamp: '2026-02-14T10:00:00Z', metadata: { subject: 'Fleet Insurance Quote Request', status: 'opened' },
  },
  {
    id: 'evt_005', type: 'call', title: 'Outbound call (2m 15s)',
    description: 'Follow-up on initial contact. Carlos was interested but busy. Scheduled callback for next day.',
    timestamp: '2026-02-13T16:30:00Z', metadata: { duration: '2:15', disposition: 'callback' },
  },
  {
    id: 'evt_006', type: 'status_change', title: 'Status changed to Contacted',
    description: 'First successful phone contact made.',
    timestamp: '2026-02-12T11:00:00Z', metadata: { from: 'new', to: 'contacted' },
  },
  {
    id: 'evt_007', type: 'call', title: 'Outbound call (6m 48s)',
    description: 'Cold call. Introduced BillyMC Insurance. Carlos currently has Progressive but unhappy with claims handling. Fleet of 12 trucks doing TX/NM/OK routes. Policy expires March 1.',
    timestamp: '2026-02-12T10:45:00Z', metadata: { duration: '6:48', disposition: 'interested' },
  },
  {
    id: 'evt_008', type: 'note', title: 'Lead created',
    description: 'Added from cold call list. Reyes Trucking Inc identified as high-value prospect.',
    timestamp: '2026-02-10T13:30:00Z', metadata: {},
  },
];

const SAMPLE_MEMORY_FACTS: MemoryFact[] = [
  { id: 'mf_001', fact: 'Has a fleet of 12 trucks, mostly long-haul', category: 'Business', confidence: 0.95, source: 'Call #1 on 2026-02-12', extracted_at: '2026-02-12T10:50:00Z' },
  { id: 'mf_002', fact: 'Routes through TX, NM, and OK', category: 'Business', confidence: 0.9, source: 'Call #1 on 2026-02-12', extracted_at: '2026-02-12T10:50:00Z' },
  { id: 'mf_003', fact: 'Current policy with Progressive, expires March 1', category: 'Insurance', confidence: 0.98, source: 'Call #1 on 2026-02-12', extracted_at: '2026-02-12T10:50:00Z' },
  { id: 'mf_004', fact: 'Unhappy with Progressive claims handling', category: 'Sentiment', confidence: 0.85, source: 'Call #1 on 2026-02-12', extracted_at: '2026-02-12T10:50:00Z' },
  { id: 'mf_005', fact: '15 drivers total', category: 'Business', confidence: 0.92, source: 'Call #3 on 2026-02-17', extracted_at: '2026-02-17T09:05:00Z' },
  { id: 'mf_006', fact: 'Wants cargo coverage included', category: 'Insurance', confidence: 0.88, source: 'Call #3 on 2026-02-17', extracted_at: '2026-02-17T09:05:00Z' },
  { id: 'mf_007', fact: 'Key decision maker, sole owner', category: 'Authority', confidence: 0.95, source: 'Call #2 on 2026-02-15', extracted_at: '2026-02-15T14:35:00Z' },
  { id: 'mf_008', fact: 'Prefers face-to-face meetings over phone', category: 'Preference', confidence: 0.8, source: 'Call #2 on 2026-02-15', extracted_at: '2026-02-15T14:35:00Z' },
  { id: 'mf_009', fact: 'Office at 1405 N Big Spring St, Midland TX', category: 'Contact', confidence: 0.99, source: 'Call #3 on 2026-02-17', extracted_at: '2026-02-17T09:05:00Z' },
  { id: 'mf_010', fact: 'Getting quotes from 3 agencies', category: 'Competition', confidence: 0.85, source: 'Call #3 on 2026-02-17', extracted_at: '2026-02-17T09:05:00Z' },
];

const SAMPLE_CALLS: CallRecord[] = [
  { id: 'call_003', direction: 'outbound', duration_seconds: 272, disposition: 'appointment_set', recording_url: '#', summary: 'Discussed fleet details. 12 trucks, 15 drivers. Wants cargo coverage. Confirmed appointment tomorrow 2 PM.', timestamp: '2026-02-17T09:00:00Z' },
  { id: 'call_002', direction: 'outbound', duration_seconds: 135, disposition: 'callback', recording_url: '#', summary: 'Follow-up. Carlos interested but busy. Scheduled callback.', timestamp: '2026-02-13T16:30:00Z' },
  { id: 'call_001', direction: 'outbound', duration_seconds: 408, disposition: 'interested', recording_url: '#', summary: 'Cold call. 12 trucks, Progressive expires March 1, unhappy with claims. High interest.', timestamp: '2026-02-12T10:45:00Z' },
];

const SAMPLE_EMAILS: EmailRecord[] = [
  { id: 'email_002', subject: 'Re: Fleet Insurance Quote Request', direction: 'received', preview: 'Thanks Billy, I looked over the info packet. A couple questions about the cargo coverage limits...', timestamp: '2026-02-14T15:22:00Z', opened: true, clicked: true },
  { id: 'email_001', subject: 'Fleet Insurance Quote Request', direction: 'sent', preview: 'Hi Carlos, great speaking with you today. Attached is our information packet for commercial fleet insurance...', timestamp: '2026-02-14T10:00:00Z', opened: true, clicked: true },
];

function formatDate(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatRelative(iso: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 0) {
    const futureMin = Math.abs(diffMin);
    if (futureMin < 60) return `in ${futureMin}m`;
    const futureHr = Math.floor(futureMin / 60);
    if (futureHr < 24) return `in ${futureHr}h`;
    const futureDays = Math.floor(futureHr / 24);
    return `in ${futureDays}d`;
  }
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function PriorityStars({ priority }: { priority: number }) {
  const stars = Math.round(priority / 2);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className="w-4 h-4" fill={i < stars ? '#F59E0B' : 'none'} stroke={i < stars ? '#F59E0B' : '#374151'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-500">({priority}/10)</span>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function timelineTypeConfig(type: TimelineEvent['type']): { icon: JSX.Element; color: string; bg: string } {
  switch (type) {
    case 'call':
      return { icon: <PhoneIcon />, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' };
    case 'email':
      return { icon: <MailIcon />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' };
    case 'status_change':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
        color: '#10B981', bg: 'rgba(16,185,129,0.15)',
      };
    case 'note':
      return { icon: <EditIcon />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    case 'appointment':
      return { icon: <CalendarIcon />, color: '#06D6A0', bg: 'rgba(6,214,160,0.15)' };
    case 'sms':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        ),
        color: '#EC4899', bg: 'rgba(236,72,153,0.15)',
      };
  }
}

function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const cfg = timelineTypeConfig(event.type);
        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Vertical line */}
            {idx < events.length - 1 && (
              <div className="absolute left-[15px] top-10 bottom-0 w-px bg-white/5" />
            )}
            {/* Dot */}
            <div className="relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
              {cfg.icon}
            </div>
            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-200">{event.title}</p>
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{formatRelative(event.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">{event.description}</p>
              <p className="text-[10px] text-gray-600 mt-1">{formatDateTime(event.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemoryFactsView({ facts }: { facts: MemoryFact[] }) {
  const categories = [...new Set(facts.map(f => f.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <BrainIcon />
        <span>{facts.length} AI-extracted facts from conversations</span>
      </div>
      {categories.map(category => (
        <div key={category}>
          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">{category}</h4>
          <div className="space-y-2">
            {facts.filter(f => f.category === category).map(fact => (
              <div key={fact.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors">
                <p className="text-sm text-gray-200">{fact.fact}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-600">{fact.source}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${fact.confidence * 100}%`,
                        backgroundColor: fact.confidence > 0.9 ? '#10B981' : fact.confidence > 0.7 ? '#F59E0B' : '#EF4444',
                      }} />
                    </div>
                    <span className="text-[10px] text-gray-600">{Math.round(fact.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CallsView({ calls, onInitiateCall }: { calls: CallRecord[]; onInitiateCall: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{calls.length} calls</span>
        <button onClick={onInitiateCall}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <PhoneIcon /> Initiate Call
        </button>
      </div>
      {calls.map(call => (
        <div key={call.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                call.direction === 'outbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {call.direction === 'outbound' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-200 capitalize">{call.direction}</span>
                <span className="text-sm text-gray-500 ml-2">{formatDuration(call.duration_seconds)}</span>
              </div>
            </div>
            <span className="text-[10px] text-gray-600">{formatDateTime(call.timestamp)}</span>
          </div>
          <p className="text-sm text-gray-400 mb-3">{call.summary}</p>
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              call.disposition === 'appointment_set' ? 'bg-emerald-500/15 text-emerald-400' :
              call.disposition === 'interested' ? 'bg-blue-500/15 text-blue-400' :
              'bg-yellow-500/15 text-yellow-400'
            }`}>{call.disposition.replace('_', ' ')}</span>
            {call.recording_url && (
              <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-cyan-400 hover:bg-cyan-400/10 transition-colors">
                <PlayIcon /> Play Recording
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailsView({ emails }: { emails: EmailRecord[] }) {
  return (
    <div className="space-y-4">
      <span className="text-sm text-gray-400">{emails.length} emails</span>
      {emails.map(email => (
        <div key={email.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                email.direction === 'sent' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {email.direction === 'sent' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-gray-200">{email.subject}</span>
            </div>
            <span className="text-[10px] text-gray-600">{formatDateTime(email.timestamp)}</span>
          </div>
          <p className="text-sm text-gray-400 truncate">{email.preview}</p>
          <div className="flex items-center gap-3 mt-2">
            {email.opened && (
              <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Opened
              </span>
            )}
            {email.clicked && (
              <span className="text-[10px] text-blue-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Clicked
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesView({ notes, onSave }: { notes: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes);

  function handleSave() {
    onSave(value);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Lead Notes</span>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-blue-400 hover:bg-blue-400/10 transition-colors">
            <EditIcon /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setValue(notes); setEditing(false); }}
              className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors">
              Save
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed"
          autoFocus
        />
      ) : (
        <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap min-h-[120px]">
          {value || 'No notes yet. Click Edit to add notes.'}
        </div>
      )}
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(SAMPLE_TIMELINE);
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>(SAMPLE_MEMORY_FACTS);
  const [calls, setCalls] = useState<CallRecord[]>(SAMPLE_CALLS);
  const [emails, setEmails] = useState<EmailRecord[]>(SAMPLE_EMAILS);
  const [activeTab, setActiveTab] = useState<TabId>('timeline');
  const [loading, setLoading] = useState(true);
  const [leadId, setLeadId] = useState<string>('');
  const [callInitiating, setCallInitiating] = useState(false);

  useEffect(() => {
    async function init() {
      const resolvedParams = await params;
      setLeadId(resolvedParams.id);
      try {
        const res = await apiFetch(`/leads/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.lead) setLead(data.lead);
          if (data.timeline) setTimeline(data.timeline);
          if (data.memory_facts) setMemoryFacts(data.memory_facts);
          if (data.calls) setCalls(data.calls);
          if (data.emails) setEmails(data.emails);
        }
      } catch {
        // Use sample data
      } finally {
        if (!lead) setLead(SAMPLE_LEAD);
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCallNow() {
    if (!lead) return;
    setCallInitiating(true);
    try {
      await apiFetch(`/calls/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id }),
      });
    } catch {
      // Will work when API is deployed
    } finally {
      setTimeout(() => setCallInitiating(false), 2000);
    }
  }

  function handleSaveNotes(newNotes: string) {
    if (!lead) return;
    setLead({ ...lead, notes: newNotes });
    apiFetch(`/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: newNotes }),
    }).catch(() => {});
  }

  async function handleDNC() {
    if (!lead) return;
    setLead({ ...lead, status: 'dnc' });
    try {
      await apiFetch(`/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dnc' }),
      });
    } catch {
      // Will work when API is deployed
    }
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'timeline', label: 'Timeline', count: timeline.length },
    { id: 'memory', label: 'Memory Facts', count: memoryFacts.length },
    { id: 'calls', label: 'Calls', count: calls.length },
    { id: 'emails', label: 'Emails', count: emails.length },
    { id: 'notes', label: 'Notes' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-400 mb-4">Lead not found</p>
          <a href="/leads" className="text-blue-400 hover:text-blue-300 text-sm">Back to Leads</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Back + Header */}
        <div className="mb-6">
          <a href="/leads" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4">
            <BackIcon /> Back to Leads
          </a>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{lead.first_name} {lead.last_name}</h1>
                <StatusBadge status={lead.status} />
              </div>
              {lead.company && <p className="text-sm text-gray-400 mb-2">{lead.company}</p>}
              <PriorityStars priority={lead.priority} />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-300 border border-white/10 hover:border-white/20 transition-colors">
              <EditIcon /> Edit Lead
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={handleCallNow} disabled={callInitiating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-50 transition-colors">
                {callInitiating ? (
                  <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  <PhoneIcon />
                )}
                {callInitiating ? 'Initiating...' : 'Call Now'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <MailIcon /> Send Email
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-yellow-600/20 text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <CalendarIcon /> Book Appointment
              </button>
              <button onClick={handleDNC}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-600/10 text-red-400 border border-red-500/10 hover:border-red-500/30 transition-colors ml-auto">
                <BanIcon /> Add to DNC
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto border-b border-white/5 pb-px">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-blue-400'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5">
              {activeTab === 'timeline' && <TimelineView events={timeline} />}
              {activeTab === 'memory' && <MemoryFactsView facts={memoryFacts} />}
              {activeTab === 'calls' && <CallsView calls={calls} onInitiateCall={handleCallNow} />}
              {activeTab === 'emails' && <EmailsView emails={emails} />}
              {activeTab === 'notes' && <NotesView notes={lead.notes} onSave={handleSaveNotes} />}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Quick Info */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">Contact Info</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm text-blue-400 hover:text-blue-300">{lead.phone}</a>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Email</p>
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-sm text-blue-400 hover:text-blue-300">{lead.email}</a>
                  ) : (
                    <p className="text-sm text-gray-500">--</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Company</p>
                  <p className="text-sm text-gray-300">{lead.company || '--'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Source</p>
                  <p className="text-sm text-gray-300">{lead.source}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Assigned To</p>
                  <p className="text-sm text-gray-300">{lead.assigned_to || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Created</p>
                  <p className="text-sm text-gray-300">{formatDate(lead.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Last Contacted</p>
                  <p className="text-sm text-gray-300">{formatDate(lead.last_contacted)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase">Next Follow-up</p>
                  <p className={`text-sm ${lead.next_followup ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {lead.next_followup ? formatDateTime(lead.next_followup) : '--'}
                  </p>
                </div>
              </div>
            </div>

            {lead.tags.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">Activity Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-2 rounded-lg bg-white/[0.03]">
                  <p className="text-lg font-bold text-blue-400">{calls.length}</p>
                  <p className="text-[10px] text-gray-500">Calls</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-white/[0.03]">
                  <p className="text-lg font-bold text-purple-400">{emails.length}</p>
                  <p className="text-[10px] text-gray-500">Emails</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-white/[0.03]">
                  <p className="text-lg font-bold text-cyan-400">{memoryFacts.length}</p>
                  <p className="text-[10px] text-gray-500">Facts</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-white/[0.03]">
                  <p className="text-lg font-bold text-emerald-400">{timeline.length}</p>
                  <p className="text-[10px] text-gray-500">Events</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
