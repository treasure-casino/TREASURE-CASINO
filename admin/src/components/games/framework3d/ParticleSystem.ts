import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private maxParticles = 600;
  private positions: Float32Array;
  private colors: Float32Array;

  constructor(scene: THREE.Scene, maxParticles = 600) {
    this.scene = scene;
    this.maxParticles = maxParticles;

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Create a circular blurred canvas texture for soft particle points
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public burst(
    center: THREE.Vector3,
    count = 60,
    color = new THREE.Color(1, 0.85, 0.2),
    speed = 4,
    size = 0.4
  ): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const vel = dir.multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      const life = 0.8 + Math.random() * 1.2;

      this.particles.push({
        position: center.clone(),
        velocity: vel,
        color: color.clone().offsetHSL((Math.random() - 0.5) * 0.1, 0, 0),
        size: size * (0.6 + Math.random() * 0.8),
        life,
        maxLife: life,
        alpha: 1,
      });
    }
  }

  public emit(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    color = new THREE.Color(1, 0.5, 0.1),
    spread = 0.3,
    count = 3
  ): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const vel = velocity.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        )
      );

      this.particles.push({
        position: origin.clone(),
        velocity: vel,
        color: color.clone(),
        size: 0.25 + Math.random() * 0.2,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        alpha: 1,
      });
    }
  }

  public update(delta: number): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, delta);
      // Slight gravity / drag
      p.velocity.y -= delta * 1.5;
      p.velocity.multiplyScalar(0.98);

      const ratio = p.life / p.maxLife;
      p.alpha = Math.max(0, ratio);
    }

    let pIdx = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.positions[pIdx] = p.position.x;
      this.positions[pIdx + 1] = p.position.y;
      this.positions[pIdx + 2] = p.position.z;

      this.colors[pIdx] = p.color.r * p.alpha;
      this.colors[pIdx + 1] = p.color.g * p.alpha;
      this.colors[pIdx + 2] = p.color.b * p.alpha;

      pIdx += 3;
    }

    // Zero out unused
    for (let i = pIdx; i < this.maxParticles * 3; i++) {
      this.positions[i] = 0;
      this.colors[i] = 0;
    }

    this.geometry.setDrawRange(0, this.particles.length);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.particles = [];
  }
}

