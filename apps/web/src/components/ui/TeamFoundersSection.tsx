'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';

interface CohortPlaceholder {
  id: string;
  category: string;
  announcementStatus: string;
  domain: string;
  description: string;
  milestone: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COHORTS: CohortPlaceholder[] = [
  {
    id: 'co_founders',
    category: 'CO-FOUNDERS',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'Core Systems Architecture & AST Sandboxing',
    description:
      'The foundational engineering team designing the multi-tenant namespace isolation boundary, Acorn AST-based query validator, and deterministic evaluation pipeline.',
    milestone: 'Public release disclosure scheduled prior to general availability.',
    icon: Code2,
  },
  {
    id: 'database_lead',
    category: 'DATABASE & CURRICULUM LEAD',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'Official MongoDB Driver & Real-Time Telemetry',
    description:
      'Database systems specialists focused on MongoDB connection pooling, execution plan latency instrumentation, and interactive aggregation pipeline mechanics.',
    milestone: 'Faculty fellowship appointments to be announced.',
    icon: Database,
  },
  {
    id: 'advisory',
    category: 'ACADEMIC ADVISORY COUNCIL',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'University CS Curriculum Standards',
    description:
      'Academic fellows ensuring deterministic grading alignment with collegiate database curriculum standards and industry engineering best practices.',
    milestone: 'Partner institutions to be revealed in public wave.',
    icon: Shield,
  },
];

export function TeamFoundersSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () =>
    setCurrentIndex((i) => (i === 0 ? COHORTS.length - 1 : i - 1));
  const next = () =>
    setCurrentIndex((i) => (i === COHORTS.length - 1 ? 0 : i + 1));
  const current = COHORTS[currentIndex];
  const Icon = current.icon;

  return (
    <section className="relative py-24 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Engineering Cohort</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-text">
          Co-Founders & Contributors
        </h2>
        <p className="mt-4 text-xs sm:text-sm text-text-muted">
          Our core architecture and faculty advisory teams are currently in private development.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="bg-surface border border-border rounded-3xl p-8 shadow-floating relative"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                {current.category}
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-high border border-border text-[10px] font-mono text-text-muted mb-2">
                <Lock className="w-3 h-3 text-primary" />
                <span>UNVEILING IN PUBLIC BETA</span>
              </div>
              <h3 className="text-2xl font-black text-text">
                {current.announcementStatus}
              </h3>
              <p className="text-xs font-mono text-primary mt-1">
                {current.domain}
              </p>
              <p className="text-xs sm:text-sm text-text-muted mt-4 leading-relaxed">
                {current.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>{current.milestone}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full bg-surface hover:bg-surface-elevated border border-border flex items-center justify-center text-text transition-all active:scale-95"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-text-muted">
            0{currentIndex + 1} / 0{COHORTS.length}
          </span>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full bg-surface hover:bg-surface-elevated border border-border flex items-center justify-center text-text transition-all active:scale-95"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
