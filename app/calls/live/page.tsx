'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

import { apiFetch } from '../../lib/api';
const VOICE_WS_BASE = 'wss://billymc-voice.bmcii1976.workers.dev';

// ── Types ───────────────────────────────────────────────────────────────────

interface LiveTranscriptLine {
  speaker: 'agent' | 'lead';
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface LeadInfo {
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: string;
  status: string;
  notes: string | null;
  last_contact: string | null;
  tags: string[];
}

type ScriptState = 'GREETING' | 'DISCOVERY' | 'QUALIFICATION' | 'PRESENTATION' | 'OBJECTION_HANDLING' | 'CLOSING' | 'WRAP_UP';
type SentimentLevel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

interface ActiveCall {
  callId: string;
  leadInfo: LeadInfo;
  scriptState: ScriptState;
  sentiment: SentimentLevel;
  startedAt: string;
  direction: 'inbound' | 'outbound';
  campaignName: string | null;
  scriptName: string;
}

// ── Script State Config ─────────────────────────────────────────────────────

const SCRIPT_STATES: Record<ScriptState, { label: string; color: string; bg: string; border: string; icon: string }> = {
  GREETING:           { label: 'Greeting', color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', icon: 'M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z' },
  DISCOVERY:          { label: 'Discovery', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
  QUALIFICATION:      { label: 'Qualification', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  PRESENTATION:       { label: 'Presentation', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
  OBJECTION_HANDLING: { label: 'Objection Handling', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z' },
  CLOSING:            { label: 'Closing', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0' },
  WRAP_UP:            { label: 'Wrap Up', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/30', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

const SENTIMENT_CONFIG: Record<SentimentLevel, { label: string; color: string; bg: string }> = {
  very_positive: { label: 'Very Positive', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  positive:      { label: 'Positive', color: 'text-green-400', bg: 'bg-green-500' },
  neutral:       { label: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-500' },
  negative:      { label: 'Negative', color: 'text-orange-400', bg: 'bg-orange-500' },
  very_negative: { label: 'Very Negative', color: 'text-red-400', bg: 'bg-red-500' },
};

// ── Main Component ──────────────────────────────────────────────────────────

function LiveCallContent() {
  const [callIdParam, setCallIdParam] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallIdParam(params.get('callId'));
  }, []);

  const [connected, setConnected] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [whisperText, setWhisperText] = useState('');
  const [whisperSending, setWhisperSending] = useState(false);
  const [aiMuted, setAiMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Connect to WebSocket ──────────────────────────────────────────────────

  useEffect(() => {
    const callId = callIdParam || 'live';
    const wsUrl = `${VOICE_WS_BASE}/voice/live/${callId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'call_info') {
            setActiveCall(msg.data);
          } else if (msg.type === 'transcript') {
            setTranscript((prev) => {
              if (!msg.data.isFinal && prev.length > 0 && !prev[prev.length - 1].isFinal) {
                return [...prev.slice(0, -1), msg.data];
              }
              return [...prev, msg.data];
            });
          } else if (msg.type === 'state_change') {
            setActiveCall((prev) => prev ? { ...prev, scriptState: msg.data.state } : prev);
          } else if (msg.type === 'sentiment_update') {
            setActiveCall((prev) => prev ? { ...prev, sentiment: msg.data.sentiment } : prev);
          }
        } catch {}
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [callIdParam]);

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeCall) {
      const startTime = new Date(activeCall.startedAt).getTime();
      const tick = () => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [activeCall]);

  // ── Auto-scroll transcript ────────────────────────────────────────────────

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // ── Send Whisper ──────────────────────────────────────────────────────────

  const sendWhisper = useCallback(async () => {
    if (!whisperText.trim() || !activeCall) return;
    setWhisperSending(true);
    try {
      await apiFetch(`/calls/${activeCall.callId}/whisper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: whisperText.trim() }),
      });
      setWhisperText('');
    } catch {}
    setWhisperSending(false);
  }, [whisperText, activeCall]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const takeOverCall = async () => {
    if (!activeCall) return;
    try {
      await apiFetch(`/calls/${activeCall.callId}/takeover`, { method: 'POST' });
    } catch {}
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      await apiFetch(`/calls/${activeCall.callId}/end`, { method: 'POST' });
    } catch {}
  };

  const toggleMute = async () => {
    if (!activeCall) return;
    try {
      await apiFetch(`/calls/${activeCall.callId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !aiMuted }),
      });
      setAiMuted(!aiMuted);
    } catch {}
  };

  // ── Format time ───────────────────────────────────────────────────────────

  const fmtTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── No Active Call State ──────────────────────────────────────────────────

  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-fadeInUp">
        <div className="glass-panel p-12 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white/90 tracking-tight mb-2">No Active Calls</h3>
          <p className="text-sm text-white/25 mb-6">There are no live calls in progress right now. Start a campaign or wait for an inbound call.</p>
          <div className="flex justify-center gap-3">
            <a
              href="/campaigns"
              className="px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/25 transition-colors"
            >
              View Campaigns
            </a>
            <a
              href="/calls"
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
            >
              Call History
            </a>
          </div>
        </div>
      </div>
    );
  }

  const scriptCfg = SCRIPT_STATES[activeCall.scriptState];
  const sentimentCfg = SENTIMENT_CONFIG[activeCall.sentiment];

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white/90 font-bold text-lg">
              {activeCall.leadInfo.name[0]}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#060612] animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white/90 tracking-tight">{activeCall.leadInfo.name}</h2>
            <div className="flex items-center gap-3 text-sm text-white/25">
              <span>{activeCall.leadInfo.phone}</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="capitalize">{activeCall.direction}</span>
              {activeCall.campaignName && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/15" />
                  <span>{activeCall.campaignName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Timer + Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs uppercase tracking-wider font-medium">LIVE</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-2xl font-mono text-white/90 font-bold">{fmtTimer(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Status Bar: Script State + Sentiment */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${scriptCfg.bg} ${scriptCfg.border}`}>
          <svg className={`w-4 h-4 ${scriptCfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={scriptCfg.icon} />
          </svg>
          <span className={`text-xs font-medium ${scriptCfg.color}`}>Stage: {scriptCfg.label}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <span className={`w-2.5 h-2.5 rounded-full ${sentimentCfg.bg}`} />
          <span className={`text-xs ${sentimentCfg.color}`}>{sentimentCfg.label}</span>
        </div>

        <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <span className="text-xs text-purple-300">{activeCall.scriptName}</span>
        </div>

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ${
          connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          {connected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Transcript Feed */}
        <div className="lg:col-span-3 glass-panel overflow-hidden flex flex-col" style={{ height: '500px' }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/90">Live Transcript</h3>
            <span className="text-[10px] text-white/25">{transcript.length} lines</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {transcript.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-white/25">Waiting for conversation...</p>
              </div>
            )}
            {transcript.map((line, i) => {
              const isAgent = line.speaker === 'agent';
              return (
                <div key={i} className={`flex gap-3 ${!line.isFinal ? 'opacity-60' : ''}`}>
                  <div className="shrink-0 mt-0.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isAgent ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-white/40'
                    }`}>
                      {isAgent ? 'AI' : 'L'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[11px] font-medium ${isAgent ? 'text-blue-400' : 'text-white/40'}`}>
                        {isAgent ? 'BillyMC' : activeCall.leadInfo.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-white/15 font-mono">
                        {Math.floor(line.timestamp / 60)}:{(line.timestamp % 60).toString().padStart(2, '0')}
                      </span>
                      {!line.isFinal && (
                        <span className="text-[9px] text-amber-400 italic">typing...</span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{line.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
          </div>

          {/* Whisper Input */}
          <div className="px-5 py-3 border-t border-white/[0.04] bg-black/20">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <input
                  type="text"
                  placeholder="Whisper instruction to AI agent..."
                  value={whisperText}
                  onChange={(e) => setWhisperText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendWhisper(); }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
              </div>
              <button
                onClick={sendWhisper}
                disabled={!whisperText.trim() || whisperSending}
                className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {whisperSending ? 'Sending...' : 'Whisper'}
              </button>
            </div>
            <p className="text-[10px] text-white/15 mt-1.5">Whisper instructions are only heard by the AI, not the caller</p>
          </div>
        </div>

        {/* Right Sidebar: Lead Info + Actions */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="glass-panel p-4 space-y-2">
            <h4 className="text-xs text-white/25 uppercase tracking-wider mb-3">Actions</h4>
            <button
              onClick={takeOverCall}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/25 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Take Over Call
            </button>
            <button
              onClick={toggleMute}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                aiMuted
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {aiMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                )}
              </svg>
              {aiMuted ? 'Unmute AI' : 'Mute AI'}
            </button>
            <button
              onClick={endCall}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0l6-6m-3 18c-8.284 0-15-6.716-15-15M4.5 4.5l6 6" />
              </svg>
              End Call
            </button>
          </div>

          {/* Lead Info */}
          <div className="glass-panel p-4">
            <h4 className="text-xs text-white/25 uppercase tracking-wider mb-3">Lead Info</h4>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] text-white/15">Name</p>
                <p className="text-sm text-white/90">{activeCall.leadInfo.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/15">Phone</p>
                <p className="text-sm text-white/60 font-mono">{activeCall.leadInfo.phone}</p>
              </div>
              {activeCall.leadInfo.email && (
                <div>
                  <p className="text-[10px] text-white/15">Email</p>
                  <p className="text-sm text-white/60">{activeCall.leadInfo.email}</p>
                </div>
              )}
              {activeCall.leadInfo.company && (
                <div>
                  <p className="text-[10px] text-white/15">Company</p>
                  <p className="text-sm text-white/60">{activeCall.leadInfo.company}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-white/15">Source</p>
                <p className="text-sm text-white/60">{activeCall.leadInfo.source}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/15">Status</p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 capitalize">
                  {activeCall.leadInfo.status}
                </span>
              </div>
              {activeCall.leadInfo.tags.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/15 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {activeCall.leadInfo.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/40 border border-white/[0.04]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeCall.leadInfo.notes && (
                <div>
                  <p className="text-[10px] text-white/15">Notes</p>
                  <p className="text-xs text-white/40 leading-relaxed">{activeCall.leadInfo.notes}</p>
                </div>
              )}
              {activeCall.leadInfo.last_contact && (
                <div>
                  <p className="text-[10px] text-white/15">Last Contact</p>
                  <p className="text-xs text-white/40">
                    {new Date(activeCall.leadInfo.last_contact).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Script State Progress */}
          <div className="glass-panel p-4">
            <h4 className="text-xs text-white/25 uppercase tracking-wider mb-3">Script Flow</h4>
            <div className="space-y-1">
              {(Object.entries(SCRIPT_STATES) as [ScriptState, typeof SCRIPT_STATES[ScriptState]][]).map(([key, cfg]) => {
                const isActive = key === activeCall.scriptState;
                const states = Object.keys(SCRIPT_STATES) as ScriptState[];
                const currentIdx = states.indexOf(activeCall.scriptState);
                const thisIdx = states.indexOf(key);
                const isPast = thisIdx < currentIdx;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                      isActive ? `${cfg.bg} border ${cfg.border}` : isPast ? 'opacity-40' : 'opacity-25'
                    }`}
                  >
                    <svg className={`w-3.5 h-3.5 ${isActive ? cfg.color : 'text-white/25'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                    <span className={`text-[11px] ${isActive ? cfg.color : 'text-white/25'}`}>{cfg.label}</span>
                    {isPast && (
                      <svg className="w-3 h-3 ml-auto text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    {isActive && (
                      <span className={`w-1.5 h-1.5 rounded-full ml-auto animate-pulse ${cfg.bg.replace('/15', '')}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveCallPage() {
  return <LiveCallContent />;
}
