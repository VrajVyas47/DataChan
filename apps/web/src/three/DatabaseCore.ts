import * as THREE from 'three';

export interface DatabaseParticleData {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
  lines: THREE.LineSegments;
  originalPositions: Float32Array;
  manifestoPositions: Float32Array;
  productPositions: Float32Array;
  teamPositions: Float32Array;
  convergedPositions: Float32Array;
}

/**
 * Creates an abstract, physical 3D database architecture floating in dark computational space.
 * Composed of 4 stacked cylindrical storage platters, concentric data tracks,
 * central vertical data bus spindle, structured records, and inter-tier query links.
 */
export function createDatabaseCore(particleCount = 1800): DatabaseParticleData {
  const positions = new Float32Array(particleCount * 3);
  const originalPositions = new Float32Array(particleCount * 3);
  const manifestoPositions = new Float32Array(particleCount * 3);
  const productPositions = new Float32Array(particleCount * 3);
  const teamPositions = new Float32Array(particleCount * 3);
  const convergedPositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const pulsePhases = new Float32Array(particleCount);

  // Restrained computational palette: 75% pure white/off-white/slate, subtle cyan/violet accents, occasional muted gold
  const palette = [
    new THREE.Color('#ffffff'), // Pure White (50%)
    new THREE.Color('#e2e8f0'), // Off-White (25%)
    new THREE.Color('#38bdf8'), // Subtle Cyan Data Node (12%)
    new THREE.Color('#9b87f5'), // Subtle Violet Bus (10%)
    new THREE.Color('#f59e0b'), // Muted Amber Query Flag (3%)
  ];

  // 4 Primary Cylindrical Storage Platters (Storage, Index, Engine, Memory)
  const tierYLevels = [-0.55, -0.18, 0.18, 0.55];
  const maxPlatterRadius = 0.85;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    let ox = 0;
    let oy = 0;
    let oz = 0;

    const roleSelector = Math.random();

    if (roleSelector < 0.68) {
      // --- 1. CONCENTRIC PLATTER STORAGE TRACKS ---
      // Distribute across the 4 database tiers
      const tierIndex = i % 4;
      const baseTierY = tierYLevels[tierIndex];

      // 3 clean concentric data bands (0.32, 0.58, 0.82)
      const trackBand = Math.floor(Math.random() * 3);
      const trackRadius = 0.32 + trackBand * 0.25;
      const angle = Math.random() * Math.PI * 2;
      const radialJitter = (Math.random() - 0.5) * 0.05;
      const r = Math.min(maxPlatterRadius, trackRadius + radialJitter);

      // Slight platter thickness
      const yThickness = (Math.random() - 0.5) * 0.04;

      ox = Math.cos(angle) * r;
      oy = baseTierY + yThickness;
      oz = Math.sin(angle) * r;

      // Group into structured disk sectors (database blocks)
      const sectorAngle = Math.PI / 4;
      const sectorMod = angle % sectorAngle;
      if (sectorMod < sectorAngle * 0.12) {
        ox *= 1.015;
        oz *= 1.015;
      }
    } else if (roleSelector < 0.85) {
      // --- 2. CENTRAL DATA BUS SPINDLE ---
      // Slender vertical cylinder routing data between tiers
      const busRadius = 0.06 + Math.random() * 0.12;
      const busAngle = Math.random() * Math.PI * 2;
      const busY = (Math.random() - 0.5) * 1.5;

      ox = Math.cos(busAngle) * busRadius;
      oy = busY;
      oz = Math.sin(busAngle) * busRadius;
    } else if (roleSelector < 0.94) {
      // --- 3. INTER-PLATTER VERTICAL BUS CONNECTORS ---
      // 4 clean vertical interconnect columns connecting platter perimeters
      const colIndex = Math.floor(Math.random() * 4);
      const linkAngle = (colIndex * (Math.PI / 2)) + (Math.random() - 0.5) * 0.08;
      const linkR = 0.82 + (Math.random() - 0.5) * 0.04;
      const linkY = (Math.random() - 0.5) * 1.25;

      ox = Math.cos(linkAngle) * linkR;
      oy = linkY;
      oz = Math.sin(linkAngle) * linkR;
    } else {
      // --- 4. TIGHT ORBITING SCHEMA FRAGMENTS ---
      // Close halo of structured records around the core (kept tightly bounded <= 1.05)
      const orbitR = 0.92 + Math.random() * 0.14;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitTilt = 0.20;

      ox = Math.cos(orbitAngle) * orbitR;
      oy = Math.sin(orbitAngle) * orbitR * orbitTilt + (Math.random() - 0.5) * 0.2;
      oz = Math.sin(orbitAngle) * orbitR;
    }

    // Initial structured positions
    positions[i3] = ox;
    positions[i3 + 1] = oy;
    positions[i3 + 2] = oz;

    originalPositions[i3] = ox;
    originalPositions[i3 + 1] = oy;
    originalPositions[i3 + 2] = oz;

    // --- SCROLL MORPH 1: MANIFESTO / ARCHITECTURE (TIER SEPARATION) ---
    // The database platters separate vertically to reveal schema relationships
    const tierIdx = i % 4;
    const tierSpreadMultipliers = [-1.6, -0.5, 0.5, 1.6];
    manifestoPositions[i3] = ox * 1.25;
    manifestoPositions[i3 + 1] = oy + tierSpreadMultipliers[tierIdx] * 0.45;
    manifestoPositions[i3 + 2] = oz * 1.25;

    // --- SCROLL MORPH 2: PRODUCT (PIPELINE STREAM) ---
    // Controlled data stream flowing between query engine and storage
    const helixU = (i / particleCount) * Math.PI * 6;
    const helixR = 0.65 + Math.sin(helixU * 2) * 0.25;
    const helixY = ((i % 100) / 100 - 0.5) * 1.9;
    productPositions[i3] = Math.cos(helixU) * helixR;
    productPositions[i3 + 1] = helixY;
    productPositions[i3 + 2] = Math.sin(helixU) * helixR;

    // --- SCROLL MORPH 3: TEAM (COMPACT SHIFTED DATASET) ---
    teamPositions[i3] = ox * 0.68;
    teamPositions[i3 + 1] = oy * 0.68;
    teamPositions[i3 + 2] = oz * 0.68;

    // --- SCROLL MORPH 4: FINAL CTA (CONVERGED FOCAL CORE) ---
    const cTheta = Math.random() * Math.PI * 2;
    const cR = Math.pow(Math.random(), 2.5) * 0.32;
    convergedPositions[i3] = Math.cos(cTheta) * cR;
    convergedPositions[i3 + 1] = (Math.random() - 0.5) * 0.22;
    convergedPositions[i3 + 2] = Math.sin(cTheta) * cR;

    // --- COLOR ASSIGNMENT ---
    let colorObj = palette[0];
    const colorRoll = Math.random();
    if (colorRoll < 0.50) colorObj = palette[0];      // 50% White
    else if (colorRoll < 0.75) colorObj = palette[1]; // 25% Off-White
    else if (colorRoll < 0.87) colorObj = palette[2]; // 12% Cyan
    else if (colorRoll < 0.97) colorObj = palette[3]; // 10% Violet
    else colorObj = palette[4];                       // 3% Amber

    colors[i3] = colorObj.r;
    colors[i3 + 1] = colorObj.g;
    colors[i3 + 2] = colorObj.b;

    // Crisp micro-particle sizes (0.8 to 1.8px)
    sizes[i] = 0.8 + Math.random() * 1.0;
    pulsePhases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(pulsePhases, 1));

  // --- CUSTOM SHADER MATERIAL ---
  // Crisp geometric diamond particles with controlled depth attenuation
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 2 },
    },
    vertexShader: `
      attribute float size;
      attribute float aPhase;
      attribute vec3 color;

      uniform float uTime;
      uniform float uPixelRatio;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;

        // Subtle calm data pulse
        vec3 p = position;
        float pulse = sin(uTime * 1.4 + aPhase) * 0.008;
        p += normalize(p + vec3(0.001)) * pulse;

        // Subtle traveling vertical query pulse
        float busWave = sin(p.y * 3.5 - uTime * 2.0);
        if (busWave > 0.92) {
          vColor += vec3(0.20, 0.25, 0.35);
        }

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Crisp, controlled point size
        gl_PointSize = size * uPixelRatio * (12.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 4.0);

        vAlpha = clamp(0.55 + 0.45 * sin(uTime * 1.2 + aPhase), 0.35, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Crisp geometric diamond shape
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = abs(coord.x) + abs(coord.y);
        if (dist > 0.5) discard;

        float edgeFade = smoothstep(0.5, 0.25, dist);
        gl_FragColor = vec4(vColor, vAlpha * edgeFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  // --- SUBTLE WIREFRAME DATABASE PLATTER RINGS & SPINES ---
  const linePoints: number[] = [];
  const ringSegments = 40;

  // Concentric perimeter and mid-track rings on all 4 platters
  for (const tierY of tierYLevels) {
    for (const r of [0.55, 0.85]) {
      for (let s = 0; s < ringSegments; s++) {
        const a1 = (s / ringSegments) * Math.PI * 2;
        const a2 = ((s + 1) / ringSegments) * Math.PI * 2;

        linePoints.push(
          Math.cos(a1) * r, tierY, Math.sin(a1) * r,
          Math.cos(a2) * r, tierY, Math.sin(a2) * r
        );
      }
    }
  }

  // 4 Vertical data bus spine lines connecting the 4 platters
  for (let s = 0; s < 4; s++) {
    const spineAngle = (s / 4) * Math.PI * 2;
    const spineR = 0.85;
    linePoints.push(
      Math.cos(spineAngle) * spineR, tierYLevels[0], Math.sin(spineAngle) * spineR,
      Math.cos(spineAngle) * spineR, tierYLevels[3], Math.sin(spineAngle) * spineR
    );
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  points.add(lines);

  return {
    geometry,
    material,
    points,
    lines,
    originalPositions,
    manifestoPositions,
    productPositions,
    teamPositions,
    convergedPositions,
  };
}
