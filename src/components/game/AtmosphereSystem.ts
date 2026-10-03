import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { bounded, material, palette, seededRandom } from "./VisualStyle";

export class AtmosphereSystem {
  private ambient: HemisphericLight;
  private surface: StandardMaterial;
  private motes: { mesh: Mesh; y: number; phase: number }[] = [];
  private observer: Observer<Scene> | null;
  private targetFog = 1;
  private fog = 1;
  private elapsed = 0;
  private reducedMotion = false;
  private debug = false;
  constructor(private scene: Scene) {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = Color3.FromHexString("#27383F");
    scene.clearColor = new Color4(scene.fogColor.r, scene.fogColor.g, scene.fogColor.b, 1);
    this.ambient = new HemisphericLight("slateAmbient", new Vector3(0.4,1,-0.25), scene);
    this.ambient.diffuse = palette.bone; this.ambient.groundColor = palette.stone.scale(0.4);
    this.ambient.intensity = 0.6;
    this.surface = material(scene, "lampDust", palette.ivory, 0.35); this.surface.alpha = 0.35;
    const random = seededRandom(71);
    // A handful of small motes, rather than thousands of overlapping mist cards.
    for (let i=0;i<18;i++) {
      const mesh = CreateSphere(`lampDust${i}`, { diameter: 0.018 + random()*0.022, segments: 4 }, scene);
      mesh.material = this.surface; mesh.isPickable = false;
      mesh.position.set((random()-0.5)*12, 0.7+random()*3, (random()-0.5)*12);
      this.motes.push({ mesh, y: mesh.position.y, phase: random()*Math.PI*2 });
    }
    this.applyFog();
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime()/1000 || 1/60,0.1);
      this.elapsed += dt;
      this.fog += (this.targetFog-this.fog)*(1-Math.exp(-dt*1.2));
      this.applyFog();
      this.motes.forEach(({mesh,y,phase}) => { mesh.position.y = y + (this.reducedMotion ? 0 : Math.sin(this.elapsed*0.3+phase)*0.12); });
    });
  }
  private applyFog(): void { this.scene.fogDensity = this.debug ? 0 : 0.004 + this.fog*0.02; }
  updateFog(value: number | null): void {
    this.targetFog = value === null ? 1 : bounded(value, 1);
    if (this.reducedMotion) { this.fog = this.targetFog; this.applyFog(); }
  }
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) { this.fog = this.targetFog; this.applyFog(); this.motes.forEach(({mesh,y}) => { mesh.position.y=y; }); }
  }
  toggleDebug(): void { this.debug = !this.debug; this.applyFog(); }
  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.motes.forEach(({mesh}) => mesh.dispose()); this.surface.dispose(); this.ambient.dispose();
  }
}
