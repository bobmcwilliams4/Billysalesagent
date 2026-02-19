'use client';

interface MemoryFact {
  id: string;
  content: string;
  source: string;
  source_id: string;
  source_date: string;
  confidence: number;
  category: string;
}

export default function MemoryFacts({ facts }: { facts: MemoryFact[] }) {
  if (!facts.length) return <p className="text-xs text-gray-600">No memory facts recorded yet.</p>;

  const categoryColors: Record<string, string> = {
    insurance: '#3B82F6', personal: '#8B5CF6', financial: '#10B981',
    preference: '#F59E0B', objection: '#EF4444', appointment: '#06B6D4',
  };

  return (
    <div className="space-y-2">
      {facts.map(fact => (
        <div key={fact.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
          <p className="text-sm text-gray-200">{fact.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px]" style={{ color: categoryColors[fact.category] || '#6B7280', backgroundColor: `${categoryColors[fact.category] || '#6B7280'}15`, border: `1px solid ${categoryColors[fact.category] || '#6B7280'}30` }}>
              {fact.category}
            </span>
            <span className="text-[10px] text-gray-600">
              Source: {fact.source} #{fact.source_id} &middot; {fact.source_date}
            </span>
            <span className="text-[10px] text-gray-600">{Math.round(fact.confidence * 100)}% confidence</span>
          </div>
        </div>
      ))}
    </div>
  );
}
