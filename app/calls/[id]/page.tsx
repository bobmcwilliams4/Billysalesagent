'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { apiFetch, API_BASE } from '../../lib/api';

// -- Types -------------------------------------------------------------------

interface TranscriptLine {
  speaker: 'agent' | 'lead';
  text: string;
  timestamp: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface Highlight {
  type: 'objection' | 'commitment' | 'appointment' | 'data_extracted' | 'key_moment';
  label: string;
  detail: string;
  timestamp: number;
}

interface CostBreakdown {
  twilio: number;
  deepgram: number;
  elevenlabs: number;
  llm: number;
  total: number;
}

interface CoachingNote {
  category: 'positive' | 'improvement' | 'technique';
  text: string;
}

interface CallDetail {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'failed' | 'no_answer' | 'in_progress';
  disposition: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  cost: number;
  cost_breakdown: CostBreakdown;
  transcript_summary: string;
  transcript: TranscriptLine[];
  highlights: Highlight[];
  sentiment_overall: 'positive' | 'neutral' | 'negative';
  sentiment_timeline: number[];
  coaching_notes: CoachingNote[];
  campaign_name: string | null;
  script_name: string | null;
  recording_url: string | null;
}

// -- Helpers -----------------------------------------------------------------

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className || ''}`} />;
}

// -- Waveform Visualizer -----------------------------------------------------

function WaveformBars({ progress, barCount = 80 }: { progress: number; barCount?: number }) {
  const bars = useRef<number[]>([]);
  if (bars.current.length === 0) {
    bars.current = Array.from({ length: barCount }, () => 0.15 + Math.random() * 0.85);
  }
  return (
    <div className="flex items-end gap-[1px] h-10 w-full">
      {bars.current.map((h, i) => {
        const pct = i / barCount;
        const played = pct <= progress;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-colors duration-100"
            style={{
              height: `${h * 100}%`,
              backgroundColor: played ? '#3B82F6' : 'rgba(255,255,255,0.08)',
            }}
          />
        );
      })}
    </div>
  );
}

// -- Sentiment Bar -----------------------------------------------------------

function SentimentTimeline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  return (
    <div className="flex items-end gap-[2px] h-8 w-full">
      {data.map((v, i) => {
        let color = '#F59E0B';
        if (v >= 0.65) color = '#10B981';
        else if (v < 0.4) color = '#EF4444';
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${v * 100}%`, backgroundColor: color, opacity: 0.7 }}
          />
        );
      })}
    </div>
  );
}

// -- Highlight Type Config ---------------------------------------------------

