'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { apiFetch } from '../lib/api';

interface Email {
  id: string;
  lead_name?: string;
  lead_id?: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  status: string;
  ai_summary?: string;
  created_at: string;
}

const SAMPLE_EMAILS: Email[] = [
  { id: '1', lead_name: 'John Smith', lead_id: '1', direction: 'inbound', from_address: 'john.smith@email.com', to_address: 'billy@billymc.com', subject: 'Re: Insurance Quote Request', body_text: "Hi Billy, thanks for reaching out yesterday. I'm definitely interested in getting a quote for my auto insurance. I currently have Progressive and I'm paying $280/month for two vehicles. When can we set up a time to chat? - John", status: 'received', ai_summary: 'Lead is interested in auto insurance quote. Currently with Progressive at $280/mo for 2 vehicles. Wants to schedule a call.', created_at: '2026-02-17T08:30:00Z' },
  { id: '2', lead_name: 'Mary Johnson', lead_id: '2', direction: 'outbound', from_address: 'billy@billymc.com', to_address: 'mary.j@email.com', subject: 'Your Medicare Options - Billy McWilliams Insurance', body_text: "Hi Mary, great speaking with you today! As promised, here's a summary of the Medicare Supplement options we discussed. I've attached a comparison chart showing Plan G vs Plan N. I'll follow up on Thursday. Best, Billy", status: 'replied', created_at: '2026-02-16T15:00:00Z' },
  { id: '3', lead_name: 'Robert Williams', lead_id: '3', direction: 'inbound', from_address: 'rwilliams@business.com', to_address: 'billy@billymc.com', subject: 'Commercial Insurance - 3 Properties', body_text: "Billy, I own three rental properties in Midland and need to review my commercial coverage. My current policy renews in April. Can we meet this week?", status: 'flagged', ai_summary: 'Commercial lead with 3 rental properties in Midland. Policy renews in April. Wants in-person meeting this week.', created_at: '2026-02-17T10:15:00Z' },
  { id: '4', direction: 'inbound', from_address: 'unknown@spam.com', to_address: 'billy@billymc.com', subject: 'You have been selected!!!', body_text: 'Click here to claim your prize...', status: 'archived', created_at: '2026-02-17T06:00:00Z' },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>(SAMPLE_EMAILS);
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'flagged'>('all');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [draftReply, setDraftReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);

  useEffect(() => {
    apiFetch(`/emails`).then(r => r.json()).then(d => { if (d.data?.length) setEmails(d.data); }).catch(() => {});
  }, []);

  const filtered = emails.filter(e => {
    if (filter === 'inbound' && e.direction !== 'inbound') return false;
    if (filter === 'outbound' && e.direction !== 'outbound') return false;
    if (filter === 'flagged' && e.status !== 'flagged') return false;
    if (search && !e.subject.toLowerCase().includes(search.toLowerCase()) && !e.from_address.toLowerCase().includes(search.toLowerCase()) && !(e.lead_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const generateReply = async (email: Email) => {
    setGeneratingReply(true);
    try {
      const res = await apiFetch(`/billy/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Draft a professional reply to this email from ${email.from_address}. Subject: "${email.subject}". Body: "${email.body_text}". Keep it friendly, professional, and from Billy McWilliams Insurance. Sign as Billy.` }),
      });
      const data = await res.json();
      setDraftReply(data.response || 'Could not generate reply.');
    } catch {
      setDraftReply('API not available. Deploy billymc-api to enable AI replies.');
    }
    setGeneratingReply(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Emails</h2>
          <p className="text-sm text-gray-500">{emails.filter(e => e.status === 'received').length} unread, {emails.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..." className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(['all', 'inbound', 'outbound', 'flagged'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs capitalize ${filter === f ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Email List */}
        <div className="flex-1 space-y-2">
          {filtered.map(email => (
            <button
              key={email.id}
              onClick={() => { setSelectedEmail(email); setDraftReply(''); }}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${
                selectedEmail?.id === email.id ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {email.direction === 'inbound' ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">IN</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">OUT</span>
                  )}
                  <span className="text-sm text-white font-medium">{email.lead_name || email.from_address}</span>
                  {email.status === 'flagged' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">FLAGGED</span>}
                  {email.status === 'received' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">{fmtDate(email.created_at)}</span>
              </div>
              <p className="text-xs text-gray-300 mb-1">{email.subject}</p>
              <p className="text-xs text-gray-600 line-clamp-1">{email.body_text.slice(0, 100)}...</p>
              {email.ai_summary && <p className="text-[10px] text-cyan-400/60 mt-1 line-clamp-1">AI: {email.ai_summary}</p>}
            </button>
          ))}
        </div>

        {/* Email Detail */}
        {selectedEmail && (
          <div className="w-96 shrink-0 rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4 sticky top-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${selectedEmail.direction === 'inbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{selectedEmail.direction.toUpperCase()}</span>
                {selectedEmail.lead_name && (
                  <Link href={`/leads/${selectedEmail.lead_id}`} className="text-xs text-blue-400 hover:text-blue-300">{selectedEmail.lead_name}</Link>
                )}
              </div>
              <h3 className="text-sm font-medium text-white mb-1">{selectedEmail.subject}</h3>
              <p className="text-xs text-gray-500">From: {selectedEmail.from_address}</p>
              <p className="text-xs text-gray-500">To: {selectedEmail.to_address}</p>
              <p className="text-[10px] text-gray-600">{new Date(selectedEmail.created_at).toLocaleString()}</p>
            </div>

            {selectedEmail.ai_summary && (
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <p className="text-[10px] text-cyan-400 mb-1">AI Summary</p>
                <p className="text-xs text-gray-300">{selectedEmail.ai_summary}</p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{selectedEmail.body_text}</p>
            </div>

            {selectedEmail.direction === 'inbound' && (
              <div className="space-y-3">
                <button onClick={() => generateReply(selectedEmail)} disabled={generatingReply} className="w-full px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                  {generatingReply ? 'Generating...' : 'AI Draft Reply'}
                </button>
                {draftReply && (
                  <div>
                    <textarea value={draftReply} onChange={e => setDraftReply(e.target.value)} rows={6} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 resize-y" />
                    <button className="w-full mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">Send Reply</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
