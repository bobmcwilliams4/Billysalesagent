'use client';

interface CostData {
  label: string;
  twilio: number;
  deepgram: number;
  elevenlabs: number;
  llm: number;
}

export default function CostChart({ data, height = 200 }: { data: CostData[]; height?: number }) {
  if (!data.length) return null;

  const maxTotal = Math.max(...data.map(d => d.twilio + d.deepgram + d.elevenlabs + d.llm), 1);

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const total = d.twilio + d.deepgram + d.elevenlabs + d.llm;
          const barH = (total / maxTotal) * (height - 30);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: barH }}>
                {d.twilio > 0 && <div style={{ flex: d.twilio / total, backgroundColor: '#3B82F640' }} />}
                {d.deepgram > 0 && <div style={{ flex: d.deepgram / total, backgroundColor: '#10B98140' }} />}
                {d.elevenlabs > 0 && <div style={{ flex: d.elevenlabs / total, backgroundColor: '#F59E0B40' }} />}
                {d.llm > 0 && <div style={{ flex: d.llm / total, backgroundColor: '#8B5CF640' }} />}
              </div>
              <p className="text-[9px] text-gray-600 mt-1 truncate w-full text-center">{d.label}</p>
              <p className="text-[10px] text-white font-medium">${total.toFixed(2)}</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        <Legend color="#3B82F6" label="Twilio" />
        <Legend color="#10B981" label="Deepgram" />
        <Legend color="#F59E0B" label="ElevenLabs" />
        <Legend color="#8B5CF6" label="LLM" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-3 h-2 rounded" style={{ backgroundColor: `${color}40` }} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}
