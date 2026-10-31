import * as THREE from 'three';

export interface LightPresetConfig {
  ambientColor?: number;
  ambientIntensity?: number;
  mainColor?: number;
  mainIntensity?: number;
  mainPos?: THREE.Vector3;
  rimColor?: number;
  rimIntensity?: number;
  rimPos?: THREE.Vector3;
}

export class LightingManager {
  private scene: THREE.Scene;
  public ambientLight: THREE.AmbientLight;
  public mainLight: THREE.DirectionalLight;
  public rimLight: THREE.DirectionalLight;
  public pointLights: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene, config: LightPresetConfig = {}) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(
      config.ambientColor ?? 0xffffff,
      config.ambientIntensity ?? 0.6
    );
    this.scene.add(this.ambientLight);

    this.mainLight = new THREE.DirectionalLight(
      config.mainColor ?? 0xfff4e0,
      config.mainIntensity ?? 1.2
    );
    const mainPos = config.mainPos ?? new THREE.Vector3(5, 10, 8);
    this.mainLight.position.copy(mainPos);
    this.scene.add(this.mainLight);

    this.rimLight = new THREE.DirectionalLight(
      config.rimColor ?? 0x6699ff,
      config.rimIntensity ?? 0.5
    );
    const rimPos = config.rimPos ?? new THREE.Vector3(-6, -4, -5);
    this.rimLight.position.copy(rimPos);
    this.scene.add(this.rimLight);
  }

  public addPointLight(color: number, intensity: number, distance: number, position: THREE.Vector3): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.copy(position);
    this.scene.add(light);
    this.pointLights.push(light);
    return light;
  }

  public removePointLight(light: THREE.PointLight): void {
    this.scene.remove(light);
    this.pointLights = this.pointLights.filter((l) => l !== light);
  }

  public dispose(): void {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.mainLight);
    this.scene.remove(this.rimLight);
    for (const light of this.pointLights) {
      this.scene.remove(light);
    }
    this.pointLights = [];
  }
}

