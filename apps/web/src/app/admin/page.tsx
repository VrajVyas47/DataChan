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
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  LoadingState,
  PageHeader,
} from '@/components/ui';

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
    return <LoadingState text="Verifying Administrative Clearance..." fullHeight />;
  }

  // 403 Forbidden Access Screen if role !== 'admin'
  if (!authorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Card variant="elevated" className="max-w-md w-full border-error/30 p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center text-error mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-black text-xl text-text mb-2">
            Administrative Clearance Required
          </h1>
          <p className="text-xs text-text-muted leading-relaxed mb-6">
            You are currently signed in as{' '}
            <span className="font-bold text-text">{currentUser?.displayName || 'User'}</span> with role{' '}
            <Badge role={currentUser?.role || 'student'} size="xs" />. Access to system telemetry and cluster administration console requires the{' '}
            <strong className="text-amber-400">admin</strong> role.
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <Link href="/login" className="w-full">
              <Button fullWidth variant="primary" size="md">
                Switch to Admin Persona
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full">
              <Button fullWidth variant="outline" size="md">
                Return to Student Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Top Admin Header */}
      <PageHeader
        icon={<ShieldAlert className="w-6 h-6 text-amber-400" />}
        title="Admin Telemetry Console"
        description="Root-level cluster metrics, namespace storage maintenance, and platform RBAC management."
        badge={<Badge variant="warning" size="xs">Root Level</Badge>}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Telemetry
            </Button>
            <Badge variant="primary" size="md">
              Admin: {currentUser?.displayName || 'Admin User'}
            </Badge>
          </div>
        }
      />

      {/* Main Content */}
      <div className="w-full flex flex-col gap-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="surface" className="flex flex-col justify-between p-5">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Total Platform Users</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="font-black text-2xl sm:text-3xl text-text mt-3">
              {stats?.overview?.totalUsers ?? '—'}
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              Students: {stats?.roles?.students ?? 0} | Faculty: {stats?.roles?.faculty ?? 0} | Admins: {stats?.roles?.admins ?? 0}
            </div>
          </Card>

          <Card variant="surface" className="flex flex-col justify-between p-5">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>Virtual Sandboxes</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-black text-2xl sm:text-3xl text-text mt-3">
              {stats?.overview?.totalDatabases ?? '—'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
              <CheckCircle className="w-3 h-3" />
              <span>Isolated Namespaces Active</span>
            </div>
          </Card>

          <Card variant="surface" className="flex flex-col justify-between p-5">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>MQL Executions</span>
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-black text-2xl sm:text-3xl text-text mt-3">
              {stats?.overview?.totalQueries ?? '—'}
            </div>
            <div className="text-[11px] text-text-muted mt-1">Safe AST Sandboxed Queries</div>
          </Card>

          <Card variant="surface" className="flex flex-col justify-between p-5">
            <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider">
              <span>MongoDB Engine</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-black text-xl text-emerald-400 mt-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>{stats?.system?.status ?? 'CONNECTED'}</span>
            </div>
            <div className="text-[11px] text-text-muted mt-1 font-mono">
              DB: {stats?.system?.platformDatabase} ({stats?.system?.version})
            </div>
          </Card>
        </div>

        {/* Maintenance Action Card */}
        <Card variant="surface" className="border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-text uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Cluster Storage Maintenance & Orphan Purge</span>
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
              Scan the physical MongoDB instance for leftover sandboxed namespaces and drop orphaned collections to prevent wiredTiger storage leak.
            </p>
            {maintenanceMsg && (
              <div className="mt-2 text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
                {maintenanceMsg}
              </div>
            )}
          </div>
          <Button
            variant="warning"
            size="sm"
            onClick={handleCleanOrphans}
            leftIcon={<Trash2 className="w-4 h-4" />}
            className="shrink-0"
          >
            Purge Dangling Namespaces
          </Button>
        </Card>

        {/* User Management & Role Audit */}
        <Card variant="surface" className="overflow-hidden p-0 flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-text">
                Platform Identity & Role Directory
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Manage first-class RBAC permissions across students, instructors, and cluster administrators.
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              {users.length} registered profiles
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-low border-b border-border text-text-muted uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Modify Permission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-low/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-surface-high flex items-center justify-center text-xs">
                        {u.role === 'admin' ? '🛡️' : u.role === 'faculty' ? '🎓' : '🌱'}
                      </div>
                      <span>{u.displayName || u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge role={u.role || 'student'} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-muted">
                      {u.xp || 0} XP (Lvl {u.level || 1})
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={u.role || 'student'}
                        disabled={updatingRoleUserId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-surface-low border border-border text-text rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-primary font-semibold cursor-pointer"
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
        </Card>
      </div>
    </div>
  );
}