const HIGHLIGHT_CONFIG: Record<Highlight['type'], { icon: string; color: string; border: string; bg: string }> = {
  objection:      { icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
  commitment:     { icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  appointment:    { icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
  data_extracted: { icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
  key_moment:     { icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
};

// -- Main Component ----------------------------------------------------------

export default function CallReviewPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;

  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'highlights' | 'coaching'>('transcript');

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Transcript auto-scroll
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    async function fetchCall() {
      try {
        const res = await apiFetch(`/calls/${callId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setCall(json.data);
        }
      } catch {
        // API not live yet
      }
      setLoading(false);
    }
    fetchCall();
  }, [callId]);

  // Audio time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !call) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || call.duration_seconds);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('ended', onEnd);
    };
  }, [call]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play().catch(() => {}); }
    setPlaying(!playing);
  }, [playing]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const seekProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!call) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const effectiveDuration = duration || call.duration_seconds;
    seekTo(pct * effectiveDuration);
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fadeInUp">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-4 w-64" />
          </div>
        </div>
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonBlock className="lg:col-span-2 h-[500px]" />
          <div className="space-y-5">
            <SkeletonBlock className="h-40" />
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeInUp">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white/40 tracking-tight mb-1">Call not found</p>
        <p className="text-sm text-white/25 mb-4">This call record may not exist or has not been synced yet.</p>
        <button onClick={() => router.back()} className="text-blue-400 hover:text-blue-300 text-sm">Go back</button>
      </div>
    );
  }

  const effectiveDuration = duration || call.duration_seconds;
  const progress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;

  // Find active transcript line
  const activeLineIdx = call.transcript.findLastIndex((l) => l.timestamp <= currentTime);

  const sentimentLabel = (s: string) => {
    if (s === 'positive') return { text: 'Positive', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
    if (s === 'negative') return { text: 'Negative', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    return { text: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
  };

  const sent = sentimentLabel(call.sentiment_overall);

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/90 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white/90 tracking-tight">{call.lead_name}</h2>
            <div className="flex items-center gap-3 text-sm text-white/25">
              <span>{call.lead_phone}</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>{fmtDateTime(call.started_at)}</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="font-mono">{fmtDuration(call.duration_seconds)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/25 transition-colors">
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Call Again
          </button>
          <button className="px-3 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/25 transition-colors">
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Send Follow-up
          </button>
          <button className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-colors">
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Book Appointment
          </button>
          <button className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/25 transition-colors">
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Set Disposition
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {call.campaign_name && (
          <span className="px-2.5 py-1 rounded-lg text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20">{call.campaign_name}</span>
        )}
        {call.script_name && (
          <span className="px-2.5 py-1 rounded-lg text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/20">{call.script_name}</span>
        )}
        <span className={`px-2.5 py-1 rounded-lg text-[11px] border ${sent.bg} ${sent.color} ${sent.border}`}>{sent.text} Sentiment</span>
        <span className="px-2.5 py-1 rounded-lg text-[11px] bg-white/5 text-white/60 border border-white/[0.04] capitalize">{call.direction}</span>
        <span className="px-2.5 py-1 rounded-lg text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{call.disposition}</span>
      </div>

      {/* Audio Player */}
      <div className="glass-panel p-5">
        <audio ref={audioRef} src={`${API_BASE}/calls/${callId}/recording`} preload="metadata" />

        <div className="flex items-center gap-4 mb-4">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-colors shrink-0">
            {playing ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time */}
          <span className="text-xs text-white/40 font-mono w-12 shrink-0">{fmtTimestamp(Math.floor(currentTime))}</span>

          {/* Waveform / Seek */}
          <div className="flex-1 cursor-pointer" onClick={seekProgress}>
            <WaveformBars progress={progress} />
          </div>

          {/* Duration */}
          <span className="text-xs text-white/40 font-mono w-12 shrink-0 text-right">{fmtTimestamp(Math.floor(effectiveDuration))}</span>

          {/* Speed */}
          <div className="flex items-center gap-1 shrink-0">
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changeRate(rate)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  playbackRate === rate ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/25 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Sentiment Timeline */}
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Sentiment Timeline</p>
          <SentimentTimeline data={call.sentiment_timeline} />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/15">Start</span>
            <span className="text-[9px] text-white/15">End</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Transcript / Highlights / Coaching (tabbed) */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.04]">
            {([
              { key: 'transcript', label: 'Transcript', count: call.transcript.length },
              { key: 'highlights', label: 'Highlights', count: call.highlights.length },
              { key: 'coaching', label: 'Coaching', count: call.coaching_notes.length },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-blue-500'
                    : 'text-white/25 border-transparent hover:text-white/60'
                }`}
              >
                {tab.label}
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04]">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="h-[500px] overflow-y-auto p-5" ref={transcriptRef}>
            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              call.transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-white/25 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40">No transcript available</p>
                  <p className="text-xs text-white/25 mt-1">Transcript will appear after call processing completes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {call.transcript.map((line, i) => {
                    const isAgent = line.speaker === 'agent';
                    const isActive = i === activeLineIdx;
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 cursor-pointer rounded-lg p-2 transition-colors ${
                          isActive ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/[0.02]'
                        }`}
                        onClick={() => seekTo(line.timestamp)}
                      >
                        <div className="shrink-0 mt-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isAgent ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.04] text-white/40'
                          }`}>
                            {isAgent ? 'AI' : line.speaker[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[11px] font-medium ${isAgent ? 'text-blue-400' : 'text-white/40'}`}>
                              {isAgent ? 'BillyMC' : call.lead_name.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-white/15 font-mono">{fmtTimestamp(line.timestamp)}</span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed">{line.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Highlights Tab */}
            {activeTab === 'highlights' && (
              call.highlights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-white/25 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40">No highlights detected</p>
                  <p className="text-xs text-white/25 mt-1">Key moments will be extracted by AI after the call</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {call.highlights.map((h, i) => {
                    const cfg = HIGHLIGHT_CONFIG[h.type];
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-4 cursor-pointer hover:bg-white/[0.02] transition-colors ${cfg.border} ${cfg.bg}`}
                        onClick={() => seekTo(h.timestamp)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <svg className={`w-4 h-4 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                          </svg>
                          <span className={`text-sm font-medium ${cfg.color}`}>{h.label}</span>
                          <span className="text-[10px] text-white/15 font-mono ml-auto">{fmtTimestamp(h.timestamp)}</span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">{h.detail}</p>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Coaching Tab */}
            {activeTab === 'coaching' && (
              call.coaching_notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-white/25 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40">No coaching notes yet</p>
                  <p className="text-xs text-white/25 mt-1">AI coaching insights will appear after analysis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {call.coaching_notes.map((note, i) => {
                    const categoryConfig: Record<CoachingNote['category'], { icon: string; color: string; label: string }> = {
                      positive: { icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-400', label: 'Strength' },
                      improvement: { icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z', color: 'text-amber-400', label: 'Improve' },
                      technique: { icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z', color: 'text-blue-400', label: 'Technique' },
                    };
                    const nc = categoryConfig[note.category];
                    return (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <svg className={`w-5 h-5 shrink-0 mt-0.5 ${nc.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={nc.icon} />
                        </svg>
                        <div>
                          <span className={`text-[10px] uppercase tracking-wider font-medium ${nc.color}`}>{nc.label}</span>
                          <p className="text-sm text-white/60 mt-1 leading-relaxed">{note.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Summary + Costs */}
        <div className="space-y-5">
          {/* Summary */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">AI Summary</h3>
            <p className="text-sm text-white/60 leading-relaxed">{call.transcript_summary || 'No summary available yet.'}</p>
          </div>

          {/* Sentiment */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Overall Sentiment</h3>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${sent.bg} ${sent.border}`}>
              <span className={`w-2 h-2 rounded-full ${
                call.sentiment_overall === 'positive' ? 'bg-emerald-400' :
                call.sentiment_overall === 'negative' ? 'bg-red-400' : 'bg-amber-400'
              }`} />
              <span className={`text-sm font-medium ${sent.color}`}>{sent.text}</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Cost Breakdown</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Twilio (telephony)', cost: call.cost_breakdown.twilio, color: '#3B82F6' },
                { label: 'Deepgram (STT)', cost: call.cost_breakdown.deepgram, color: '#10B981' },
                { label: 'ElevenLabs (TTS)', cost: call.cost_breakdown.elevenlabs, color: '#F59E0B' },
                { label: 'LLM (Azure Free)', cost: call.cost_breakdown.llm, color: '#8B5CF6' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-white/40">{item.label}</span>
                  </div>
                  <span className="text-xs text-white/60 font-mono">${item.cost.toFixed(3)}</span>
                </div>
              ))}
              <div className="pt-2.5 mt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-xs text-white/90 font-medium">Total</span>
                <span className="text-sm text-white/90 font-bold font-mono">${call.cost_breakdown.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Call Meta */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Call Details</h3>
            <div className="space-y-2">
              {[
                { label: 'Call ID', value: call.id },
                { label: 'Started', value: fmtDateTime(call.started_at) },
                { label: 'Ended', value: call.ended_at ? fmtDateTime(call.ended_at) : '--' },
                { label: 'Duration', value: fmtDuration(call.duration_seconds) },
                { label: 'Email', value: call.lead_email || '--' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-[11px] text-white/25">{row.label}</span>
                  <span className="text-[11px] text-white/60 font-mono">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
