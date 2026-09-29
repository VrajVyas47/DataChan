'use client';

import React, { useEffect, useRef } from 'react';

export function DatabaseCylinder3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 540);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 540);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle Cloud definition for 3D Database Cylinder
    interface Particle {
      x: number;
      y: number;
      z: number;
      baseX: number;
      baseY: number;
      baseZ: number;
      size: number;
      color: string;
      layer: number;
    }

    const particles: Particle[] = [];
    const layers = 4; // 4 stacked database cylinder discs
    const radius = 140;
    const layerHeight = 55;
    const particlesPerRing = 50;

    const colors = [
      '#8B5CF6', // Purple / Violet
      '#6366F1', // Indigo
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
    ];

    // Generate points for the 4 cylinder platters
    for (let l = 0; l < layers; l++) {
      const yOffset = (l - (layers - 1) / 2) * layerHeight;
      // Outer ring of platter
      for (let i = 0; i < particlesPerRing; i++) {
        const angle = (i / particlesPerRing) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        particles.push({
          x,
          y: yOffset,
          z,
          baseX: x,
          baseY: yOffset,
          baseZ: z,
          size: Math.random() * 2.5 + 1.5,
          color: colors[l % colors.length],
          layer: l,
        });
      }

      // Interior platter surface dots
      for (let r = 25; r < radius; r += 35) {
        const count = Math.floor((r / radius) * 30);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          particles.push({
            x,
            y: yOffset,
            z,
            baseX: x,
            baseY: yOffset,
            baseZ: z,
            size: Math.random() * 2 + 1,
            color: colors[(l + 1) % colors.length],
            layer: l,
          });
        }
      }

      // Vertical connecting pillars between discs
      if (l < layers - 1) {
        const nextY = (l + 1 - (layers - 1) / 2) * layerHeight;
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2;
          const px = Math.cos(angle) * (radius * 0.95);
          const pz = Math.sin(angle) * (radius * 0.95);
          for (let step = 1; step < 4; step++) {
            const py = yOffset + (nextY - yOffset) * (step / 4);
            particles.push({
              x: px,
              y: py,
              z: pz,
              baseX: px,
              baseY: py,
              baseZ: pz,
              size: 2,
              color: '#A78BFA',
              layer: l,
            });
          }
        }
      }
    }

    // Floating wireframe geometric triangles (ambient floating like the video)
    interface FloatingShape {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      rotX: number;
      rotY: number;
      size: number;
      color: string;
    }

    const floatingTriangles: FloatingShape[] = [];
    for (let i = 0; i < 18; i++) {
      floatingTriangles.push({
        x: (Math.random() - 0.5) * 440,
        y: (Math.random() - 0.5) * 440,
        z: (Math.random() - 0.5) * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        size: Math.random() * 14 + 10,
        color: colors[i % colors.length],
      });
    }

    let angleY = 0;
    let angleX = 0.28; // slight downward 3D perspective
    let targetAngleY = 0;
    let targetAngleX = 0.28;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - width / 2;
      const mouseY = e.clientY - rect.top - height / 2;
      targetAngleY = (mouseX / width) * 0.8;
      targetAngleX = 0.28 + (mouseY / height) * 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Main render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth camera interpolation
      angleY += 0.008; // constant smooth rotation
      const currRotY = angleY + targetAngleY;
      const currRotX = targetAngleX;

      const cosY = Math.cos(currRotY);
      const sinY = Math.sin(currRotY);
      const cosX = Math.cos(currRotX);
      const sinX = Math.sin(currRotX);

      const cx = width / 2;
      const cy = height / 2;
      const fov = 400;

      // Draw subtle luminous background glow behind cylinder
      const radialGradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, 240);
      radialGradient.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
      radialGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
      radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGradient;
      ctx.fillRect(0, 0, width, height);

      // Render floating triangles
      floatingTriangles.forEach((tri) => {
        tri.x += tri.vx;
        tri.y += tri.vy;
        tri.rotX += 0.01;
        tri.rotY += 0.015;

        // Wrap around bounds
        if (tri.x > 240) tri.x = -240;
        if (tri.x < -240) tri.x = 240;
        if (tri.y > 240) tri.y = -240;
        if (tri.y < -240) tri.y = 240;

        // Project
        const scale = fov / (fov + tri.z + 200);
        const px = cx + tri.x * scale;
        const py = cy + tri.y * scale;

        if (scale > 0) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(tri.rotX);
          ctx.strokeStyle = tri.color;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = Math.min(0.85, Math.max(0.15, scale * 0.8));

          // Draw small triangle wireframe
          ctx.beginPath();
          const s = tri.size * scale;
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.86, s * 0.5);
          ctx.lineTo(-s * 0.86, s * 0.5);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      });

      // Project and sort particles by depth (z)
      const projected = particles.map((p) => {
        // Rotate around Y
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseZ * cosY + p.baseX * sinY;

        // Rotate around X
        const y2 = p.baseY * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.baseY * sinX;

        const scale = fov / (fov + z2);
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          scale,
          z: z2,
          size: p.size * scale,
          color: p.color,
          layer: p.layer,
        };
      });

      // Sort back-to-front
      projected.sort((a, b) => b.z - a.z);

      // Draw connecting disc ellipses
      for (let l = 0; l < layers; l++) {
        const yOffset = (l - (layers - 1) / 2) * layerHeight;
        const y2 = yOffset * cosX;
        const z2 = yOffset * sinX;
        const scale = fov / (fov + z2);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy + y2 * scale, radius * scale, radius * 0.38 * scale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 + (1 - l / layers) * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Platter glow ring
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.08 + (l / layers) * 0.1})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Draw all glowing points
      projected.forEach((p) => {
        if (p.scale <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.globalAlpha = Math.min(1, Math.max(0.2, (p.z + 180) / 360));
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] md:h-[600px] flex items-center justify-center select-none overflow-hidden">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive Database Pills orbiting cylinder */}
      <div className="absolute top-12 left-6 sm:left-12 px-3 py-1.5 rounded-full bg-surface-elevated/80 backdrop-blur-md border border-primary/30 text-[11px] font-mono font-bold text-primary shadow-lg animate-bounce pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
        COLLSCAN · 1.4ms
      </div>

      <div className="absolute top-28 right-4 sm:right-10 px-3 py-1.5 rounded-full bg-surface-elevated/80 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-400 shadow-lg pointer-events-none">
        &#123; &quot;$match&quot;: &quot;enrolled&quot; &#125;
      </div>

      <div className="absolute bottom-20 left-8 sm:left-16 px-3 py-1.5 rounded-full bg-surface-elevated/80 backdrop-blur-md border border-secondary/30 text-[11px] font-mono font-bold text-secondary shadow-lg pointer-events-none">
        db.students.aggregate(...)
      </div>

      <div className="absolute bottom-12 right-8 sm:right-16 px-3 py-1.5 rounded-full bg-surface-elevated/80 backdrop-blur-md border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-400 shadow-lg pointer-events-none">
        BSON Platter 0 · ObjectId(&quot;...&quot;)
      </div>
    </div>
  );
}
