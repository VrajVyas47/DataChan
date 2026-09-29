'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function FinalCTA() {
  return (
    <section
      id="cta"
      className="min-h-screen w-full max-w-5xl mx-auto px-6 py-32 flex flex-col justify-center items-center text-center relative z-10 pointer-events-none"
    >
      <div className="pointer-events-auto flex flex-col items-center">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-offside tracking-widest uppercase text-white/50">
            THE LAB IS LIVE
          </span>
        </div>

        {/* Large Centered Headline in Solid Barlow */}
        <h2 className="font-barlow font-black text-4xl sm:text-6xl md:text-7xl text-white tracking-tight uppercase leading-[0.98] max-w-3xl">
          Your laboratory has the answer. <br />
          Enter Data-Chan to query it.
        </h2>

        {/* Supporting description */}
        <p className="mt-6 text-sm sm:text-base font-montserrat text-white/60 max-w-lg leading-relaxed">
          Begin building isolated workspaces, writing MQL queries, and earning verified challenge XP today.
        </p>

        {/* Primary CTA Button */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-widest uppercase transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <span>REQUEST ACCESS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="px-6 py-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-montserrat font-semibold tracking-wide transition-all"
          >
            Developer Testing Personas
          </Link>
        </div>

        {/* Trust & Spec Guarantee */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-[11px] font-montserrat text-white/40">
          <span>Physical Namespace Isolation</span>
          <span>·</span>
          <span>Acorn AST Pure Parser</span>
          <span>·</span>
          <span>15 MongoDB Curriculum Lessons</span>
        </div>
      </div>
    </section>
  );
}
