import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateRibbon } from "@babylonjs/core/Meshes/Builders/ribbonBuilder";
import { FadingSymbol, material, palette } from "./VisualStyle";
export class MemoryProp extends FadingSymbol {
  constructor(scene: Scene, kind: "chair" | "cup" | "rail", position: Vector3, rotation = Vector3.Zero()) {
    super(scene, `${kind}Memory`, position, rotation);
    const bone = material(scene, `${kind}Bone`, palette.bone, 0.08);
    const brass = material(scene, `${kind}Brass`, palette.brass, 0.04);
    if (kind === "chair") {
      const seat = this.add(CreateBox("chairSeat", { width: 1.15, height: 0.12, depth: 1.1 }, scene), bone); seat.position.y = 0.85;
      for (const x of [-0.48,0.48]) for (const z of [-0.44,0.44]) this.line("chairLeg", [new Vector3(x,0,z),new Vector3(x,z < 0 ? 2.05 : 0.84,z)], brass, 0.035);
      this.line("chairBack", [new Vector3(-0.48,2.05,-0.44),new Vector3(0.48,2.05,-0.44)], brass, 0.045);
      this.line("chairBackLower", [new Vector3(-0.48,1.65,-0.44),new Vector3(0.48,1.65,-0.44)], bone, 0.04);
    } else if (kind === "cup") {
      const table = this.add(CreateCylinder("bedsideTable", { height: 0.09, diameter: 1.1, tessellation: 20 }, scene), brass); table.position.y = 0.85;
      this.line("tableStem", [Vector3.Zero(),new Vector3(0,0.8,0)], brass, 0.04);
      const glaze = material(scene, "cupBlueGlaze", palette.blue, 0.12);
      const slices: Vector3[][] = [];
      const rim: Vector3[] = [];
      for (let i = 0; i < 40; i++) {
        const angle = i / 40 * Math.PI * 2;
        const difference = Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2));
        const chip = Math.max(0, 1 - Math.abs(difference) / 0.22) * 0.055;
        const point = (radius: number, y: number) => new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        // The profile returns down the inner wall; the top stays genuinely open.
        slices.push([point(0,0),point(0.135,0),point(0.17,0.32-chip),point(0.145,0.32-chip),point(0.12,0.045),point(0,0.045)]);
        rim.push(point(0.1575,0.32-chip));
      }
      const cup = this.add(CreateRibbon("rememberedCup", { pathArray: slices, closeArray: true }, scene), glaze); cup.position.y = 0.9;
      rim.push(rim[0].clone());
      const lip = this.line("cupRimChip", rim, bone, 0.009); lip.position.y = 0.9;
      const handle = this.add(CreateTorus("cupHandle", { diameter: 0.18, thickness: 0.035, tessellation: 12 }, scene), glaze); handle.rotation.x = Math.PI/2; handle.position.set(0.22,1.07,0);
    } else {
      this.line("railFrame", [new Vector3(-1.8,0,0),new Vector3(-1.8,1.25,0),new Vector3(1.8,1.25,0),new Vector3(1.8,0,0)], bone, 0.045);
      this.line("railLower", [new Vector3(-1.8,0.75,0),new Vector3(1.8,0.75,0)], brass, 0.035);
    }
  }
}
