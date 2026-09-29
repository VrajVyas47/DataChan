import * as THREE from 'three';
import { createParticleBrain, BrainParticleData } from './ParticleBrain';
import { createFloatingShapes, FloatingShapesField } from './FloatingShapes';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private brain: BrainParticleData;
  private floatingShapes: FloatingShapesField;
  private coreGlow: THREE.Sprite;
  private animId: number = 0;
  private clock: THREE.Clock;
  private isDestroyed = false;

  // Mouse interaction
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private boundMouseMove: (e: MouseEvent) => void;
  private boundResize: () => void;

  public currentStage = 0;
  public currentProgress = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Depth Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050608, 0.075);

    // 2. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 4.6);

    // 3. High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    // 4. Central Organic Brain Point Cloud
    const isMobile = window.innerWidth < 768;
    this.brain = createParticleBrain(isMobile ? 2400 : 5200);
    // Initial hero position: placed toward right/center
    this.brain.points.position.set(isMobile ? 0.0 : 0.95, isMobile ? 0.4 : 0.05, 0);
    this.scene.add(this.brain.points);

    // 5. Ambient Floating Geometric Triangles & Wireframes
    this.floatingShapes = createFloatingShapes(isMobile ? 18 : 36);
    this.scene.add(this.floatingShapes.group);

    // 6. Subtle Central Radiant Glow (Intensifies on Final CTA convergence)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(139, 92, 246, 0.65)');
      grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const glowTex = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreGlow = new THREE.Sprite(glowMat);
    this.coreGlow.scale.set(3.2, 3.2, 1);
    this.coreGlow.position.set(0.95, 0.05, 0);
    this.scene.add(this.coreGlow);

    // 7. Event Listeners
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundResize = this.onResize.bind(this);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('resize', this.boundResize);

    // 8. Start Loop
    this.render();
  }

  private onMouseMove(e: MouseEvent) {
    this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  private onResize() {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.brain.material.uniforms.uPixelRatio) {
      this.brain.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  }

  /**
   * GSAP Scroll Choreography
   */
  public updateScrollState(stage: number, stageProgress: number) {
    if (this.isDestroyed) return;
    this.currentStage = stage;
    this.currentProgress = stageProgress;

    const brainObj = this.brain.points;
    const posAttr = this.brain.geometry.attributes.position as THREE.BufferAttribute;
    const orig = this.brain.originalPositions;
    const manifesto = this.brain.manifestoPositions;
    const product = this.brain.productPositions;
    const converged = this.brain.convergedPositions;
    const count = orig.length;
    const isMobile = window.innerWidth < 768;

    const heroX = isMobile ? 0.0 : 0.95;
    const heroY = isMobile ? 0.35 : 0.05;

    if (stage === 0) {
      // Hero -> Manifesto
      const p = stageProgress;
      brainObj.position.x = heroX * (1 - p) + (isMobile ? 0.0 : -0.92) * p;
      brainObj.position.y = heroY * (1 - p) + 0.12 * p;
      brainObj.scale.setScalar(1.0 + p * 0.18);

      for (let i = 0; i < count; i++) {
        posAttr.array[i] = orig[i] * (1 - p) + manifesto[i] * p;
      }
      posAttr.needsUpdate = true;
      this.coreGlow.position.copy(brainObj.position);
      this.coreGlow.material.opacity = 0.15 * (1 - p) + 0.08 * p;
    } else if (stage === 1) {
      // Manifesto -> Product (Lightbulb / Neural core)
      const p = stageProgress;
      brainObj.position.x = (isMobile ? 0.0 : -0.92) * (1 - p) + (isMobile ? 0.0 : 0.88) * p;
      brainObj.position.y = 0.12 * (1 - p) + 0.02 * p;
      brainObj.scale.setScalar(1.18 * (1 - p) + 1.05 * p);

      for (let i = 0; i < count; i++) {
        posAttr.array[i] = manifesto[i] * (1 - p) + product[i] * p;
      }
      posAttr.needsUpdate = true;
      this.coreGlow.position.copy(brainObj.position);
      this.coreGlow.material.opacity = 0.08 * (1 - p) + 0.22 * p;
    } else if (stage === 2) {
      // Product -> Team (Quiet background, shifted left)
      const p = stageProgress;
      brainObj.position.x = (isMobile ? 0.0 : 0.88) * (1 - p) + (isMobile ? 0.0 : -1.15) * p;
      brainObj.position.y = 0.02 * (1 - p) + -0.1 * p;
      brainObj.scale.setScalar(1.05 * (1 - p) + 0.82 * p);

      for (let i = 0; i < count; i++) {
        posAttr.array[i] = product[i] * (1 - p) + orig[i] * p;
      }
      posAttr.needsUpdate = true;
      this.coreGlow.position.copy(brainObj.position);
      this.coreGlow.material.opacity = 0.22 * (1 - p) + 0.08 * p;
    } else if (stage === 3) {
      // Team -> Investors
      const p = stageProgress;
      brainObj.position.x = (isMobile ? 0.0 : -1.15) * (1 - p) + (isMobile ? 0.0 : 0.95) * p;
      brainObj.position.y = -0.1 * (1 - p) + 0.18 * p;
      brainObj.scale.setScalar(0.82 * (1 - p) + 0.88 * p);

      for (let i = 0; i < count; i++) {
        posAttr.array[i] = orig[i] * (1 - p) + manifesto[i] * p;
      }
      posAttr.needsUpdate = true;
      this.coreGlow.position.copy(brainObj.position);
      this.coreGlow.material.opacity = 0.08 * (1 - p) + 0.12 * p;
    } else if (stage >= 4) {
      // Investors -> Final CTA (Central Radiant Convergence)
      const p = Math.min(1.0, stageProgress);
      brainObj.position.x = (isMobile ? 0.0 : 0.95) * (1 - p) + 0.0 * p;
      brainObj.position.y = 0.18 * (1 - p) + 0.0 * p;
      brainObj.scale.setScalar(0.88 * (1 - p) + 1.35 * p);

      for (let i = 0; i < count; i++) {
        posAttr.array[i] = manifesto[i] * (1 - p) + converged[i] * p;
      }
      posAttr.needsUpdate = true;
      this.coreGlow.position.set(0, 0, 0);
      this.coreGlow.scale.setScalar(3.2 + p * 2.0);
      this.coreGlow.material.opacity = 0.12 * (1 - p) + 0.55 * p; // Radiant climax glow
    }
  }

  private render() {
    if (this.isDestroyed) return;

    const time = this.clock.getElapsedTime();

    // Mouse interpolation (gentle, expensive feel)
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.04;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.04;

    // Organic brain smooth rotation
    if (this.brain.points) {
      this.brain.points.rotation.y = time * 0.11 + this.mouse.x * 0.25;
      this.brain.points.rotation.x = 0.14 + this.mouse.y * 0.16;
      this.brain.points.rotation.z = Math.sin(time * 0.18) * 0.04;

      if (this.brain.material.uniforms.uTime) {
        this.brain.material.uniforms.uTime.value = time;
      }
    }

    // Camera breathing parallax
    this.camera.position.x = this.mouse.x * 0.16;
    this.camera.position.y = -this.mouse.y * 0.12;
    this.camera.lookAt(0, 0, 0);

    // Floating wireframe geometric shapes
    this.floatingShapes.update(time);

    this.renderer.render(this.scene, this.camera);
    this.animId = requestAnimationFrame(this.render.bind(this));
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('resize', this.boundResize);

    this.brain.geometry.dispose();
    this.brain.material.dispose();
    this.coreGlow.material.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
