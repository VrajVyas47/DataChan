'use client';

import React from 'react';
import Link from 'next/link';
import { Database, ArrowRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full px-6 py-5 flex items-center justify-between pointer-events-auto backdrop-blur-sm bg-[#050608]/40 border-b border-white/[0.04]">
      {/* Brand / Wordmark */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:bg-white group-hover:text-black transition-all">
          <Database className="w-4 h-4" />
        </div>
        <span className="font-barlow font-bold text-lg tracking-tight text-white">
          DATA-CHAN
        </span>
      </Link>

      {/* Center Minimal Navigation */}
      <nav className="hidden md:flex items-center gap-8 text-[13px] font-montserrat font-medium text-white/60 tracking-wide">
        <a href="#manifesto" className="hover:text-white transition-colors">
          Manifesto
        </a>
        <a href="#product" className="hover:text-white transition-colors">
          Architecture
        </a>
        <a href="#team" className="hover:text-white transition-colors">
          Team
        </a>
        <Link href="/forum" className="hover:text-white transition-colors flex items-center gap-1.5 text-white/90">
          <span>Forum</span>
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/80">New</span>
        </Link>
        <Link href="/playground" className="hover:text-white transition-colors">
          Playground
        </Link>
      </nav>

      {/* Right CTAs */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[12px] font-montserrat font-semibold text-white/70 hover:text-white px-3 py-1.5 transition-colors hidden sm:block"
        >
          Sign In
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 text-[12px] font-montserrat font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>Request Access</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
