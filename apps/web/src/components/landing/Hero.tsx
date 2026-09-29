'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Terminal } from 'lucide-react';

export function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Editorial Content (Takes 6 cols, letting 3D database physical architecture shine on the right) */}
        <div className="lg:col-span-7 flex flex-col justify-center pointer-events-auto">
          {/* Eyebrow Label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-offside tracking-widest uppercase text-white/50">
              VIRTUAL DATABASE LAB · 01
            </span>
          </div>

          {/* Main Headline in Solid Barlow */}
          <h1 className="font-barlow font-black text-5xl sm:text-7xl md:text-8xl tracking-tight text-white leading-[0.92] uppercase">
            Unlock <br />
            collective <br />
            intelligence.
          </h1>

          {/* Subtitle in Uppercase Montserrat */}
          <div className="mt-6 text-[12px] font-montserrat font-bold tracking-widest uppercase text-white/40">
            STOP MANAGING FRAGMENTED QUERIES. START MASTERING DATA.
          </div>

          {/* Description Paragraph */}
          <p className="mt-4 text-sm sm:text-base font-montserrat font-normal text-white/70 max-w-xl leading-relaxed">
            Plug into your personal virtual database laboratory. Ask Data-Chan to instantly initialize
            isolated MongoDB sandboxes, execute queries via AST-safe verification, and validate data
            models with deterministic evaluation.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 rounded-full bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-wide transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>REQUEST ACCESS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/playground"
              className="px-6 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-montserrat font-semibold tracking-wide transition-all flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5 text-white/60" />
              <span>Launch Playground</span>
            </Link>

            <Link
              href="/login"
              className="px-6 py-3.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/80 text-xs font-montserrat font-semibold tracking-wide transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
              <span>1-Click Google Login</span>
            </Link>
          </div>

          {/* Small technical credibility indicator */}
          <div className="mt-12 pt-6 border-t border-white/[0.06] flex items-center gap-6 text-[11px] font-montserrat text-white/40">
            <span>Official MongoDB Node.js Driver</span>
            <span>·</span>
            <span>Zero Arbitrary Code Execution</span>
            <span>·</span>
            <span>Port 27017 Local Native</span>
          </div>
        </div>

        {/* Right side is intentionally open for the 3D WebGL database core */}
        <div className="lg:col-span-5 h-[360px] lg:h-[600px] pointer-events-none" />
      </div>
    </section>
  );
}
