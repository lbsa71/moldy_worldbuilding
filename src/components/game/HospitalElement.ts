import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { FadingSymbol, material, palette } from "./VisualStyle";
export class HospitalElement extends FadingSymbol {
  constructor(scene: Scene, position: Vector3, rotation = Vector3.Zero(), includeRail = true) {
    super(scene, "bedsideMemory", position, rotation);
    const metal = material(scene, "bedRailBone", palette.bone, 0.06);
    const cloth = material(scene, "memoryCurtain", palette.blue); cloth.alpha = 0.24;
    if (includeRail) {
      this.line("bedRail", [new Vector3(-1.7,0.15,0),new Vector3(-1.7,1.45,0),new Vector3(1.7,1.45,0),new Vector3(1.7,0.15,0)], metal, 0.045);
      for (const x of [-1.05,-0.35,0.35,1.05]) this.line("railVertical", [new Vector3(x,0.6,0),new Vector3(x,1.4,0)], metal, 0.025);
    }
    this.line("curtainFrame", [new Vector3(-2,0,-0.8),new Vector3(-2,3.7,-0.8),new Vector3(1,3.7,-0.8)], metal, 0.025);
    const curtain = this.add(CreatePlane("partialCurtain", { width: 1.6, height: 2.8 }, scene), cloth); curtain.position.set(-1.05,2.1,-0.8);
  }
}
