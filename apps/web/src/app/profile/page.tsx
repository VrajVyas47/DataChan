'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { UserProfile } from '@datachan/shared-types';
import {
  User,
  Flame,
  Award,
  BookOpen,
  Trophy,
  Terminal,
  Database,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  LoadingState,
  PageHeader,
} from '@/components/ui';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getMe();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return <LoadingState text="Loading laboratory profile..." fullHeight />;
  }

  return (
    <div className="flex flex-col gap-6 w-full flex-1">
      {/* Profile Hero Header */}
      <Card variant="surface" className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm shrink-0">
            <User className="w-10 h-10" />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl font-black text-text tracking-tight">
                {profile?.displayName || profile?.username || 'Explorer'}
              </h1>
              <Badge variant="primary" size="sm">
                LVL {profile?.level || 1}
              </Badge>
              <Badge role={(profile?.role as any) || 'student'} size="xs" />
            </div>
            <p className="text-xs text-text-muted mt-1 font-mono">
              {profile?.email} &bull; Joined {new Date(profile?.createdAt || Date.now()).toLocaleDateString()}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-low border border-border text-xs font-mono">
                <Flame className="w-4 h-4 text-secondary" />
                <span className="font-bold text-text">{profile?.streakDays || 1} Days</span>
                <span className="text-text-muted">Streak</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-low border border-border text-xs font-mono">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bold text-text">{profile?.xp || 0} XP</span>
                <span className="text-text-muted">Total Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Badge Pill */}
        <div className="bg-surface-low rounded-2xl p-4 border border-border flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-text block">Next Level Goal</span>
            <span className="text-text-muted">
              {100 - ((profile?.xp || 0) % 100)} XP to Level {(profile?.level || 1) + 1}
            </span>
          </div>
        </div>
      </Card>

      {/* Grid: Metrics, Skills, Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Key Numbers & Skills (Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Card variant="surface" className="p-4 text-center flex flex-col items-center gap-1">
              <BookOpen className="w-5 h-5 text-primary mb-1" />
              <span className="text-xl font-black font-mono text-text">
                {profile?.lessonsCompletedCount || 0}
              </span>
              <span className="text-[11px] text-text-muted font-medium">Lessons Done</span>
            </Card>

            <Card variant="surface" className="p-4 text-center flex flex-col items-center gap-1">
              <Trophy className="w-5 h-5 text-secondary mb-1" />
              <span className="text-xl font-black font-mono text-text">
                {profile?.challengesSolvedCount || 0}
              </span>
              <span className="text-[11px] text-text-muted font-medium">Challenges</span>
            </Card>

            <Card variant="surface" className="p-4 text-center flex flex-col items-center gap-1">
              <Terminal className="w-5 h-5 text-tertiary mb-1" />
              <span className="text-xl font-black font-mono text-text">
                {profile?.queriesExecutedCount || 0}
              </span>
              <span className="text-[11px] text-text-muted font-medium">Queries Ran</span>
            </Card>

            <Card variant="surface" className="p-4 text-center flex flex-col items-center gap-1">
              <Database className="w-5 h-5 text-primary mb-1" />
              <span className="text-xl font-black font-mono text-text">
                {profile?.activeDatabasesCount || 0}
              </span>
              <span className="text-[11px] text-text-muted font-medium">Databases</span>
            </Card>
          </div>

          {/* Skill Performance */}
          <Card variant="surface" className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-text uppercase tracking-wider">
                MongoDB Competencies
              </span>
              <span className="text-[11px] font-mono text-text-muted">Dynamic Proficiency</span>
            </div>

            <div className="flex flex-col gap-4">
              {profile?.skills.map((skill) => (
                <div key={skill.skillId} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-text font-bold">{skill.name}</span>
                    <span className="text-text-muted font-mono">
                      Level {skill.level} &bull; {skill.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-low h-2 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${skill.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Achievements (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card variant="surface" className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-bold text-text uppercase tracking-wider">
                Achievements &bull; Badges
              </span>
              <Badge variant="secondary" size="xs">
                {profile?.achievements.filter((a) => !!a.unlockedAt).length} Unlocked
              </Badge>
            </div>

            <div className="flex flex-col gap-3">
              {profile?.achievements.map((badge) => {
                const isUnlocked = !!badge.unlockedAt;
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                      isUnlocked
                        ? 'bg-surface-low border-border text-text shadow-sm'
                        : 'bg-surface-high/30 border-dashed border-border text-text-muted opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnlocked
                          ? 'bg-secondary/15 text-secondary border border-secondary/30'
                          : 'bg-surface-low text-text-muted border border-border'
                      }`}
                    >
                      {isUnlocked ? <Trophy className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <h4 className="text-xs font-bold leading-tight truncate">{badge.title}</h4>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                        {badge.description}
                      </p>
                      {isUnlocked && badge.unlockedAt && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold mt-1 block">
                          Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
