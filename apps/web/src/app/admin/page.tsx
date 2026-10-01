'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  Server,
  Users,
  Database,
  Terminal,
  Activity,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPortalPage() {
  const router = useRouter();

  // Stealth check
  const isPortalEnabled = process.env.NEXT_PUBLIC_ENABLE_ADMIN_PORTAL === 'true';
  if (!isPortalEnabled) {
    notFound();
  }

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await api.getMe();
      setCurrentUser(me);

      if (me.role !== 'admin') {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      const [statsData, usersData] = await Promise.all([
        api.getAdminStats(),
        api.listAdminUsers(),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleUserId(userId);
    try {
      await api.updateAdminUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleCleanOrphans = async () => {
    setMaintenanceMsg('Inspecting physical MongoDB cluster for orphaned virtual databases...');
    try {
      const res = await api.cleanOrphanedDatabases();
      setMaintenanceMsg(
        `Maintenance Complete: Purged ${res.cleanedCount} orphaned database namespaces successfully.`
      );
      // Reload stats
      const newStats = await api.getAdminStats();
      setStats(newStats);
    } catch (err: any) {
      setMaintenanceMsg(`Maintenance failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono text-white/60">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          <span>Verifying Administrative Clearance...</span>
        </div>
      </div>
    );
  }

  // 403 Forbidden Access Screen if role !== 'admin'
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0c0d12] border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-barlow font-black text-2xl uppercase tracking-tight text-white mb-2">
            Administrative Clearance Required
          </h1>
          <p className="text-xs font-montserrat text-white/60 leading-relaxed mb-6">
            You are currently signed in as{' '}
            <span className="font-bold text-white">{currentUser?.displayName || 'User'}</span> with role{' '}
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] uppercase">
              {currentUser?.role || 'student'}
            </span>
            . Access to the system telemetry and cluster administration console requires the{' '}
            <strong className="text-amber-400">admin</strong> role.
          </p>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold transition-all shadow-md"
            >
              Switch to Lead Developer / Admin Persona (Vraj)
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-all border border-white/10"
            >
              Return to Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard Content
  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col">
      {/* Top Admin Header */}
      <header className="h-16 border-b border-white/10 bg-[#0c0d12] px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-barlow font-black text-base uppercase tracking-wider text-white">
              DATA-CHAN / Admin Telemetry
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest">
              Root Level
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 border border-white/10 flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
            Admin: {currentUser?.displayName}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
              <span>Total Platform Users</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-barlow font-black text-3xl sm:text-4xl text-white mt-3">
              {stats?.overview?.totalUsers ?? '—'}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Students: {stats?.roles?.students ?? 0} | Faculty: {stats?.roles?.faculty ?? 0} | Admins: {stats?.roles?.admins ?? 0}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
              <span>Virtual Sandboxes</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-barlow font-black text-3xl sm:text-4xl text-white mt-3">
              {stats?.overview?.totalDatabases ?? '—'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Isolated Namespaces Active</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
              <span>MQL Executions</span>
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-barlow font-black text-3xl sm:text-4xl text-white mt-3">
              {stats?.overview?.totalQueries ?? '—'}
            </div>
            <div className="text-[11px] text-white/40 mt-1">Safe AST Sandboxed Queries</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0d12] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/50 text-xs font-semibold uppercase tracking-wider">
              <span>MongoDB Engine</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-barlow font-black text-2xl text-emerald-400 mt-3 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              <span>{stats?.system?.status ?? 'CONNECTED'}</span>
            </div>
            <div className="text-[11px] text-white/40 mt-1 font-mono">
              DB: {stats?.system?.platformDatabase} ({stats?.system?.version})
            </div>
          </div>
        </div>

        {/* Maintenance Action Card */}
        <div className="p-5 rounded-2xl bg-[#0c0d12] border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Cluster Storage Maintenance & Orphan Purge</span>
            </div>
            <p className="text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
              Scan the physical MongoDB instance for leftover sandboxed namespaces (e.g. databases dropped during development) and drop orphaned collections to prevent wiredTiger storage leak.
            </p>
            {maintenanceMsg && (
              <div className="mt-2 text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
                {maintenanceMsg}
              </div>
            )}
          </div>
          <button
            onClick={handleCleanOrphans}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 shrink-0 transition-all active:scale-[0.99]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Dangling Namespaces</span>
          </button>
        </div>

        {/* User Management & Role Audit */}
        <div className="bg-[#0c0d12] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-barlow font-black text-lg uppercase tracking-wider text-white">
                Platform Identity & Role Directory
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Manage first-class RBAC permissions across students, instructors, and cluster administrators.
              </p>
            </div>
            <span className="text-xs font-mono text-white/40">{users.length} registered profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/50 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Modify Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                        {u.role === 'admin' ? '🛡️' : u.role === 'faculty' ? '🎓' : '🌱'}
                      </div>
                      <span>{u.displayName || u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 text-white/70 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : u.role === 'faculty'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {u.role || 'student'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {u.xp || 0} XP (Lvl {u.level || 1})
                    </td>
                    <td className="py-3.5 px-4 text-white/40 font-mono">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={u.role || 'student'}
                        disabled={updatingRoleUserId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-black/60 border border-white/20 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-400 font-semibold cursor-pointer"
                      >
                        <option value="student">student</option>
                        <option value="faculty">faculty</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
