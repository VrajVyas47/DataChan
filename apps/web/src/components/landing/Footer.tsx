'use client';

import React from 'react';
import Link from 'next/link';
import { Database, Linkedin, Twitter, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-[12px] font-montserrat text-white/40">
      {/* Brand & Copyright */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white">
          <Database className="w-3.5 h-3.5" />
        </div>
        <span>© 2026 DATA-CHAN Technologies. All rights reserved.</span>
      </div>

      {/* Nav Links */}
      <div className="flex items-center gap-6">
        <a href="#manifesto" className="hover:text-white transition-colors">
          Manifesto
        </a>
        <a href="#team" className="hover:text-white transition-colors">
          Team
        </a>
        <Link href="/learn" className="hover:text-white transition-colors">
          Curriculum
        </Link>
        <Link href="/playground" className="hover:text-white transition-colors">
          Playground
        </Link>
        <Link href="/settings" className="hover:text-white transition-colors">
          Settings
        </Link>
      </div>

      {/* Social Links */}
      <div className="flex items-center gap-3">
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md hover:text-white transition-colors"
          title="GitHub"
        >
          <Github className="w-4 h-4" />
        </a>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md hover:text-white transition-colors"
          title="LinkedIn"
        >
          <Linkedin className="w-4 h-4" />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md hover:text-white transition-colors"
          title="Twitter"
        >
          <Twitter className="w-4 h-4" />
        </a>
      </div>
    </footer>
  );
}
