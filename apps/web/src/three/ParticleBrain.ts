import * as THREE from 'three';

export interface BrainParticleData {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
  originalPositions: Float32Array;
  manifestoPositions: Float32Array;
  productPositions: Float32Array;
  convergedPositions: Float32Array;
}

export function createParticleBrain(particleCount = 5200): BrainParticleData {
  const positions = new Float32Array(particleCount * 3);
  const originalPositions = new Float32Array(particleCount * 3);
  const manifestoPositions = new Float32Array(particleCount * 3);
  const productPositions = new Float32Array(particleCount * 3);
  const convergedPositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const pulsePhases = new Float32Array(particleCount);

  // Curated editorial palette: white, lavender, violet, cyan, muted gold
  const palette = [
    new THREE.Color('#ffffff'), // Pure White (40%)
    new THREE.Color('#f1f5f9'), // Off-White (20%)
    new THREE.Color('#c4b5fd'), // Soft Lavender (18%)
    new THREE.Color('#8b5cf6'), // Electric Violet (12%)
    new THREE.Color('#06b6d4'), // Cyan (6%)
    new THREE.Color('#f59e0b'), // Warm Gold Accent (4%)
  ];

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // --- 1. ORGANIC BRAIN ANATOMY FORMULATION ---
    // Symmetrical hemispheres (left & right) separated by a deep longitudinal fissure
    const isLeft = i % 2 === 0;
    const hemisphereSign = isLeft ? -1 : 1;

    // Spherical parameterization with uniform surface distribution
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);

    // Anatomical ellipsoid dimensions (width, height, length)
    const rx = 0.95;
    const ry = 0.82;
    const rz = 1.32;

    let bx = rx * Math.sin(phi) * Math.cos(theta);
    let by = ry * Math.sin(phi) * Math.sin(theta);
    let bz = rz * Math.cos(phi);

    // Hemispheric lateral separation
    bx = bx * 0.76 + hemisphereSign * 0.44;

    // Longitudinal medial fissure (indent inward where hemispheres meet at x=0)
    const distToMidline = Math.abs(bx);
    if (distToMidline < 0.32) {
      bx *= 0.58;
    }

    // Anatomical curvature:
    // Frontal lobe lift, temporal lobe lateral swell, occipital posterior taper
    by += 0.16 * Math.sin(bz * 1.4);
    if (by < -0.15 && Math.abs(bz) < 0.55) {
      bx *= 1.22; // Temporal lobe swell
    }

    // Cortical convolutions (Gyri & Sulci folds)
    const freq1 = 7.5;
    const freq2 = 14.0;
    const fold1 = Math.sin(bx * freq1) * Math.cos(by * freq1) * Math.sin(bz * freq1);
    const fold2 = Math.cos(bx * freq2 * 0.7 + bz * 1.8) * 0.35;
    const foldNoise = (fold1 + fold2) * 0.092;

    // Cerebellar bulge at posterior-inferior
    const isCerebellum = bz < -0.55 && by < -0.22;
    const cerebellumFactor = isCerebellum ? 0.88 : 1.0;

    // Radius thickness: 85% surface shell, 15% inner neural core pathways
    const isCore = Math.random() < 0.16;
    const thickness = isCore ? 0.35 + Math.random() * 0.45 : 0.86 + Math.random() * 0.18 + foldNoise;
    const rScale = thickness * cerebellumFactor;

    const x = bx * rScale;
    const y = by * rScale;
    const z = bz * rScale;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    originalPositions[i3] = x;
    originalPositions[i3 + 1] = y;
    originalPositions[i3 + 2] = z;

    // --- 2. MANIFESTO MORPH: EXPANDED CONSTELLATION ---
    const spreadR = 2.6 + Math.random() * 3.2;
    const spreadTheta = Math.random() * Math.PI * 2;
    const spreadPhi = Math.acos(2 * Math.random() - 1);
    manifestoPositions[i3] = spreadR * Math.sin(spreadPhi) * Math.cos(spreadTheta) - 0.7;
    manifestoPositions[i3 + 1] = spreadR * Math.sin(spreadPhi) * Math.sin(spreadTheta) * 0.75;
    manifestoPositions[i3 + 2] = spreadR * Math.cos(spreadPhi) * 0.85 - 0.4;

    // --- 3. PRODUCT MORPH: NEURAL BULB / INTELLIGENCE CORE ---
    const bulbAngle = Math.random() * Math.PI * 2;
    const bulbV = Math.random();
    let px = 0, py = 0, pz = 0;
    if (bulbV < 0.65) {
      const bulbPhi = Math.acos(2 * (bulbV / 0.65) - 1);
      const bRad = 1.18 + (Math.random() - 0.5) * 0.18;
      px = bRad * Math.sin(bulbPhi) * Math.cos(bulbAngle);
      py = bRad * Math.cos(bulbPhi) + 0.38;
      pz = bRad * Math.sin(bulbPhi) * Math.sin(bulbAngle);
    } else {
      const neckT = (bulbV - 0.65) / 0.35;
      const neckRad = (0.72 - neckT * 0.38) * (0.92 + Math.random() * 0.16);
      px = neckRad * Math.cos(bulbAngle);
      py = 0.38 - neckT * 1.45;
      pz = neckRad * Math.sin(bulbAngle);
    }
    productPositions[i3] = px;
    productPositions[i3 + 1] = py;
    productPositions[i3 + 2] = pz;

    // --- 4. FINAL CTA MORPH: RADIANT FOCAL CONVERGENCE ---
    const cRad = Math.pow(Math.random(), 3.2) * 0.48;
    const cTheta = Math.random() * Math.PI * 2;
    const cPhi = Math.acos(2 * Math.random() - 1);
    convergedPositions[i3] = cRad * Math.sin(cPhi) * Math.cos(cTheta);
    convergedPositions[i3 + 1] = cRad * Math.sin(cPhi) * Math.sin(cTheta);
    convergedPositions[i3 + 2] = cRad * Math.cos(cPhi);

    // --- 5. COLOR & SCALE DISTRIBUTION ---
    const rand = Math.random();
    const cIdx =
      rand < 0.42
        ? 0 // pure white
        : rand < 0.64
        ? 1 // off white
        : rand < 0.82
        ? 2 // lavender
        : rand < 0.93
        ? 3 // violet
        : rand < 0.97
        ? 4 // cyan
        : 5; // gold

    const col = palette[cIdx];
    colors[i3] = col.r;
    colors[i3 + 1] = col.g;
    colors[i3 + 2] = col.b;

    sizes[i] = Math.random() * 2.6 + 1.2;
    pulsePhases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPulsePhase', new THREE.BufferAttribute(pulsePhases, 1));

  // Custom Shader with Diamond / Triangle particle metrics and neural energy pulses
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      uOpacity: { value: 0.96 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float size;
      attribute float aPulsePhase;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vPulse;

      void main() {
        vColor = color;

        // Organic respiration & localized neural signal transmission
        vec3 pos = position;
        float pulseWave = sin(uTime * 1.8 + aPulsePhase);
        float respiration = sin(uTime * 0.8 + pos.y * 1.5) * 0.022;
        pos += normalize(pos) * (respiration + pulseWave * 0.015);

        vPulse = clamp(pulseWave * 0.5 + 0.5, 0.0, 1.0);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * uPixelRatio * (310.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.2, 16.0);

        gl_Position = projectionMatrix * mvPosition;

        // Depth falloff attenuation
        vAlpha = smoothstep(-7.5, -0.8, mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vPulse;
      uniform float uOpacity;

      void main() {
        // Geometric diamond/triangle silhouette (Manhattan metric)
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = abs(coord.x) + abs(coord.y);

        if (dist > 0.5) discard;

        // Core brightness with glowing halo falloff
        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 1.5);

        // Subtle neural pulse brighten
        vec3 finalColor = mix(vColor, vec3(1.0), vPulse * 0.35);

        gl_FragColor = vec4(finalColor, intensity * vAlpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  return {
    geometry,
    material,
    points,
    originalPositions,
    manifestoPositions,
    productPositions,
    convergedPositions,
  };
}
