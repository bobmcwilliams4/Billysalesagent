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

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync?: string;
}

const PROVIDERS = [
  { id: 'gmail', name: 'Gmail', icon: 'M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20', color: '#EA4335', bgColor: 'rgba(234, 67, 53, 0.08)', borderColor: 'rgba(234, 67, 53, 0.2)' },
  { id: 'outlook', name: 'Outlook', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: '#0078D4', bgColor: 'rgba(0, 120, 212, 0.08)', borderColor: 'rgba(0, 120, 212, 0.2)' },
  { id: 'zoho', name: 'Zoho Mail', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: '#F4C430', bgColor: 'rgba(244, 196, 48, 0.08)', borderColor: 'rgba(244, 196, 48, 0.2)' },
  { id: 'imap', name: 'IMAP / Custom', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.2)' },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'flagged'>('all');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [draftReply, setDraftReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/emails').then(r => r.json()).then(d => { if (d.data?.length) setEmails(d.data); }).catch(() => {});
    apiFetch('/emails/accounts').then(r => r.json()).then(d => { if (d.data?.length) setAccounts(d.data); }).catch(() => {});
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
      const res = await apiFetch('/billy/chat', {
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

  const connectAccount = async (providerId: string) => {
    setConnectingProvider(providerId);
    try {
      const res = await apiFetch('/emails/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank', 'width=600,height=700');
      }
    } catch {
      // API will handle when deployed
    }
    setConnectingProvider(null);
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      await apiFetch(`/emails/accounts/${accountId}`, { method: 'DELETE' });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    } catch {
      // API will handle when deployed
    }
  };

  const connectedCount = accounts.filter(a => a.status === 'connected').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[--text-100] tracking-tight">Emails</h2>
          <p className="text-sm text-[--text-24]">{emails.filter(e => e.status === 'received').length} unread, {emails.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAccountSetup(!showAccountSetup)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              showAccountSetup
                ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30'
                : 'bg-[--glass-bg] border border-[--border-interactive] text-[--text-72] hover:text-[--text-100] hover:border-[--border-focused]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {connectedCount > 0 ? `${connectedCount} Connected` : 'Connect Email'}
          </button>
        </div>
      </div>

      {/* Email Account Integration Panel */}
      {showAccountSetup && (
        <div className="glass-panel p-6 animate-fadeInUp space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[--text-100] tracking-tight">Email Accounts</h3>
              <p className="text-xs text-[--text-24] mt-0.5">Connect your email accounts to sync inbox and send replies</p>
            </div>
            <button onClick={() => setShowAccountSetup(false)} className="text-[--text-24] hover:text-[--text-72] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Connected Accounts */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-[--text-24] uppercase tracking-[0.1em] font-medium">Connected Accounts</p>
              {accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-xl border border-[--border-base] bg-[--glass-bg]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${account.status === 'connected' ? 'bg-emerald-500' : account.status === 'error' ? 'bg-red-500' : 'bg-[--text-24]'}`} />
                    <div>
                      <p className="text-sm text-[--text-100] font-medium">{account.email}</p>
                      <p className="text-[10px] text-[--text-24]">{account.provider} {account.last_sync ? `· Synced ${fmtDate(account.last_sync)}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-[10px] text-[--text-48] hover:text-[--text-100] px-2 py-1 rounded-lg hover:bg-[--glass-bg-hover] transition-all">Sync Now</button>
                    <button onClick={() => disconnectAccount(account.id)} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">Disconnect</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Available Providers */}
          <div className="space-y-2">
            <p className="text-[10px] text-[--text-24] uppercase tracking-[0.1em] font-medium">Add Account</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PROVIDERS.map(provider => {
                const isConnected = accounts.some(a => a.provider.toLowerCase() === provider.id && a.status === 'connected');
                return (
                  <button
                    key={provider.id}
                    onClick={() => !isConnected && connectAccount(provider.id)}
                    disabled={connectingProvider === provider.id}
                    className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-150 ${
                      isConnected
                        ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                        : 'border-[--border-interactive] bg-[--glass-bg] hover:border-[--border-focused] hover:bg-[--glass-bg-hover] hover:translate-y-[-1px]'
                    }`}
                    style={!isConnected ? { borderColor: provider.borderColor, background: provider.bgColor } : undefined}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${provider.color}15` }}>
                      <svg className="w-5 h-5" fill="none" stroke={provider.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={provider.icon} />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-[--text-72]">{provider.name}</span>
                    {isConnected ? (
                      <span className="text-[9px] text-emerald-500 font-medium">Connected</span>
                    ) : connectingProvider === provider.id ? (
                      <span className="text-[9px] text-[--text-24]">Connecting...</span>
                    ) : (
                      <span className="text-[9px] text-[--text-24]">Click to connect</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual IMAP Config */}
          <details className="group">
            <summary className="text-xs text-[--text-48] cursor-pointer hover:text-[--text-72] transition-colors flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Advanced: Manual IMAP/SMTP Configuration
            </summary>
            <div className="mt-3 p-4 rounded-xl border border-[--border-base] bg-[--glass-bg] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">IMAP Server</label>
                  <input type="text" placeholder="imap.example.com" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">IMAP Port</label>
                  <input type="text" placeholder="993" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">SMTP Server</label>
                  <input type="text" placeholder="smtp.example.com" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">SMTP Port</label>
                  <input type="text" placeholder="587" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">Email Address</label>
                  <input type="email" placeholder="you@example.com" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-24] uppercase tracking-[0.08em] block mb-1">Password / App Key</label>
                  <input type="password" placeholder="App-specific password" className="w-full input-glass px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-[--text-48]">
                  <input type="checkbox" defaultChecked className="rounded border-[--border-interactive]" />
                  Use SSL/TLS
                </label>
              </div>
              <button className="btn-primary text-sm px-4 py-2">Test Connection & Save</button>
            </div>
          </details>
        </div>
      )}

      {/* No accounts connected — show setup prompt */}
      {accounts.length === 0 && !showAccountSetup && emails.length === 0 && (
        <div className="glass-panel p-8 animate-fadeInUp">
          <div className="empty-state py-6">
            <svg className="w-12 h-12 text-[--text-12]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <h3>Connect Your Email</h3>
            <p className="text-[--text-24]">Link a Gmail, Outlook, or Zoho account to sync your inbox and send AI-drafted replies directly from BillyMC.</p>
            <button onClick={() => setShowAccountSetup(true)} className="btn-primary mt-4 px-6 py-2.5">
              Connect Email Account
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {(emails.length > 0 || accounts.length > 0) && (
        <div className="flex items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..." className="flex-1 max-w-sm input-glass px-4 py-2" />
          <div className="flex rounded-xl border border-[--border-interactive] overflow-hidden">
            {(['all', 'inbound', 'outbound', 'flagged'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs capitalize transition-all ${filter === f ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400 font-medium' : 'text-[--text-24] hover:text-[--text-100]'}`}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {/* Email List + Detail */}
      {(emails.length > 0 || accounts.length > 0) && (
        <div className="flex gap-6">
          {/* Email List */}
          <div className="flex-1 space-y-2">
            {filtered.length > 0 ? filtered.map(email => (
              <button
                key={email.id}
                onClick={() => { setSelectedEmail(email); setDraftReply(''); }}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-150 ${
                  selectedEmail?.id === email.id ? 'border-blue-500/30 bg-blue-500/5' : 'border-[--border-base] bg-[--glass-bg] hover:border-[--border-interactive]'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {email.direction === 'inbound' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 dark:text-blue-400 font-medium">IN</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-medium">OUT</span>
                    )}
                    <span className="text-sm text-[--text-100] font-medium">{email.lead_name || email.from_address}</span>
                    {email.status === 'flagged' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">FLAGGED</span>}
                    {email.status === 'received' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <span className="text-[10px] text-[--text-12] shrink-0">{fmtDate(email.created_at)}</span>
                </div>
                <p className="text-xs text-[--text-72] mb-1">{email.subject}</p>
                <p className="text-xs text-[--text-12] line-clamp-1">{email.body_text.slice(0, 100)}...</p>
                {email.ai_summary && <p className="text-[10px] text-cyan-500/70 dark:text-cyan-400/60 mt-1 line-clamp-1">AI: {email.ai_summary}</p>}
              </button>
            )) : (
              <div className="glass-panel p-8">
                <div className="empty-state py-4">
                  <svg className="w-8 h-8 text-[--text-12]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51" />
                  </svg>
                  <p className="text-sm text-[--text-24]">No emails yet. Emails will appear once your accounts sync.</p>
                </div>
              </div>
            )}
          </div>

          {/* Email Detail */}
          {selectedEmail && (
            <div className="w-96 shrink-0 glass-panel p-5 space-y-4 sticky top-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${selectedEmail.direction === 'inbound' ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400' : 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400'}`}>{selectedEmail.direction.toUpperCase()}</span>
                  {selectedEmail.lead_name && (
                    <Link href={`/leads/${selectedEmail.lead_id}`} className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">{selectedEmail.lead_name}</Link>
                  )}
                </div>
                <h3 className="text-sm font-medium text-[--text-100] mb-1">{selectedEmail.subject}</h3>
                <p className="text-xs text-[--text-24]">From: {selectedEmail.from_address}</p>
                <p className="text-xs text-[--text-24]">To: {selectedEmail.to_address}</p>
                <p className="text-[10px] text-[--text-12]">{new Date(selectedEmail.created_at).toLocaleString()}</p>
              </div>

              {selectedEmail.ai_summary && (
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-[10px] text-cyan-500 dark:text-cyan-400 mb-1 font-medium">AI Summary</p>
                  <p className="text-xs text-[--text-72]">{selectedEmail.ai_summary}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[--glass-bg] border border-[--border-base]">
                <p className="text-sm text-[--text-72] whitespace-pre-wrap">{selectedEmail.body_text}</p>
              </div>

              {selectedEmail.direction === 'inbound' && (
                <div className="space-y-3">
                  <button onClick={() => generateReply(selectedEmail)} disabled={generatingReply} className="w-full px-4 py-2 rounded-lg bg-blue-500/20 text-blue-500 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                    {generatingReply ? 'Generating...' : 'AI Draft Reply'}
                  </button>
                  {draftReply && (
                    <div>
                      <textarea value={draftReply} onChange={e => setDraftReply(e.target.value)} rows={6} className="w-full input-glass px-4 py-3 text-sm font-mono resize-y" />
                      <button className="w-full mt-2 btn-primary py-2">Send Reply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
