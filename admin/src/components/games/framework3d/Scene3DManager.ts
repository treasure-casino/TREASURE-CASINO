import * as THREE from 'three';

export interface Scene3DConfig {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  enableShadows?: boolean;
}

export class Scene3DManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private onUpdateCallbacks: Array<(delta: number, elapsed: number) => void> = [];
  private clock: THREE.Clock;
  private isDestroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, config: Scene3DConfig = {}) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    const width = container.clientWidth || container.parentElement?.clientWidth || window.innerWidth;
    const height = container.clientHeight || container.parentElement?.clientHeight || (window.innerHeight - 140);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: config.antialias !== false,
      alpha: config.alpha !== false,
      powerPreference: config.powerPreference || 'high-performance',
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (config.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Append canvas
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.outline = 'none';

    this.setupResizeObserver();
    this.startLoop();
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.isDestroyed) return;
      this.onResize();
    });
    this.resizeObserver.observe(this.container);
  }

  public onResize(): void {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || this.container.parentElement?.clientWidth;
    const height = this.container.clientHeight || this.container.parentElement?.clientHeight;
    if (!width || !height || width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public registerUpdate(callback: (delta: number, elapsed: number) => void): () => void {
    this.onUpdateCallbacks.push(callback);
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  private startLoop(): void {
    const loop = () => {
      if (this.isDestroyed) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const delta = Math.min(this.clock.getDelta(), 0.1); // cap to 100ms
      const elapsed = this.clock.getElapsedTime();

      for (const cb of this.onUpdateCallbacks) {
        cb(delta, elapsed);
      }

      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.onUpdateCallbacks = [];

    // Traverse and dispose all scene objects, meshes, materials, and textures
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(obj.material);
          }
        }
      }
    });

    this.scene.clear();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  private disposeMaterial(mat: THREE.Material): void {
    mat.dispose();
    for (const key of Object.keys(mat)) {
      const val = (mat as any)[key];
      if (val && typeof val === 'object' && 'minFilter' in val) {
        val.dispose(); // Texture
      }
    }
  }
}

