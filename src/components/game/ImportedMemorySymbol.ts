import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Node } from "@babylonjs/core/node";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { FadingSymbol, material } from "./VisualStyle";
import type { HeroAssetLibrary, HeroAssetInstance } from "./HeroAssetLibrary";

export type ImportedMemoryKind = "chair" | "cup" | "rail" | "hospital";
type AssetSource = Pick<HeroAssetLibrary, "instantiate">;

/** Retains the procedural memory until a validated original asset is ready. */
export class ImportedMemorySymbol extends FadingSymbol {
  readonly ready: Promise<void>;
  private instance: HeroAssetInstance | null = null;
  private fallback: FadingSymbol | null;
  private closed = false;

  constructor(scene: Scene, private kind: ImportedMemoryKind, position: Vector3, rotation: Vector3,
    library: AssetSource, fallback: FadingSymbol) {
    super(scene, `${kind}ImportedMemory`, position, rotation);
    this.fallback = fallback;
    fallback.setScale(0.55);
    fallback.updatePosition(position);
    fallback.setRotationY(rotation.y);
    const asset = kind === "rail" || kind === "hospital" ? "bedside" : kind;
    this.ready = Promise.resolve().then(() => library.instantiate(asset, `${kind}Memory`))
      .then(instance => this.accept(instance))
      .catch(() => { /* Optional asset failure keeps the working procedural memory. */ });
  }

  private selectedMeshes(instance: HeroAssetInstance): Set<AbstractMesh> {
    const geometry = instance.meshes.filter(mesh => mesh.getTotalVertices() > 0);
    if (this.kind === "chair" || this.kind === "cup") return new Set(geometry);
    const selected = new Set<AbstractMesh>();
    const matches = this.kind === "rail" ? /^(bedRail|railUpright)/ : /^(curtainFrame|partialCurtain)/;
    const include = (node: Node) => {
      for (const candidate of [node, ...node.getDescendants(false)]) {
        if (geometry.includes(candidate as AbstractMesh)) selected.add(candidate as AbstractMesh);
      }
    };
    for (const [originalName, node] of instance.nodes) if (matches.test(originalName)) include(node);
    return selected;
  }

  private accept(instance: HeroAssetInstance | null): void {
    if (!instance) return;
    const meshCount = this.meshes.length, materialCount = this.materials.length;
    const children = new Set(this.root.getChildren());
    try {
      this.activate(instance);
    } catch {
      // A malformed hierarchy must not leak an instance or displace the fallback.
      this.instance = null;
      try { instance.dispose(); } finally {
        this.meshes.splice(meshCount).forEach(mesh => { if (!mesh.isDisposed()) mesh.dispose(); });
        this.materials.splice(materialCount).forEach(surface => surface.dispose());
        this.root.getChildren().filter(child => !children.has(child)).forEach(child => child.dispose());
      }
    }
  }

  private activate(instance: HeroAssetInstance): void {
    if (this.closed || this.scene.isDisposed) { instance.dispose(); return; }
    const selected = this.selectedMeshes(instance);
    if (!selected.size) { instance.dispose(); return; }
    this.instance = instance;
    const alignment = new TransformNode(`${this.kind}AssetAlignment`, this.scene);
    alignment.parent = this.root;
    instance.root.parent = alignment;
    if (this.kind === "chair") {
      const facing = instance.findNode("chairFacingSocket");
      if (facing instanceof TransformNode) {
        instance.root.computeWorldMatrix(true); facing.computeWorldMatrix(true);
        const inverse = instance.root.getWorldMatrix().clone().invert();
        const forward = Vector3.TransformCoordinates(facing.getAbsolutePosition(), inverse);
        if (Math.hypot(forward.x, forward.z) > 0.001) alignment.rotation.y = -Math.atan2(forward.x, forward.z);
      }
    }
    if (this.kind === "cup") {
      this.createCupTable();
      instance.root.position.y += 0.48;
    }
    for (const mesh of instance.meshes) {
      mesh.isPickable = false;
      // Conversion/pivot nodes can be empty meshes: keep their hierarchy enabled.
      if (mesh.getTotalVertices() === 0) continue;
      if (!selected.has(mesh)) { mesh.setEnabled(false); continue; }
      mesh.visibility = this.visibility;
      mesh.setEnabled(this.visibility > 0.002 || this.targetVisibility > 0);
      this.meshes.push(mesh);
    }
    // All latest state lives on the stable outer root, including an in-progress turn.
    instance.root.setEnabled(true);
    this.fallback?.dispose();
    this.fallback = null;
  }

  private createCupTable(): void {
    const surface = material(this.scene, "importedCupTableWood", Color3.FromHexString("#55463A"), 0.035);
    const top = this.add(CreateCylinder("cupTableTop", { height: 0.03, diameter: 0.45, tessellation: 24 }, this.scene), surface);
    top.position.y = 0.465;
    const stem = this.add(CreateCylinder("cupTableStem", { height: 0.45, diameter: 0.025, tessellation: 12 }, this.scene), surface);
    stem.position.y = 0.225;
    const foot = this.add(CreateCylinder("cupTableFoot", { height: 0.018, diameter: 0.23, tessellation: 20 }, this.scene), surface);
    foot.position.y = 0.009;
  }

  override setVisibility(value: number): void {
    if (this.closed) return;
    super.setVisibility(value); this.fallback?.setVisibility(value);
  }
  override setRotationY(value: number): void {
    if (this.closed) return;
    super.setRotationY(value); this.fallback?.setRotationY(value);
  }
  override setReducedMotion(value: boolean): void {
    if (this.closed) return;
    super.setReducedMotion(value); this.fallback?.setReducedMotion(value);
  }
  override updatePosition(position: Vector3): void {
    if (this.closed) return;
    super.updatePosition(position); this.fallback?.updatePosition(position);
  }
  override dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.fallback?.dispose(); this.fallback = null;
    this.instance?.dispose(); this.instance = null;
    super.dispose();
  }
}
