import * as THREE from 'three';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private defaultPosition: THREE.Vector3;
  private defaultLookAt: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private shakeIntensity = 0;
  private shakeDecay = 5;

  constructor(camera: THREE.PerspectiveCamera, initialPos = new THREE.Vector3(0, 0, 10), initialLookAt = new THREE.Vector3(0, 0, 0)) {
    this.camera = camera;
    this.defaultPosition = initialPos.clone();
    this.defaultLookAt = initialLookAt.clone();
    this.currentLookAt = initialLookAt.clone();

    this.camera.position.copy(this.defaultPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  public setPosition(pos: THREE.Vector3, immediate = false): void {
    if (immediate) {
      this.defaultPosition.copy(pos);
      this.camera.position.copy(pos);
    } else {
      this.defaultPosition.copy(pos);
    }
  }

  public setLookAt(target: THREE.Vector3, immediate = false): void {
    if (immediate) {
      this.defaultLookAt.copy(target);
      this.currentLookAt.copy(target);
      this.camera.lookAt(this.currentLookAt);
    } else {
      this.defaultLookAt.copy(target);
    }
  }

  public triggerShake(intensity = 0.5, decay = 6): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = decay;
  }

  public update(delta: number): void {
    // Smooth lerp to target position
    this.camera.position.lerp(this.defaultPosition, Math.min(1, delta * 6));
    this.currentLookAt.lerp(this.defaultLookAt, Math.min(1, delta * 6));
    this.camera.lookAt(this.currentLookAt);

    // Apply shake offset if active
    if (this.shakeIntensity > 0.001) {
      const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * 2 * this.shakeIntensity;

      this.camera.position.x += offsetX;
      this.camera.position.y += offsetY;
      this.camera.position.z += offsetZ;

      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * this.shakeDecay);
    }
  }
}

