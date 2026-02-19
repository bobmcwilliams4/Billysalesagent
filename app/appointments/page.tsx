'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../lib/api';

interface Appointment {
  id: string;
  lead_name: string;
  lead_phone: string;
  agent_name: string;
  appointment_time: string;
  duration_minutes: number;
  type: string;
  status: string;
  notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  completed: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  no_show: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const SAMPLE_APPOINTMENTS: Appointment[] = [
  { id: '1', lead_name: 'John Smith', lead_phone: '(432) 555-0123', agent_name: 'Billy McWilliams', appointment_time: '2026-02-18T14:00:00Z', duration_minutes: 30, type: 'phone', status: 'scheduled', notes: 'Interested in auto + home bundle. Currently paying $280/mo for auto with Progressive.', created_at: '2026-02-17T10:00:00Z' },
  { id: '2', lead_name: 'Mary Johnson', lead_phone: '(432) 555-0456', agent_name: 'Billy McWilliams', appointment_time: '2026-02-18T15:30:00Z', duration_minutes: 30, type: 'phone', status: 'confirmed', notes: 'Medicare supplement inquiry. Turning 65 in March.', created_at: '2026-02-17T11:00:00Z' },
  { id: '3', lead_name: 'Robert Williams', lead_phone: '(432) 555-0789', agent_name: 'Billy McWilliams', appointment_time: '2026-02-19T10:00:00Z', duration_minutes: 45, type: 'in_person', status: 'scheduled', notes: 'Commercial policy review. Owns 3 rental properties.', created_at: '2026-02-17T14:00:00Z' },
  { id: '4', lead_name: 'Patricia Brown', lead_phone: '(432) 555-0321', agent_name: 'Billy McWilliams', appointment_time: '2026-02-17T09:00:00Z', duration_minutes: 30, type: 'phone', status: 'completed', notes: 'Quoted auto insurance. Saving $65/mo. Will decide by Friday.', created_at: '2026-02-16T16:00:00Z' },
  { id: '5', lead_name: 'James Wilson', lead_phone: '(432) 555-0654', agent_name: 'Billy McWilliams', appointment_time: '2026-02-17T11:00:00Z', duration_minutes: 30, type: 'phone', status: 'no_show', notes: 'Homeowner insurance. New construction.', created_at: '2026-02-16T12:00:00Z' },
];

function getDayAppointments(appointments: Appointment[], date: Date) {
  const dateStr = date.toISOString().split('T')[0];
  return appointments.filter(a => a.appointment_time.startsWith(dateStr));
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newAppt, setNewAppt] = useState({ lead_name: '', lead_phone: '', date: '', time: '', duration: 30, type: 'phone', notes: '' });

  useEffect(() => {
    apiFetch(`/appointments`).then(r => r.json()).then(d => { if (d.data?.length) setAppointments(d.data); }).catch(() => {});
  }, []);

  const filtered = statusFilter === 'all' ? appointments : appointments.filter(a => a.status === statusFilter);
  const upcoming = filtered.filter(a => new Date(a.appointment_time) >= new Date()).sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
  const past = filtered.filter(a => new Date(a.appointment_time) < new Date()).sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime());

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const createAppointment = async () => {
    if (!newAppt.lead_name || !newAppt.date || !newAppt.time) return;
    const appt: Appointment = {
      id: crypto.randomUUID(), lead_name: newAppt.lead_name, lead_phone: newAppt.lead_phone,
      agent_name: 'Billy McWilliams', appointment_time: `${newAppt.date}T${newAppt.time}:00Z`,
      duration_minutes: newAppt.duration, type: newAppt.type, status: 'scheduled',
      notes: newAppt.notes, created_at: new Date().toISOString(),
    };
    try {
      await apiFetch(`/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appt) });
    } catch {}
    setAppointments(prev => [appt, ...prev]);
    setShowCreate(false);
    setNewAppt({ lead_name: '', lead_phone: '', date: '', time: '', duration: 30, type: 'phone', notes: '' });
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/appointments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    } catch {}
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Appointments</h2>
          <p className="text-sm text-gray-500">{upcoming.length} upcoming, {past.length} past</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs ${view === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}>List</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-xs ${view === 'calendar' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}>Calendar</button>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">+ Book</button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111128] p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Book Appointment</h3>
            <input value={newAppt.lead_name} onChange={e => setNewAppt({ ...newAppt, lead_name: e.target.value })} placeholder="Lead name" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
            <input value={newAppt.lead_phone} onChange={e => setNewAppt({ ...newAppt, lead_phone: e.target.value })} placeholder="Phone" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={newAppt.date} onChange={e => setNewAppt({ ...newAppt, date: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
              <input type="time" value={newAppt.time} onChange={e => setNewAppt({ ...newAppt, time: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" />
            </div>
            <select value={newAppt.type} onChange={e => setNewAppt({ ...newAppt, type: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
              <option value="phone">Phone Call</option>
              <option value="in_person">In Person</option>
              <option value="video">Video Call</option>
            </select>
            <textarea value={newAppt.notes} onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })} placeholder="Notes" rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
              <button onClick={createAppointment} className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">Book</button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-emerald-400 mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcoming.map(appt => {
              const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
              return (
                <div key={appt.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-white">{appt.lead_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border}`}>{appt.status.replace('_', ' ').toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400">{appt.type}</span>
                      </div>
                      <p className="text-xs text-gray-400">{appt.lead_phone}</p>
                      {appt.notes && <p className="text-xs text-gray-500 mt-2">{appt.notes}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm text-blue-400 font-medium">{fmtDate(appt.appointment_time)}</p>
                      <p className="text-xs text-gray-400">{fmtTime(appt.appointment_time)} ({appt.duration_minutes}min)</p>
                      <div className="flex gap-1 mt-2 justify-end">
                        {appt.status === 'scheduled' && <button onClick={() => updateStatus(appt.id, 'confirmed')} className="px-2 py-1 rounded text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Confirm</button>}
                        {(appt.status === 'scheduled' || appt.status === 'confirmed') && <button onClick={() => updateStatus(appt.id, 'cancelled')} className="px-2 py-1 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30">Cancel</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Past</h3>
          <div className="space-y-2">
            {past.map(appt => {
              const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
              return (
                <div key={appt.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 opacity-60 hover:opacity-80 transition-opacity">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-300">{appt.lead_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border}`}>{appt.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-gray-500">{fmtDate(appt.appointment_time)} {fmtTime(appt.appointment_time)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
