import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FadingSymbol, material, palette } from "./VisualStyle";
export class HandMotif extends FadingSymbol {
  constructor(scene: Scene, position: Vector3, rotation = Vector3.Zero()) {
    super(scene, "reachingMemory", position, rotation, 0.09);
    const surface = material(scene, "handContour", palette.ivory, 0.25);
    // An incomplete outline, with no photograph or opaque image rectangle.
    const outline = [[-0.32,-0.8],[-0.48,0.1],[-0.72,0.58],[-0.69,0.72],[-0.58,0.72],[-0.28,0.32],
      [-0.33,1.12],[-0.24,1.25],[-0.15,1.2],[-0.09,0.63],[-0.05,1.48],[0.06,1.57],
      [0.16,1.48],[0.18,0.67],[0.24,1.37],[0.35,1.44],[0.44,1.34],[0.39,0.58],
      [0.53,1.08],[0.64,1.1],[0.7,0.98],[0.58,0.13],[0.35,-0.8]];
    this.line("handOutline", outline.map(([x,y]) => new Vector3(x,y,0)), surface, 0.016);
    this.line("palmMemory", [new Vector3(-0.27,0.17,0),new Vector3(-0.02,0.04,0),new Vector3(0.25,0.14,0)], surface, 0.009);
  }
}
