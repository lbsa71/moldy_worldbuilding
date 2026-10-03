import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FadingSymbol, material, palette } from "./VisualStyle";
export class GeometricShape extends FadingSymbol {
  constructor(scene: Scene, position: Vector3, rotation = Vector3.Zero()) {
    super(scene, "doorwayMemory", position, rotation, 0.04);
    const surface = material(scene, "doorwayBone", palette.blue, 0.16);
    this.line("unfinishedDoorway", [new Vector3(-1.1,0,0),new Vector3(-1.1,3.2,0),new Vector3(1.1,3.2,0),new Vector3(1.1,0.9,0)], surface, 0.045);
    this.line("doorwayEcho", [new Vector3(-1.3,0.25,-0.25),new Vector3(-1.3,3.45,-0.25),new Vector3(0.1,3.45,-0.25)], surface, 0.013);
  }
}
