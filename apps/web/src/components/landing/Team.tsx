'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Github, Linkedin, Twitter } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
  badge: string;
  bio: string;
  image: string;
  github: string;
  linkedin: string;
  twitter: string;
  focus: string;
}

const MEMBERS: Member[] = [
  {
    id: 'vraj',
    name: 'Vraj Patel',
    role: 'Lead Software Architect',
    badge: 'CO-FOUNDER & ARCHITECT',
    bio: 'Architected the multi-tenant namespace isolation boundary, Acorn AST-based query validator, and deterministic evaluation pipeline powering the virtual lab.',
    image: '/founders/founder1.jpg',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
    focus: 'AST Sandboxing · Multi-Tenant Namespaces',
  },
  {
    id: 'joel',
    name: 'Joel Kang',
    role: 'Database Systems Lead',
    badge: 'CO-FOUNDER & DATABASE LEAD',
    bio: 'Specializing in official MongoDB Node.js driver connection pooling, execution plan latency instrumentation, and interactive aggregation pipeline mechanics.',
    image: '/founders/founder2.jpg',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    twitter: 'https://twitter.com',
    focus: 'MongoDB Pooling · Execution Telemetry',
  },
];

export function Team() {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i === 0 ? MEMBERS.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === MEMBERS.length - 1 ? 0 : i + 1));
  const member = MEMBERS[index];

  return (
    <section
      id="team"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 py-28 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pointer-events-auto">
        {/* Left Column: Editorial Copy & Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-offside tracking-widest uppercase text-white/40 mb-4">
              // TEAM · 04
            </div>

            <h2 className="font-barlow font-black text-4xl sm:text-6xl text-white tracking-tight uppercase leading-[0.95]">
              Our team
            </h2>
            <h3 className="font-barlow font-semibold text-xl sm:text-2xl text-white/50 uppercase mt-2">
              Build with us.
            </h3>

            <p className="mt-6 text-sm sm:text-base font-montserrat text-white/70 max-w-md leading-relaxed">
              We are actively engineering intentional, empathetic and rigorous learning tools for
              developers who crave true understanding over superficial tutorials. If you want to
              shape the future of database education, connect with our engineering team.
            </p>

            <div className="mt-6 text-xs font-montserrat text-white/40">
              <span className="hover:text-white cursor-pointer transition-colors">
                Read more about our engineering standards here →
              </span>
            </div>
          </div>

          {/* Circular Navigation Buttons matching video */}
          <div className="flex items-center gap-3 mt-12">
            <button
              onClick={prev}
              className="w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/10 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Previous Team Member"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="w-12 h-12 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/10 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title="Next Team Member"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-mono text-white/40 ml-3">
              0{index + 1} / 0{MEMBERS.length}
            </span>
          </div>
        </div>

        {/* Right Column: Editorial Large Portrait Card */}
        <div className="lg:col-span-7 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full max-w-lg bg-[#0b0c10]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Photo */}
                <div className="sm:col-span-5">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden relative border border-white/[0.08]">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="sm:col-span-7 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/40 block mb-1">
                      {member.badge}
                    </span>
                    <h4 className="font-barlow font-black text-2xl sm:text-3xl text-white tracking-tight uppercase">
                      {member.name}
                    </h4>
                    <p className="text-xs font-montserrat text-white/60 mt-0.5">
                      {member.role}
                    </p>

                    <p className="text-xs font-montserrat text-white/70 mt-4 leading-relaxed">
                      &ldquo;{member.bio}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold truncate max-w-[180px]">
                      {member.focus}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                      <a
                        href={member.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
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
