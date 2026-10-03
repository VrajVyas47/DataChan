'use client';

import React from 'react';
import { Database, ShieldCheck, Cpu, Code2, Server, Boxes } from 'lucide-react';

export function Investors() {
  const pillars = [
    {
      name: 'MongoDB Official Driver',
      meta: 'Core Database Engine',
      icon: Database,
      offset: 'lg:translate-y-4',
    },
    {
      name: 'Computer Science Faculty',
      meta: 'Curriculum Standards & Review',
      icon: Cpu,
      offset: 'lg:translate-y-16',
    },
    {
      name: 'Acorn AST Engine',
      meta: 'Pure Query Syntax Parser',
      icon: Code2,
      offset: 'lg:-translate-y-6',
    },
    {
      name: 'Firebase Admin SDK',
      meta: 'Authoritative Identity Verification',
      icon: ShieldCheck,
      offset: 'lg:translate-y-8',
    },
    {
      name: 'React Flow Canvas',
      meta: 'Graph Data Modeling Engine',
      icon: Boxes,
      offset: 'lg:translate-y-2',
    },
    {
      name: 'Docker Sandboxes',
      meta: 'Isolated Multi-Tenant Containers',
      icon: Server,
      offset: 'lg:translate-y-20',
    },
  ];

  return (
    <section
      id="investors"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 py-28 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pointer-events-auto">
        {/* Left Column: Asymmetrically distributed pillars */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className={`flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-transform hover:-translate-y-1 ${p.offset}`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/80 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-barlow font-bold text-lg text-white tracking-tight">
                    {p.name}
                  </div>
                  <div className="text-[11px] font-montserrat text-white/40 mt-0.5">
                    {p.meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Narrative */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="text-[11px] font-offside tracking-widest uppercase text-white/40 mb-4">
            // FOUNDATIONS · 05
          </div>

          <h2 className="font-barlow font-black text-4xl sm:text-6xl text-white tracking-tight uppercase leading-[0.95]">
            Built on <br />
            rigorous standards.
          </h2>

          <p className="mt-6 text-sm sm:text-base font-montserrat text-white/70 leading-relaxed">
            Data-Chan is supported and engineered according to mandatory university curriculum
            specifications. By pairing the official MongoDB engine with rigorous AST parsing, we
            deliver developer-grade tools within an academic safety framework.
          </p>

          <div className="mt-8 text-xs font-mono text-emerald-400 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Faculty Approved Curriculum Architecture</span>
          </div>
        </div>
      </div>
    </section>
  );
}
