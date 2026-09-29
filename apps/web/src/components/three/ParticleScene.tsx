'use client';

import React, { useEffect, useRef } from 'react';
import { SceneManager } from '@/three/SceneManager';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function ParticleScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const manager = new SceneManager(containerRef.current);
    sceneManagerRef.current = manager;

    // Connect sections to 3D stage choreography via GSAP ScrollTrigger
    const sections = ['#hero', '#manifesto', '#product', '#team', '#investors', '#cta'];

    sections.forEach((secId, index) => {
      const el = document.querySelector(secId);
      if (!el) return;

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2,
        onUpdate: (self) => {
          manager.updateScrollState(index, self.progress);
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      manager.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full overflow-hidden"
      style={{ background: 'transparent' }}
    />
  );
}
