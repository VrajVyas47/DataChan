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
 * central vertical data bus spindle, orbiting schema fragments, and inter-tier query links.
 */
export function createDatabaseCore(particleCount = 5200): DatabaseParticleData {
  const positions = new Float32Array(particleCount * 3);
  const originalPositions = new Float32Array(particleCount * 3);
  const manifestoPositions = new Float32Array(particleCount * 3);
  const productPositions = new Float32Array(particleCount * 3);
  const teamPositions = new Float32Array(particleCount * 3);
  const convergedPositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const pulsePhases = new Float32Array(particleCount);

  // Curated computational palette: pure white, off-white, cyan/teal data accents, lavender/violet bus, gold highlights
  const palette = [
    new THREE.Color('#ffffff'), // Pure White (42%)
    new THREE.Color('#e2e8f0'), // Off-White (24%)
    new THREE.Color('#38bdf8'), // Cyan Data Record (14%)
    new THREE.Color('#9b87f5'), // Violet Bus Link (12%)
    new THREE.Color('#2dd4bf'), // Mint/Teal Index (5%)
    new THREE.Color('#f59e0b'), // Amber Active Query (3%)
  ];

  // 4 Primary Cylindrical Platters (Foundation, Storage, Index, Engine)
  const tierYLevels = [-0.72, -0.24, 0.24, 0.72];
  const platterRadii = [1.25, 1.25, 1.25, 1.25];

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    let ox = 0;
    let oy = 0;
    let oz = 0;

    // Categorize particle roles in database architecture
    const roleSelector = Math.random();

    if (roleSelector < 0.62) {
      // --- 1. CONCENTRIC PLATTER STORAGE TRACKS ---
      // Distribute across the 4 database tiers
      const tierIndex = i % 4;
      const baseTierY = tierYLevels[tierIndex];
      const maxR = platterRadii[tierIndex];

      // Discrete concentric tracks (0.35, 0.65, 0.95, 1.25)
      const trackBand = Math.floor(Math.random() * 4);
      const trackRadius = 0.35 + trackBand * 0.3;
      const angle = Math.random() * Math.PI * 2;
      const radialJitter = (Math.random() - 0.5) * 0.08;
      const r = trackRadius + radialJitter;

      // Slight platter thickness (disk height)
      const yThickness = (Math.random() - 0.5) * 0.07;

      ox = Math.cos(angle) * r;
      oy = baseTierY + yThickness;
      oz = Math.sin(angle) * r;

      // Geometric sector clustering: simulate table blocks / data sectors
      const sectorAngle = Math.PI / 4;
      const sectorMod = angle % sectorAngle;
      if (sectorMod < sectorAngle * 0.15) {
        // Gap between disk sectors
        ox *= 1.02;
        oz *= 1.02;
      }
    } else if (roleSelector < 0.82) {
      // --- 2. CENTRAL HIGH-VELOCITY DATA BUS SPINDLE ---
      // Vertical cylinder routing data between all tiers
      const busRadius = 0.08 + Math.random() * 0.18;
      const busAngle = Math.random() * Math.PI * 2;
      const busY = (Math.random() - 0.5) * 2.0;

      ox = Math.cos(busAngle) * busRadius;
      oy = busY;
      oz = Math.sin(busAngle) * busRadius;
    } else if (roleSelector < 0.93) {
      // --- 3. INTER-PLATTER VERTICAL & HELICAL QUERY BUSES ---
      // Connects platter edges with vertical data flow
      const linkAngle = (Math.floor(Math.random() * 8) * (Math.PI / 4)) + (Math.random() - 0.5) * 0.1;
      const linkR = 0.75 + Math.random() * 0.45;
      const linkY = (Math.random() - 0.5) * 1.6;

      ox = Math.cos(linkAngle) * linkR;
      oy = linkY;
      oz = Math.sin(linkAngle) * linkR;
    } else {
      // --- 4. ORBITING SCHEMA FRAGMENTS & GEOMETRIC NODES ---
      // Halo of data records floating around database core
      const orbitR = 1.45 + Math.random() * 0.55;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitTilt = 0.25;

      ox = Math.cos(orbitAngle) * orbitR;
      oy = Math.sin(orbitAngle) * orbitR * orbitTilt + (Math.random() - 0.5) * 0.35;
      oz = Math.sin(orbitAngle) * orbitR;
    }

    // Initial position
    positions[i3] = ox;
    positions[i3 + 1] = oy;
    positions[i3 + 2] = oz;

    originalPositions[i3] = ox;
    originalPositions[i3 + 1] = oy;
    originalPositions[i3 + 2] = oz;

    // --- SCROLL MORPH 1: MANIFESTO / ARCHITECTURE (TIER SEPARATION & RADIAL EXPANSION) ---
    // The database tiers physically separate vertically to expose relationships
    const tierIdx = i % 4;
    const tierSpreadMultipliers = [-1.8, -0.6, 0.6, 1.8];
    const manifestoExpansion = 1.35;

    let mx = ox * manifestoExpansion;
    let my = oy + tierSpreadMultipliers[tierIdx] * 0.55;
    let mz = oz * manifestoExpansion;

    // Expand inter-schema relationship lines
    if (roleSelector >= 0.82 && roleSelector < 0.93) {
      mx *= 1.45;
      mz *= 1.45;
    }

    manifestoPositions[i3] = mx;
    manifestoPositions[i3 + 1] = my;
    manifestoPositions[i3 + 2] = mz;

    // --- SCROLL MORPH 2: PRODUCT (PIPELINE STREAM & STREAMING DATA FLOW) ---
    // Double helical stream flowing between query engine and storage
    const helixU = (i / particleCount) * Math.PI * 8;
    const helixR = 0.75 + Math.sin(helixU * 2) * 0.35;
    const helixY = ((i % 100) / 100 - 0.5) * 2.2;
    const px = Math.cos(helixU) * helixR;
    const py = helixY;
    const pz = Math.sin(helixU) * helixR;

    productPositions[i3] = px;
    productPositions[i3 + 1] = py;
    productPositions[i3 + 2] = pz;

    // --- SCROLL MORPH 3: TEAM (COMPACT SHIFTED DATASET) ---
    // Compacted database visual shifted to side for negative space
    teamPositions[i3] = ox * 0.72;
    teamPositions[i3 + 1] = oy * 0.72;
    teamPositions[i3 + 2] = oz * 0.72;

    // --- SCROLL MORPH 4: FINAL CTA (HIGH-DENSITY CORE CONVERGENCE) ---
    // Particles converge into an intense, glowing geometric focal core
    const cU = Math.random();
    const cTheta = cU * Math.PI * 2;
    const cR = Math.pow(Math.random(), 2.8) * 0.38; // Concentrated center
    const cx = Math.cos(cTheta) * cR;
    const cy = (Math.random() - 0.5) * 0.28;
    const cz = Math.sin(cTheta) * cR;

    convergedPositions[i3] = cx;
    convergedPositions[i3 + 1] = cy;
    convergedPositions[i3 + 2] = cz;

    // --- COLOR ASSIGNMENT ---
    let colorObj = palette[0];
    const colorRoll = Math.random();
    if (colorRoll < 0.42) colorObj = palette[0];
    else if (colorRoll < 0.66) colorObj = palette[1];
    else if (colorRoll < 0.80) colorObj = palette[2]; // Cyan
    else if (colorRoll < 0.92) colorObj = palette[3]; // Violet
    else if (colorRoll < 0.97) colorObj = palette[4]; // Mint
    else colorObj = palette[5]; // Amber highlight

    colors[i3] = colorObj.r;
    colors[i3 + 1] = colorObj.g;
    colors[i3 + 2] = colorObj.b;

    // Particle sizes: tiny geometric points (1.8 to 4.2px)
    sizes[i] = 1.8 + Math.random() * 2.4;
    pulsePhases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(pulsePhases, 1));

  // --- CUSTOM SHADER MATERIAL ---
  // Diamond/triangular fragment shape, localized pulse propagation, breathing respiration
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

        // Subtle respiration / data pulse vibration
        vec3 p = position;
        float pulse = sin(uTime * 1.6 + aPhase) * 0.015;
        p += normalize(p + vec3(0.001)) * pulse;

        // Vertical query pulse traveling up and down the data bus
        float busWave = sin(p.y * 3.5 - uTime * 2.2);
        if (busWave > 0.88) {
          vColor += vec3(0.25, 0.35, 0.45);
        }

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Depth-based attenuation
        gl_PointSize = size * uPixelRatio * (28.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.2, 14.0);

        vAlpha = clamp(0.45 + 0.45 * sin(uTime * 1.4 + aPhase), 0.25, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // Geometric diamond/fragment shape (Manhattan distance < 0.5)
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = abs(coord.x) + abs(coord.y);

        if (dist > 0.5) {
          discard;
        }

        // Crisp inner edge with subtle soft perimeter
        float edgeAlpha = smoothstep(0.5, 0.25, dist);
        gl_FragColor = vec4(vColor, vAlpha * edgeAlpha * 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  // --- SUBTLE WIREFRAME PLATTER RINGS (PHYSICAL DATA LAYER TOPOLOGY) ---
  const linePoints: number[] = [];
  const ringSegments = 48;

  for (const tierY of tierYLevels) {
    const ringRadius = 1.25;
    for (let r = 0; r < ringSegments; r++) {
      const a1 = (r / ringSegments) * Math.PI * 2;
      const a2 = ((r + 1) / ringSegments) * Math.PI * 2;

      linePoints.push(
        Math.cos(a1) * ringRadius, tierY, Math.sin(a1) * ringRadius,
        Math.cos(a2) * ringRadius, tierY, Math.sin(a2) * ringRadius
      );
    }
  }

  // Vertical data bus spine lines connecting the 4 platters
  const spineCount = 8;
  for (let s = 0; s < spineCount; s++) {
    const spineAngle = (s / spineCount) * Math.PI * 2;
    const spineR = 1.25;
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
    opacity: 0.16,
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
