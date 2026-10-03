'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Manifesto } from '@/components/landing/Manifesto';
import { Product } from '@/components/landing/Product';
import { Team } from '@/components/landing/Team';
import { Investors } from '@/components/landing/Investors';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';

// Dynamically load the WebGL Three.js ParticleScene client-only
const ParticleScene = dynamic(
  () => import('@/components/three/ParticleScene').then((m) => m.ParticleScene),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050608] text-white selection:bg-purple-900/60 selection:text-white overflow-x-hidden">
      {/* 1. Single Persistent WebGL Three.js Scene */}
      <ParticleScene />

      {/* 2. Layered Editorial HTML Content */}
      <Navbar />
      <main className="relative z-10 w-full flex flex-col">
        <Hero />
        <Manifesto />
        <Product />
        <Team />
        <Investors />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
