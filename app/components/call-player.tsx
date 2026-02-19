'use client';
import { useState, useRef, useEffect } from 'react';

interface TranscriptEntry {
  speaker: 'agent' | 'lead';
  text: string;
  timestamp: number;
}

export default function CallPlayer({ recordingUrl, transcript }: { recordingUrl?: string; transcript?: TranscriptEntry[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onDur); audio.removeEventListener('ended', onEnd); };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const t = Number(e.target.value);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seekTo = (ts: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = ts;
    setCurrentTime(ts);
    if (!playing) { audioRef.current.play(); setPlaying(true); }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Audio Element */}
      {recordingUrl && <audio ref={audioRef} src={recordingUrl} preload="metadata" />}

      {/* Player Controls */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center gap-4">
          <button onClick={toggle} className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex items-center justify-center transition-colors">
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="flex-1">
            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={seek} className="w-full accent-blue-500 h-1" />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          <button onClick={changeSpeed} className="px-2 py-1 rounded text-xs text-gray-400 bg-white/5 hover:bg-white/10 transition-colors font-mono">{speed}x</button>
        </div>

        {/* Waveform visualization (simple bars) */}
        <div className="flex items-end gap-px h-8 mt-3">
          {Array.from({ length: 60 }, (_, i) => {
            const h = Math.sin(i * 0.3) * 0.5 + 0.5;
            const active = duration > 0 && (i / 60) * duration <= currentTime;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{ height: `${h * 100}%`, backgroundColor: active ? '#3B82F6' : '#ffffff10' }}
              />
            );
          })}
        </div>
      </div>

      {/* Transcript */}
      {transcript && transcript.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 max-h-96 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-3">TRANSCRIPT</p>
          <div className="space-y-2">
            {transcript.map((entry, i) => (
              <button
                key={i}
                onClick={() => seekTo(entry.timestamp)}
                className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors flex items-start gap-3"
              >
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${entry.speaker === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {entry.speaker === 'agent' ? 'AI' : 'Lead'}
                </span>
                <span className="text-sm text-gray-300 flex-1">{entry.text}</span>
                <span className="text-[10px] text-gray-600 shrink-0">{fmtTime(entry.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!recordingUrl && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-gray-600 text-sm">No recording available</p>
          <p className="text-[10px] text-gray-700 mt-1">Recording will appear after the call completes</p>
        </div>
      )}
    </div>
  );
}
