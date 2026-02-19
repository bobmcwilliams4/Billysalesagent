'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

import { apiFetch } from '../../lib/api';

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  direction: 'inbound' | 'outbound';
}

interface EmailThread {
  id: string;
  subject: string;
  lead_name: string;
  lead_email: string;
  messages: EmailMessage[];
  status: string;
}

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchThread() {
      try {
        const res = await apiFetch(`/emails/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setThread(json.data);
        }
      } catch {}
      setLoading(false);
    }
    fetchThread();
  }, [id]);

  const handleReply = async () => {
    if (!replyText.trim() || !thread) return;
    setSending(true);
    try {
      const res = await apiFetch(`/emails/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setThread(prev => prev ? { ...prev, messages: [...prev.messages, json.data] } : prev);
        }
        setReplyText('');
      }
    } catch {}
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      <Link href="/emails" className="text-xs text-white/25 hover:text-white/90 transition-colors inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Emails
      </Link>

      {!thread ? (
        <div className="glass-panel p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white/90 tracking-tight mb-2">Email Thread Not Found</h3>
          <p className="text-sm text-white/25">Thread #{id} could not be loaded. It may not exist or the API is unavailable.</p>
        </div>
      ) : (
        <>
          {/* Thread Header */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white/90 tracking-tight">{thread.subject}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                thread.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                thread.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-white/5 text-white/40'
              }`}>
                {thread.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/40">
              <span>{thread.lead_name}</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="font-mono text-xs">{thread.lead_email}</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {thread.messages.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div key={msg.id} className={`glass-panel p-5 ${isOutbound ? 'border-l-2 border-l-blue-500/30' : 'border-l-2 border-l-white/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isOutbound ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'
                      }`}>
                        {isOutbound ? 'AI' : msg.from[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${isOutbound ? 'text-blue-400' : 'text-white/60'}`}>
                          {msg.from}
                        </span>
                        <span className="text-[10px] text-white/15 ml-2">
                          to {msg.to}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-white/15 font-mono">
                      {new Date(msg.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{msg.body}</div>
                </div>
              );
            })}
          </div>

          {/* Reply */}
          <div className="glass-panel p-5 space-y-3">
            <h4 className="text-xs text-white/25 uppercase tracking-wider">Reply</h4>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50 resize-none transition-colors"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white/90 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
