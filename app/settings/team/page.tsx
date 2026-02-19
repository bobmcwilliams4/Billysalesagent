'use client';
import { useState, useEffect } from 'react';

import { apiFetch } from '../../lib/api';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#F59E0B', admin: '#3B82F6', agent: '#10B981', viewer: '#6B7280',
};

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await apiFetch('/team');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) setUsers(json.data);
        }
      } catch {}
      setLoading(false);
    }
    fetchTeam();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await apiFetch('/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
    } catch {}
    setShowInvite(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white/90 tracking-tight">Team</h2>
          <p className="text-sm text-white/25">{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white/90 text-sm font-medium transition-colors">+ Invite</button>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-blue-500/50">
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <div className="flex gap-3">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 text-sm">Cancel</button>
            <button onClick={handleInvite} className="px-4 py-2 rounded-lg bg-blue-500 text-white/90 text-sm">Send Invite</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-sm text-white/25">No team members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="glass-panel p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white/90 font-bold">{u.avatar || u.name[0]}</div>
                <div>
                  <p className="text-sm text-white/90 font-medium">{u.name}</p>
                  <p className="text-xs text-white/25">{u.email}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ color: ROLE_COLORS[u.role] || '#6B7280', backgroundColor: `${ROLE_COLORS[u.role] || '#6B7280'}15`, border: `1px solid ${ROLE_COLORS[u.role] || '#6B7280'}30` }}>{u.role.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* RBAC Reference */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-medium text-white/90 tracking-tight mb-3">Role Permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/25">
                <th className="text-left py-2">Permission</th>
                <th className="text-center">Owner</th>
                <th className="text-center">Admin</th>
                <th className="text-center">Agent</th>
                <th className="text-center">Viewer</th>
              </tr>
            </thead>
            <tbody className="text-white/40">
              {[
                ['Leads CRUD', true, true, 'R/U', 'R'],
                ['Make Calls', true, true, true, false],
                ['Edit Scripts', true, true, false, false],
                ['Manage Campaigns', true, true, false, false],
                ['View Analytics', true, true, true, true],
                ['Team Management', true, true, false, false],
                ['Settings', true, 'R', false, false],
                ['Billing', true, false, false, false],
              ].map(([perm, owner, admin, agent, viewer], i) => (
                <tr key={i} className="border-t border-white/[0.04]">
                  <td className="py-2">{perm}</td>
                  {[owner, admin, agent, viewer].map((v, j) => (
                    <td key={j} className="text-center">{v === true ? '\u2705' : v === false ? '\u274C' : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
