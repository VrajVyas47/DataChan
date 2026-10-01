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

    // Strictly ensure initial hero state (stage 0, progress 0)
    manager.updateScrollState(0, 0);

    // 1. Hero Section ScrollTrigger: begins when user scrolls down from top of hero
    const heroEl = document.querySelector('#hero');
    if (heroEl) {
      ScrollTrigger.create({
        trigger: heroEl,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.0,
        onUpdate: (self) => {
          manager.updateScrollState(0, self.progress);
        },
      });
    }

    // 2. Subsequent Sections: only update when actively in view
    const laterSections = [
      { id: '#manifesto', stage: 1 },
      { id: '#product', stage: 2 },
      { id: '#team', stage: 3 },
      { id: '#investors', stage: 4 },
      { id: '#cta', stage: 5 },
    ];

    laterSections.forEach(({ id, stage }) => {
      const el = document.querySelector(id);
      if (!el) return;

      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 1.0,
        onUpdate: (self) => {
          if (self.isActive) {
            manager.updateScrollState(stage, self.progress);
          }
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
