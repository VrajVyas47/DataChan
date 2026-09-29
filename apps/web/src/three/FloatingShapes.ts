import * as THREE from 'three';

export interface FloatingShapesField {
  group: THREE.Group;
  update: (time: number) => void;
}

export function createFloatingShapes(count = 35): FloatingShapesField {
  const group = new THREE.Group();

  const colors = [
    new THREE.Color('#ffffff'), // White
    new THREE.Color('#8b5cf6'), // Purple
    new THREE.Color('#06b6d4'), // Teal / Cyan
    new THREE.Color('#fbbf24'), // Muted Gold
  ];

  // Base triangle wireframe geometry
  const triangleGeo = new THREE.BufferGeometry();
  const radius = 0.12;
  const vertices = new Float32Array([
    0, radius, 0,
    radius * 0.866, -radius * 0.5, 0,
    radius * 0.866, -radius * 0.5, 0,
    -radius * 0.866, -radius * 0.5, 0,
    -radius * 0.866, -radius * 0.5, 0,
    0, radius, 0,
  ]);
  triangleGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  // Base small tetrahedron wireframe geometry
  const tetGeo = new THREE.BufferGeometry();
  const r = 0.14;
  const tetVerts = new Float32Array([
    0, r, 0,  r * 0.86, -r * 0.5, r * 0.5,
    r * 0.86, -r * 0.5, r * 0.5,  -r * 0.86, -r * 0.5, r * 0.5,
    -r * 0.86, -r * 0.5, r * 0.5,  0, r, 0,
    0, r, 0,  0, -r * 0.5, -r,
    r * 0.86, -r * 0.5, r * 0.5,  0, -r * 0.5, -r,
    -r * 0.86, -r * 0.5, r * 0.5,  0, -r * 0.5, -r,
  ]);
  tetGeo.setAttribute('position', new THREE.BufferAttribute(tetVerts, 3));

  interface FloatingItem {
    mesh: THREE.LineSegments;
    basePos: THREE.Vector3;
    rotSpeed: THREE.Vector3;
    driftSpeed: THREE.Vector3;
    driftPhase: number;
  }

  const items: FloatingItem[] = [];

  for (let i = 0; i < count; i++) {
    const isTetra = Math.random() > 0.65;
    const geo = isTetra ? tetGeo : triangleGeo;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: Math.random() * 0.55 + 0.25,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.LineSegments(geo, mat);

    // Distribution in a wide volume around camera and subject
    const scale = Math.random() * 1.8 + 0.6;
    mesh.scale.set(scale, scale, scale);

    let x = (Math.random() - 0.5) * 14;
    let y = (Math.random() - 0.5) * 10;
    let z = (Math.random() - 0.5) * 8 - 1.5;

    // Preserve quiet zone over the left hero headline (x: -3.0 to 0.1, y: -1.2 to 1.8)
    if (x > -3.0 && x < 0.2 && y > -1.2 && y < 1.8) {
      if (Math.random() > 0.4) {
        x += 2.2; // Push to right side
      } else {
        z -= 3.5; // Push deep into atmospheric background
      }
    }

    mesh.position.set(x, y, z);
    group.add(mesh);

    items.push({
      mesh,
      basePos: new THREE.Vector3(x, y, z),
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01
      ),
      driftSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.08
      ),
      driftPhase: Math.random() * Math.PI * 2,
    });
  }

  // Also add faint background ambient dust field (800 tiny particles)
  const dustCount = 750;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * 20;
    dustPos[i + 1] = (Math.random() - 0.5) * 16;
    dustPos[i + 2] = (Math.random() - 0.5) * 12 - 2;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.025,
    color: '#8b5cf6',
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  group.add(dustPoints);

  const update = (time: number) => {
    items.forEach((item) => {
      item.mesh.rotation.x += item.rotSpeed.x;
      item.mesh.rotation.y += item.rotSpeed.y;
      item.mesh.rotation.z += item.rotSpeed.z;

      item.mesh.position.x = item.basePos.x + Math.sin(time * 0.4 + item.driftPhase) * item.driftSpeed.x;
      item.mesh.position.y = item.basePos.y + Math.cos(time * 0.3 + item.driftPhase) * item.driftSpeed.y;
      item.mesh.position.z = item.basePos.z + Math.sin(time * 0.2 + item.driftPhase) * item.driftSpeed.z;
    });

    dustPoints.rotation.y = time * 0.015;
  };

  return {
    group,
    update,
  };
}
