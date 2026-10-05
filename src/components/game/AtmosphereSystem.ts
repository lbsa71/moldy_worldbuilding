import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { bounded, material, palette, seededRandom } from "./VisualStyle";

interface EmotionalAtmosphere { fog: Color3; light: Color3; ground: Color3; intensity: number; key: number; }
function mood(fog: string, light: string, ground: string, intensity: number, key = 1.1): EmotionalAtmosphere {
  return { fog: Color3.FromHexString(fog), light: Color3.FromHexString(light), ground: Color3.FromHexString(ground), intensity, key };
}
const REFUGE = mood("#27383F", "#CFD7CC", "#17262C", 0.6);
const INTIMACY = mood("#35464A", "#D6DCCF", "#1D2B2C", 0.62);
const CONSTRICTION = mood("#25353F", "#A7BCC4", "#121E25", 0.46, 0.8);
const BREATH = mood("#53616A", "#D8DEDD", "#303A40", 0.76);
const RETURN = mood("#48534C", "#E9DEC3", "#2F3630", 0.72);
const EMOTIONAL_SKIES: Record<string, EmotionalAtmosphere> = {
  lamp: REFUGE, chair: REFUGE, cup: INTIMACY, rail: INTIMACY, hand: INTIMACY,
  contradiction: CONSTRICTION, boundary: CONSTRICTION, quiet: BREATH, recollection: BREATH,
  preparation: RETURN, decision: RETURN,
  keep: mood("#535D4F", "#F0DFB7", "#353B2D", 0.78),
  carry: mood("#66777A", "#E1E9E2", "#374748", 0.82),
  rest: mood("#3D4A52", "#C5D3D8", "#252F35", 0.56, 0),
};

export class AtmosphereSystem {
  private ambient: HemisphericLight;
  private memoryLight: PointLight;
  private keyStrength = REFUGE.key;
  private readonly keyOffset = new Vector3(-1, 2.1, -1);
  private surface: StandardMaterial;
  private motes: { mesh: Mesh; offset: Vector3; phase: number }[] = [];
  private observer: Observer<Scene> | null;
  private targetFog = 1;
  private fog = 1;
  private elapsed = 0;
  private reducedMotion = false;
  private debug = false;
  private targetMood = REFUGE;
  private listenerPosition = Vector3.Zero();
  private disposed = false;
  constructor(private scene: Scene) {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = REFUGE.fog.clone();
    scene.clearColor = new Color4(scene.fogColor.r, scene.fogColor.g, scene.fogColor.b, 1);
    this.ambient = new HemisphericLight("slateAmbient", new Vector3(0.4,1,-0.25), scene);
    this.ambient.diffuse = REFUGE.light.clone(); this.ambient.groundColor = REFUGE.ground.clone();
    this.ambient.intensity = REFUGE.intensity;
    // One local key reveals the native PBR props beyond the fixed warm lamp.
    // It has no shadow generator, texture, glow inclusion, or per-memory clone.
    this.memoryLight = new PointLight("memoryPointLight", this.keyOffset.clone(), scene);
    this.memoryLight.diffuse = Color3.FromHexString("#CAD5D8");
    this.memoryLight.specular = this.memoryLight.diffuse.scale(0.6);
    this.memoryLight.range = 9; this.memoryLight.intensity = 0; this.memoryLight.setEnabled(false);
    this.surface = material(scene, "lampDust", palette.ivory, 0.35); this.surface.alpha = 0.35;
    const random = seededRandom(71);
    // A handful of small motes, rather than thousands of overlapping mist cards.
    for (let i=0;i<18;i++) {
      const mesh = CreateSphere(`lampDust${i}`, { diameter: 0.018 + random()*0.022, segments: 4 }, scene);
      mesh.material = this.surface; mesh.isPickable = false;
      mesh.position.set((random()-0.5)*12, 0.7+random()*3, (random()-0.5)*12);
      this.motes.push({ mesh, offset: mesh.position.clone(), phase: random()*Math.PI*2 });
    }
    this.applyFog();
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime()/1000 || 1/60,0.1);
      this.elapsed += dt;
      this.fog += (this.targetFog-this.fog)*(1-Math.exp(-dt*1.2));
      this.applyFog();
      this.applyMood(this.reducedMotion ? 1 : 1 - Math.exp(-dt * 0.85));
      this.positionMotes();
    });
  }
  private applyFog(): void { this.scene.fogDensity = this.debug ? 0 : 0.004 + this.fog*0.02; }
  private applyMood(blend: number): void {
    Color3.LerpToRef(this.scene.fogColor, this.targetMood.fog, blend, this.scene.fogColor);
    Color3.LerpToRef(this.ambient.diffuse, this.targetMood.light, blend, this.ambient.diffuse);
    Color3.LerpToRef(this.ambient.groundColor, this.targetMood.ground, blend, this.ambient.groundColor);
    this.ambient.intensity += (this.targetMood.intensity - this.ambient.intensity) * blend;
    this.keyStrength += (this.targetMood.key - this.keyStrength) * blend;
    this.positionMemoryLight();
    // Unused responsive viewport and distant terrain share the same sky color.
    this.scene.clearColor.set(this.scene.fogColor.r, this.scene.fogColor.g, this.scene.fogColor.b, 1);
  }
  private positionMotes(): void {
    this.motes.forEach(({mesh,offset,phase}) => {
      mesh.position.copyFrom(this.listenerPosition).addInPlace(offset);
      if (!this.reducedMotion) mesh.position.y += Math.sin(this.elapsed * 0.3 + phase) * 0.12;
    });
  }
  private positionMemoryLight(): void {
    this.memoryLight.position.copyFrom(this.listenerPosition).addInPlace(this.keyOffset);
    const distance = Math.hypot(this.listenerPosition.x, this.listenerPosition.z);
    const t = bounded((distance - 2) / 3);
    this.memoryLight.intensity = this.keyStrength * t * t * (3 - 2 * t);
    this.memoryLight.setEnabled(this.memoryLight.intensity > 0.001);
  }
  setNarrativeScene(name: string | null): void {
    if (this.disposed) return;
    this.targetMood = (name && EMOTIONAL_SKIES[name]) || REFUGE;
    if (this.reducedMotion) this.applyMood(1);
  }
  updateListenerPosition(position: Vector3): void {
    if (this.disposed || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) return;
    this.listenerPosition.copyFrom(position); this.positionMotes(); this.positionMemoryLight();
  }
  updateFog(value: number | null): void {
    this.targetFog = value === null ? 1 : bounded(value, 1);
    if (this.reducedMotion) { this.fog = this.targetFog; this.applyFog(); }
  }
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) { this.fog = this.targetFog; this.applyFog(); this.applyMood(1); this.positionMotes(); }
  }
  toggleDebug(): void { this.debug = !this.debug; this.applyFog(); }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.motes.forEach(({mesh}) => mesh.dispose()); this.surface.dispose(); this.ambient.dispose(); this.memoryLight.dispose();
  }
}
