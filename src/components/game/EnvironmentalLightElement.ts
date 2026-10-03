import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { FadingSymbol, material, palette } from "./VisualStyle";
/** A remembered strip of clinical light; no extra global light. */
export class EnvironmentalLightElement extends FadingSymbol {
  constructor(scene: Scene, position: Vector3) {
    super(scene, "lightMemory", position);
    const strip = this.add(CreateBox("clinicalLight", { width: 2.8, height: 0.035, depth: 0.12 }, scene), material(scene, "clinicalIvory", palette.ivory, 0.6)); strip.position.y = 3.3;
  }
}
