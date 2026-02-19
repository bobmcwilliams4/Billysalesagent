'use client';
import { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: { source: string; id: string; date: string }[];
}

export default function CopilotWidget({ apiBase, user }: { apiBase: string; user: User | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: "What's up, boss? I'm Ace — your AI sales wingman. I know every lead, every call, every number in your CRM. Ask me anything or tell me what to do. Let's close some deals.", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = user ? await user.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['X-Echo-API-Key'] = 'echo-omega-prime-billymc-2026';
      }
      const res = await fetch(`${apiBase}/billy/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || data.response || data.error || 'No response received.',
        timestamp: new Date(),
        citations: data.citations,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Connection hiccup: ${err.message}. Give me a sec...`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-red-500/80 hover:bg-red-500 rotate-45 shadow-lg shadow-red-500/20'
            : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:scale-110 shadow-lg shadow-amber-500/20'
        }`}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        ) : (
          <span className="text-2xl font-orbitron font-bold text-white">A</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="copilot-panel fixed bottom-24 right-6 z-50 w-96 h-[520px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-amber-500/20">A</div>
              <div>
                <p className="text-sm font-medium text-white">Ace</p>
                <p className="text-[10px] text-amber-400/60">Sales AI — Total Recall Active</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500/[0.12] text-amber-100/90 border border-amber-500/[0.15]'
                    : 'bg-white/[0.03] text-white/70 border border-white/[0.04]'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                      <p className="text-[10px] text-white/25 mb-1">Sources:</p>
                      {msg.citations.map((c, i) => (
                        <span key={i} className="text-[10px] text-amber-400/60 mr-2">[{c.source} #{c.id} - {c.date}]</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.04]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Ace anything..."
                className="input-glass flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 transition-all text-white text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
