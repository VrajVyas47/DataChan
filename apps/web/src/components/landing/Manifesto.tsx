'use client';

import React from 'react';

export function Manifesto() {
  return (
    <section
      id="manifesto"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 py-28 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      {/* 1. Asymmetric Top Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-24 pointer-events-auto">
        <div className="lg:col-span-5 h-[200px] lg:h-[400px] pointer-events-none" />

        <div className="lg:col-span-7">
          <div className="text-[11px] font-offside tracking-widest uppercase text-white/40 mb-4">
            // PHILOSOPHY · 02
          </div>
          <h2 className="font-barlow font-black text-4xl sm:text-6xl text-white tracking-tight uppercase leading-[0.95]">
            Make decisions <br />
            with certainty.
          </h2>
          <p className="mt-6 text-sm sm:text-base font-montserrat text-white/70 max-w-xl leading-relaxed">
            Data-Chan eliminates the guesswork from database learning. We bridge theoretical data
            modeling with physical MongoDB execution, giving you deterministic feedback, instant schema
            detection, and zero arbitrary runtime risk.
          </p>
        </div>
      </div>

      {/* 2. Three Centered Large Editorial Statements (Exact rhythm from the reference video) */}
      <div className="max-w-4xl mx-auto flex flex-col gap-24 text-center my-12 pointer-events-auto">
        <div className="space-y-4">
          <p className="font-barlow font-bold text-2xl sm:text-4xl text-white/90 tracking-tight leading-snug">
            This is your database learning today: Countless fragments of critical knowledge scattered
            across outdated slides, broken connection strings, and disjointed websites.
          </p>
        </div>

        <div className="space-y-4">
          <p className="font-barlow font-bold text-2xl sm:text-4xl text-white tracking-tight leading-snug">
            Over 30% of student time is spent diagnosing local driver versions and environment errors
            instead of understanding how data actually moves.
          </p>
        </div>

        <div className="space-y-4">
          <p className="font-barlow font-medium text-xl sm:text-3xl text-white/70 tracking-tight leading-relaxed max-w-3xl mx-auto">
            Existing tools are cumbersome and disconnected. Data-Chan creates an isolated,
            curriculum-aligned virtual laboratory that turns abstract database theory into living, queryable reality.
          </p>
        </div>
      </div>
    </section>
  );
}
