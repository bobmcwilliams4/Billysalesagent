'use client';
import { useState } from 'react';

const SAMPLE_USERS = [
  { id: '1', name: 'Billy McWilliams', email: 'billy@billymc.com', role: 'owner', avatar: 'B', created_at: '2026-02-17' },
  { id: '2', name: 'Bobby McWilliams', email: 'bobby@echo-op.com', role: 'admin', avatar: 'R', created_at: '2026-02-17' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: '#F59E0B', admin: '#3B82F6', agent: '#10B981', viewer: '#6B7280',
};

export default function TeamPage() {
  const [users, setUsers] = useState(SAMPLE_USERS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Team</h2>
          <p className="text-sm text-gray-500">{users.length} team members</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">+ Invite</button>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <div className="flex gap-3">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm">Cancel</button>
            <button onClick={() => { setShowInvite(false); setInviteEmail(''); }} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm">Send Invite</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">{u.avatar}</div>
              <div>
                <p className="text-sm text-white font-medium">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ color: ROLE_COLORS[u.role], backgroundColor: `${ROLE_COLORS[u.role]}15`, border: `1px solid ${ROLE_COLORS[u.role]}30` }}>{u.role.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* RBAC Reference */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <h3 className="text-sm font-medium text-white mb-3">Role Permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-2">Permission</th>
                <th className="text-center">Owner</th>
                <th className="text-center">Admin</th>
                <th className="text-center">Agent</th>
                <th className="text-center">Viewer</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
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
                <tr key={i} className="border-t border-white/5">
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
