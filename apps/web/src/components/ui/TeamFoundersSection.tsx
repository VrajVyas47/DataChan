'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Linkedin,
  Github,
  Twitter,
  ExternalLink,
  Code2,
  Database,
  Shield,
  Sparkles,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  titleBadge: string;
  bio: string;
  image: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  specialty: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'founder_1',
    name: 'Vraj Patel',
    role: 'Co-Founder & Lead Systems Architect',
    titleBadge: 'CO-FOUNDER & ARCHITECT',
    bio: 'Lead software architect behind DATA-CHAN. Designed the multi-tenant namespace isolation engine, Acorn AST-based query sandbox, and deterministic evaluation pipeline.',
    image: '/founders/founder1.jpg',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
    specialty: 'Distributed Systems · AST Parsers · Multi-Tenant Isolation',
  },
  {
    id: 'founder_2',
    name: 'Joel Kang',
    role: 'Co-Founder & Database Systems Lead',
    titleBadge: 'CO-FOUNDER & DATABASE LEAD',
    bio: 'Database engineer focused on official MongoDB driver optimization, aggregation pipeline analytics, and real-time execution statistics for educational developer tooling.',
    image: '/founders/founder2.jpg',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
    specialty: 'MongoDB Performance · Index Optimization · Query Engine',
  },
];

export function TeamFoundersSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevMember = () => {
    setCurrentIndex((prev) => (prev === 0 ? TEAM_MEMBERS.length - 1 : prev - 1));
  };

  const nextMember = () => {
    setCurrentIndex((prev) => (prev === TEAM_MEMBERS.length - 1 ? 0 : prev + 1));
  };

  const current = TEAM_MEMBERS[currentIndex];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-20 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Narrative & Navigation */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold uppercase tracking-wider mb-4 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE BUILDERS</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-text">
              Our team
            </h2>
            <h3 className="text-xl sm:text-2xl font-bold text-text-muted mt-2">
              Build with us.
            </h3>

            <p className="text-sm sm:text-base text-text-muted mt-6 leading-relaxed">
              We are actively engineering intentional, accessible, and high-performance database
              learning environments. If you would like to test our laboratory, suggest new MongoDB
              challenges, or review our academic curriculum, reach out to the core engineering team.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary">
              <span className="hover:underline cursor-pointer">
                Read more about our curriculum values here →
              </span>
            </div>
          </div>

          {/* Navigation Controls: Circular Purple Buttons like in the video */}
          <div className="flex items-center gap-3 mt-10">
            <button
              onClick={prevMember}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title="Previous Team Member"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMember}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title="Next Team Member"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-text-muted ml-3">
              {currentIndex + 1} / {TEAM_MEMBERS.length}
            </span>
          </div>
        </div>

        {/* Right Column: Founder Card with Photo and Bio */}
        <div className="lg:col-span-7 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full max-w-xl bg-surface border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Photo with rounded bezel */}
                <div className="sm:col-span-5 relative">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden relative border border-border shadow-md">
                    <Image
                      src={current.image}
                      alt={current.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="sm:col-span-7 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-black text-primary tracking-widest uppercase block mb-1">
                      {current.titleBadge}
                    </span>
                    <h4 className="text-2xl font-black text-text tracking-tight">
                      {current.name}
                    </h4>
                    <p className="text-xs font-semibold text-text-muted mt-0.5">
                      {current.role}
                    </p>

                    <p className="text-xs text-text-muted mt-4 leading-relaxed font-sans">
                      &ldquo;{current.bio}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[220px]">
                      {current.specialty}
                    </span>

                    {/* Socials */}
                    <div className="flex items-center gap-2">
                      <a
                        href={current.github}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-surface-high hover:bg-surface text-text hover:text-primary transition-colors"
                        title="GitHub Profile"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                      <a
                        href={current.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-surface-high hover:bg-surface text-text hover:text-primary transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                      <a
                        href={current.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-surface-high hover:bg-surface text-text hover:text-primary transition-colors"
                        title="Twitter / X Profile"
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
