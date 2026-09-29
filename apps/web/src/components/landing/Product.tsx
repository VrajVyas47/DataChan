'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Terminal, CheckCircle2, Play, ArrowRight } from 'lucide-react';

export function Product() {
  const [activeTab, setActiveTab] = useState<'aggregate' | 'find'>('aggregate');

  const snippets = {
    aggregate: {
      code: `db.students.aggregate([
  { $match: { "department": "CS", "gpa": { "$gte": 3.5 } } },
  { $group: { 
      "_id": "$year", 
      "honorRoll": { "$sum": 1 }, 
      "avgGpa": { "$avg": "$gpa" } 
    } 
  },
  { $sort: { "avgGpa": -1 } }
])`,
      output: `[
  { "_id": "Senior", "honorRoll": 14, "avgGpa": 3.88 },
  { "_id": "Junior", "honorRoll": 21, "avgGpa": 3.74 },
  { "_id": "Sophomore", "honorRoll": 18, "avgGpa": 3.65 }
]`,
      latency: '1.4ms · COLLSCAN',
    },
    find: {
      code: `db.students.find(
  { 
    "department": "CS", 
    "age": { "$gt": 20 },
    "skills": { "$in": ["MongoDB", "TypeScript"] }
  },
  { "name": 1, "department": 1, "gpa": 1, "_id": 0 }
).sort({ "gpa": -1 }).limit(3)`,
      output: `[
  { "name": "Jay Patel", "department": "CS", "gpa": 3.92 },
  { "name": "Ananya Roy", "department": "CS", "gpa": 3.85 },
  { "name": "Rohit Verma", "department": "CS", "gpa": 3.71 }
]`,
      latency: '0.8ms · IXSCAN',
    },
  };

  return (
    <section
      id="product"
      className="min-h-screen w-full max-w-7xl mx-auto px-6 py-28 flex flex-col justify-center relative z-10 pointer-events-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pointer-events-auto">
        {/* Left Column: Narrative */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="text-[11px] font-offside tracking-widest uppercase text-white/40 mb-4">
            // ARCHITECTURE · 03
          </div>

          <h2 className="font-barlow font-black text-4xl sm:text-6xl text-white tracking-tight uppercase leading-[0.95]">
            Spark breakthrough <br />
            moments.
          </h2>

          <p className="mt-6 text-sm sm:text-base font-montserrat text-white/70 leading-relaxed">
            Data-Chan is your authoritative, real-time source of truth. We connect your visual data
            models directly to live MongoDB namespaces. Write queries in Monaco Editor, inspect
            detected schema types, and watch deterministic execution plans validate your understanding.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/playground"
              className="px-6 py-3 rounded-full bg-white text-black hover:bg-white/90 text-xs font-montserrat font-bold tracking-wide transition-all shadow-sm flex items-center gap-2"
            >
              <span>Explore MQL Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/learn"
              className="px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-montserrat font-semibold tracking-wide transition-all"
            >
              15-Lesson Curriculum
            </Link>
          </div>
        </div>

        {/* Right Column: High-End Technical Terminal */}
        <div className="lg:col-span-7">
          <div className="bg-[#0b0c10]/90 border border-white/[0.08] rounded-2xl p-5 shadow-2xl backdrop-blur-md">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs font-mono text-white/50">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                <span className="ml-2 text-[11px] text-white/40">
                  sandbox://datachan.local/CollegeDB/students
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg text-[11px] font-mono font-semibold">
                <button
                  onClick={() => setActiveTab('aggregate')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === 'aggregate'
                      ? 'bg-white text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  $aggregate
                </button>
                <button
                  onClick={() => setActiveTab('find')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === 'find'
                      ? 'bg-white text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  .find()
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 font-mono text-xs">
              {/* Input */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-2">
                    MQL Input · AST Parsed
                  </div>
                  <pre className="text-white/90 whitespace-pre overflow-x-auto text-[12px] leading-relaxed">
                    <code>{snippets[activeTab].code}</code>
                  </pre>
                </div>
                <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40">
                  <span>Ctrl + Enter</span>
                  <span className="text-emerald-400 font-semibold">Ready</span>
                </div>
              </div>

              {/* Output */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-2 flex items-center justify-between">
                    <span>Result</span>
                    <span className="text-emerald-400 font-normal">
                      {snippets[activeTab].latency}
                    </span>
                  </div>
                  <pre className="text-white/80 whitespace-pre overflow-x-auto text-[12px] leading-relaxed">
                    <code>{snippets[activeTab].output}</code>
                  </pre>
                </div>
                <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Deterministic Validation Passed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
