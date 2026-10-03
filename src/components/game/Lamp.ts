import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { Scene } from "@babylonjs/core/scene";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Material } from "@babylonjs/core/Materials/material";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { bounded, material, palette } from "./VisualStyle";
import type { HeroAssetInstance, HeroAssetLibrary } from "./HeroAssetLibrary";
/** The bedside light remains at one place throughout the chapter. */
export class Lamp {
  private root: TransformNode;
  private fallbackRoot: TransformNode;
  private light: PointLight;
  private meshes: Mesh[] = [];
  private surfaces: StandardMaterial[];
  private bulb: Mesh;
  private observer: Observer<Scene> | null;
  private targetWarmth = 1.6;
  private reducedMotion = false;
  private disposed = false;
  private imported?: HeroAssetInstance;
  private visible = 1;
  private shadeSurfaces: (Material & { emissiveColor: Color3 })[] = [];
  private filamentSurfaces: (Material & { emissiveColor: Color3 })[] = [];
  private glowingMeshes: Mesh[] = [];
  constructor(private scene: Scene, position: Vector3, rotation = Vector3.Zero(), private glow?: GlowLayer, assets?: HeroAssetLibrary) {
    this.root = new TransformNode("persistentLamp", scene);
    this.root.position.copyFrom(position); this.root.rotation.copyFrom(rotation);
    this.fallbackRoot = new TransformNode("proceduralLamp", scene);
    this.fallbackRoot.parent = this.root;
    if (assets) this.fallbackRoot.scaling.setAll(0.55);
    const brass = material(scene, "lampBrass", palette.brass);
    const dark = material(scene, "lampIron", palette.stone);
    const linen = material(scene, "lampLinen", palette.ivory, 0.18);
    const filament = material(scene, "lampFilament", Color3.FromHexString("#FFE4A0"), 1);
    this.surfaces = [brass, dark, linen, filament];
    this.shadeSurfaces = [linen]; this.filamentSurfaces = [filament];
    const add = (mesh: Mesh, surface: StandardMaterial, y: number) => {
      mesh.parent = this.fallbackRoot; mesh.position.y = y; mesh.material = surface; mesh.isPickable = false;
      this.meshes.push(mesh); return mesh;
    };
    add(CreateCylinder("lampFoot", { height: 0.12, diameter: 0.95, tessellation: 24 }, scene), dark, 0.06);
    add(CreateCylinder("lampStem", { height: 2.7, diameter: 0.085, tessellation: 12 }, scene), brass, 1.4);
    const shade = add(CreateCylinder("lampShade", { height: 0.65, diameterTop: 0.7, diameterBottom: 1.4, tessellation: 32 }, scene), linen, 2.72);
    shade.rotation.z = -0.075;
    this.bulb = add(CreateSphere("lampFilament", { diameter: 0.24, segments: 12 }, scene), filament, 2.48);
    this.light = new PointLight("lampWarmth", Vector3.Zero(), scene); this.light.parent = this.bulb;
    this.light.diffuse = Color3.FromHexString("#FFD99A"); this.light.specular = Color3.Black();
    this.light.intensity = 1.6; this.light.range = assets ? 12 : 22;
    this.glowingMeshes = [this.bulb, shade];
    this.glowingMeshes.forEach(mesh => glow?.addIncludedOnlyMesh(mesh));
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000 || 1 / 60, 0.1);
      this.light.intensity += (this.targetWarmth - this.light.intensity) * (1 - Math.exp(-dt));
      this.updateEmission();
    });
    if (assets) void this.upgrade(assets).catch(error => {
      if (!this.disposed) console.warn("The optional lamp model could not be prepared.", error);
    });
  }
  private async upgrade(assets: HeroAssetLibrary): Promise<void> {
    const imported = await assets.instantiate("lamp", "bedsideLamp");
    if (!imported) return;
    if (this.disposed) { imported.dispose(); return; }
    const socket = imported.findNode("lampWarmthSocket");
    const filament = imported.findNode("lampFilament");
    const shades = imported.meshes.filter(mesh => [...imported.nodes.entries()].some(([name,node]) => node === mesh && name.startsWith("lampShade")));
    if (!(socket instanceof TransformNode) || !filament || !shades.length) {
      imported.dispose(); return;
    }
    imported.root.parent = this.root;
    this.light.parent = socket; this.light.position.setAll(0);
    this.glowingMeshes.forEach(mesh => this.glow?.removeIncludedOnlyMesh(mesh));
    this.fallbackRoot.dispose(); this.surfaces.forEach(surface => surface.dispose());
    this.surfaces = []; this.meshes = [];
    this.imported = imported;
    this.glowingMeshes = imported.meshes.filter(mesh => mesh === filament || shades.includes(mesh)) as Mesh[];
    this.glowingMeshes.forEach(mesh => { mesh.metadata = { ...mesh.metadata, fadingLampGlow: mesh === filament ? 1 : 0.45 }; });
    this.glowingMeshes.forEach(mesh => this.glow?.addIncludedOnlyMesh(mesh));
    const emissiveSurfaces = (meshes: typeof imported.meshes) => [...new Set(meshes.map(mesh => mesh.material))]
      .filter((surface): surface is Material & { emissiveColor: Color3 } => !!surface && "emissiveColor" in surface);
    this.shadeSurfaces = emissiveSurfaces(shades);
    this.filamentSurfaces = emissiveSurfaces(imported.meshes.filter(mesh => mesh === filament));
    imported.meshes.forEach(mesh => { mesh.isPickable = false; mesh.visibility = this.visible; });
    this.updateEmission();
    imported.root.setEnabled(true);
  }
  setVisibility(value: number): void {
    const amount = bounded(value); this.visible = amount;
    this.meshes.forEach(mesh => { mesh.visibility = amount; });
    this.imported?.meshes.forEach(mesh => { mesh.visibility = amount; });
    this.targetWarmth = amount * 1.6;
    if (this.reducedMotion) { this.light.intensity = this.targetWarmth; this.updateEmission(); }
  }
  setWarmth(trust: number): void {
    this.targetWarmth = 1.35 + bounded(trust / 5) * 0.45;
    if (this.reducedMotion) { this.light.intensity = this.targetWarmth; this.updateEmission(); }
  }
  setIntensity(value: number): void {
    this.targetWarmth = Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1.6;
    if (this.reducedMotion) { this.light.intensity = this.targetWarmth; this.updateEmission(); }
  }
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) { this.light.intensity = this.targetWarmth; this.updateEmission(); }
  }
  private updateEmission(): void {
    this.shadeSurfaces.forEach(surface => surface.emissiveColor = palette.brass.scale(this.light.intensity * 0.325));
    this.filamentSurfaces.forEach(surface => surface.emissiveColor = Color3.FromHexString("#FFE4A0").scale(this.light.intensity / 1.6));
  }
  updatePosition(position: Vector3): void { this.root.position.copyFrom(position); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.glowingMeshes.forEach(mesh => this.glow?.removeIncludedOnlyMesh(mesh));
    this.light.dispose(); this.imported?.dispose(); this.root.dispose(); this.surfaces.forEach(surface => surface.dispose());
  }
}
