'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Terminal, Shield, Cpu, Sparkles } from 'lucide-react';

interface CohortCard {
  id: string;
  category: string;
  announcementStatus: string;
  domain: string;
  description: string;
  milestone: string;
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
}

const COHORTS: CohortCard[] = [
  {
    id: 'co-founders',
    category: 'CO-FOUNDERS',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'Core Systems Architecture & AST Sandboxing',
    description:
      'The foundational engineering team responsible for multi-tenant namespace isolation, Acorn AST query validation, and deterministic database test-harness evaluation.',
    milestone: 'Formal disclosure scheduled prior to public academic release.',
    icon: Cpu,
    tags: ['Distributed Systems', 'Namespace Sandboxing', 'AST Analysis'],
  },
  {
    id: 'contributors',
    category: 'CONTRIBUTORS',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'Curriculum Engineering & Query Telemetry',
    description:
      'Academic fellows and systems engineers developing interactive database challenges, query latency metrics, and real-time MongoDB execution plan visualizers.',
    milestone: 'Faculty fellowship and student contributor invitations opening soon.',
    icon: Terminal,
    tags: ['Curriculum Engineering', 'MongoDB Driver', 'Deterministic XP'],
  },
  {
    id: 'advisory',
    category: 'TEAM & ADVISORY',
    announcementStatus: 'SOON TO BE ANNOUNCED',
    domain: 'Academic Standards & Database Systems Review',
    description:
      'Computer Science educators and database engineers ensuring curriculum alignment with university database accreditation requirements and industry practices.',
    milestone: 'Participating university computer science departments to be unveiled.',
    icon: Shield,
    tags: ['CS Faculty Review', 'Benchmarking', 'Academic Labs'],
  },
];

export function Team() {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i === 0 ? COHORTS.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === COHORTS.length - 1 ? 0 : i + 1));
  const cohort = COHORTS[index];
  const Icon = cohort.icon;

  return (
    <section
      id="team"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 py-28 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pointer-events-auto">
        {/* Left Column: Editorial Announcement */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-offside tracking-widest uppercase text-white/40 mb-4">
              // TEAM & CONTRIBUTORS · 04
            </div>

            <h2 className="font-barlow font-black text-4xl sm:text-6xl text-white tracking-tight uppercase leading-[0.95]">
              Core Team
            </h2>
            <h3 className="font-barlow font-semibold text-xl sm:text-2xl text-cyan-400/80 uppercase mt-2">
              Soon To Be Announced
            </h3>

            <p className="mt-6 text-sm sm:text-base font-montserrat text-white/70 max-w-md leading-relaxed">
              We are assembling an exceptional cohort of computer science educators, systems architects,
              and database engineers. Individual contributors and founding partners will be officially
              revealed as the public laboratory waves commence.
            </p>

            <div className="mt-6 text-xs font-montserrat text-white/40 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Deliberate public reveal phase in progress</span>
            </div>
          </div>

          {/* Circular Navigation Buttons */}
          <div className="flex items-center gap-3 mt-12">
            <button
              onClick={prev}
              className="w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/10 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Previous Cohort"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/10 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Next Cohort"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-white/30 ml-2">
              0{index + 1} / 0{COHORTS.length}
            </span>
          </div>
        </div>

        {/* Right Column: Intentional Editorial Cohort Card */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-lg relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={cohort.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#0b0d14]/90 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm"
              >
                {/* Subtle Geometric Wireframe Grid Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

                <div className="relative z-10">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between pb-6 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="font-offside text-[11px] tracking-wider uppercase text-white/50">
                        {cohort.category}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-cyan-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Announcement Banner */}
                  <div className="mt-8">
                    <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] tracking-wider uppercase mb-3">
                      STATUS // CLASSIFIED COHORT
                    </div>

                    <h3 className="font-barlow font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
                      {cohort.announcementStatus}
                    </h3>

                    <div className="text-xs font-mono text-cyan-400 mt-2">
                      {cohort.domain}
                    </div>

                    <p className="mt-5 text-xs sm:text-sm font-montserrat text-white/70 leading-relaxed">
                      {cohort.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {cohort.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Milestone Notice */}
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-montserrat text-white/40">
                    <span>{cohort.milestone}</span>
                    <Sparkles className="w-4 h-4 text-cyan-400/60 shrink-0 ml-2" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
