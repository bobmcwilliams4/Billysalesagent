'use client';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  source?: string;
  priority: number;
}

const COLUMNS = [
  { key: 'new', label: 'New', color: '#3B82F6' },
  { key: 'contacted', label: 'Contacted', color: '#06B6D4' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B' },
  { key: 'appointment_set', label: 'Appointment Set', color: '#10B981' },
  { key: 'converted', label: 'Converted', color: '#8B5CF6' },
  { key: 'lost', label: 'Lost', color: '#EF4444' },
];

export default function PipelineBoard({ leads, onLeadClick }: { leads: Lead[]; onLeadClick?: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colLeads = leads.filter(l => l.status === col.key);
        return (
          <div key={col.key} className="min-w-[220px] flex-1">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-medium text-gray-400">{col.label}</span>
              </div>
              <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{colLeads.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {colLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => onLeadClick?.(lead.id)}
                  className="w-full text-left p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-colors"
                >
                  <p className="text-sm text-white font-medium">{lead.first_name} {lead.last_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
                  <div className="flex items-center justify-between mt-2">
                    {lead.source && <span className="text-[10px] text-gray-600">{lead.source}</span>}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.ceil(lead.priority / 2) ? 'bg-amber-400' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
              {colLeads.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed border-white/5 text-center">
                  <p className="text-[10px] text-gray-700">No leads</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
