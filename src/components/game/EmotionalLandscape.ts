import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { material, palette } from "./VisualStyle";

/** Coordinates are narrative places, not a collection of interchangeable scenery. */
export const JOURNEY_STATIONS = [
  { name: "lamp", x: 0, z: 0 }, { name: "chair", x: 4, z: -2 },
  { name: "cup", x: 9, z: 3 }, { name: "rail", x: 14, z: 7 },
  { name: "hand", x: 17, z: 9 }, { name: "contradiction", x: 22, z: 6 },
  { name: "boundary", x: 25, z: 1 }, { name: "quiet", x: 21, z: -5 },
  { name: "recollection", x: 16, z: -7 }, { name: "preparation", x: 8, z: -3 },
  { name: "decision", x: 3, z: 0 }, { name: "carry", x: 30, z: -12 },
] as const;

type Point = { x: number; z: number };
const ROUTE: readonly (readonly [Point, Point])[] = JOURNEY_STATIONS.slice(0, 11)
  .slice(1).map((point, index) => [JOURNEY_STATIONS[index], point] as const);
const WALKWAYS = [...ROUTE, [JOURNEY_STATIONS[10], JOURNEY_STATIONS[0]], [JOURNEY_STATIONS[10], JOURNEY_STATIONS[11]]] as const;

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}
function segmentDistance(x: number, z: number, a: Point, b: Point): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

/** Level pads accommodate native-meter props and branch arrivals up to 1.6 m away.
 * The connective paths are level too; folds rise outside the walking footprint. */
export function emotionalGroundHeight(x: number, z: number): number {
  let relief = 1;
  for (const point of JOURNEY_STATIONS) relief = Math.min(relief, smoothstep(3.6, 5.3, Math.hypot(x - point.x, z - point.z)));
  for (const [a, b] of WALKWAYS) relief = Math.min(relief, smoothstep(2.4, 4.2, segmentDistance(x, z, a, b)));
  const distance = Math.hypot(x - 13, z - 1);
  const distantRise = Math.pow(Math.max(0, distance - 28) / 65, 2) * 2.1;
  const folds = 0.35 + Math.sin(x * 0.085 + z * 0.035) * 0.23 + Math.cos(z * 0.13) * 0.14;
  const shelterBank = Math.exp(-((x - 16) ** 2 / 100 + (z - 14) ** 2 / 16)) * 1.4;
  const basinRim = Math.exp(-((x - 19) ** 2 / 130 + (z + 16) ** 2 / 25)) * 0.8;
  return Math.max(0, folds + distantRise + shelterBank + basinRim) * relief;
}

export interface LandscapeSlab {
  name: string; zone: "refuge" | "approach" | "shelter" | "fissure" | "basin" | "horizon" | "trace";
  x: number; z: number; width: number; depth: number; height: number;
  angle: number; lean: number; tone: "slate" | "dark" | "bone";
}

/** Authored repetition creates broken enclosures; no frame-time or random scenery. */
export function landscapeLayout(): LandscapeSlab[] {
  const slabs: LandscapeSlab[] = [];
  const add = (zone: LandscapeSlab["zone"], x: number, z: number, width: number, height: number,
    angle = 0, lean = 0, depth = 0.65, tone: LandscapeSlab["tone"] = "slate") => {
    slabs.push({ name: `landscape_${zone}_${slabs.length}`, zone, x, z, width, depth, height, angle, lean, tone });
  };
  // Small open-front refuge: the lamp remains its only source of warmth.
  add("refuge", -4.5, 2.8, 2.8, 0.9, -0.6, 0.35);
  add("refuge", -3.6, 4.5, 2.6, 2.2, -0.25, 0.12);
  add("refuge", -0.5, 5.3, 2.8, 2.7, 0.08, -0.08);
  add("refuge", 2.7, 5.5, 2.3, 1.1, 0.25, -0.34);
  add("refuge", -4.6, -1.3, 2.3, 0.35, 1.1, 0, 0.7);
  // Separate plates on the approach reveal their parallax as the listener moves.
  for (let i = 0; i < 6; i++) add("approach", 4.8 + i * 1.7, 8.8 + i * 0.65, 1.35,
    1.3 + (i % 3) * 0.5, -0.2 + i * 0.09, 0.13, 0.3);
  // The intimate hand station is backed by a partial crescent, never a full room.
  for (let i = 0; i < 6; i++) add("shelter", 12.2 + i * 1.85, 14.2 + Math.sin(i * 0.65) * 0.8,
    1.7, 2.8 + Math.sin(i * 0.7) * 0.55, -0.18 + i * 0.075, -0.15, 0.42);
  add("shelter", 23.3, 11.6, 2.1, 3.1, 0.72, -0.18);
  // Opposing edges lean into a seam. South remains open for camera and passage.
  for (let i = 0; i < 4; i++) {
    const x = 21.9 + i * 1.1, z = 6.3 - i * 1.8;
    add("fissure", x + 3.9, z + 2.35, 2.1, 4.8 - i * 0.25, 1.03, -0.5, 0.48, "dark");
    // The last opposing plate is absent: that break opens the path toward quiet.
    if (i < 3) add("fissure", x - 3.9, z - 2.35, 1.65, 2.4 - i * 0.25, 1.03, 0.28, 0.38);
  }
  // Quiet opens into a low broken bowl; no southern wall blocks its horizon.
  const basinEdges = [[11,-10], [13,-12.4], [16,-14.2], [19.5,-15], [23,-14.6], [26,-16], [33.8,-15.5], [36,-11]];
  basinEdges.forEach(([x,z], i) => add("basin", x, z, 2.7, 0.45 + (i % 3) * 0.18,
    -0.6 + i * 0.22, 0, 0.8));
  // The outward ending passes between widely separated remnants, into open air.
  add("basin", 34.5, -7.5, 2.4, 1.4, 0.8, 0.08);
  const horizon = [[-19,21],[-13,28],[-5,32],[5,29],[14,31],[25,29],[34,24],[41,16],[44,6],[44,-8],[40,-25],[28,-30]];
  horizon.forEach(([x,z], i) => add("horizon", x, z, 3.2 + (i % 3), 3.1 + (i % 4) * 0.9,
    i * 0.17 - 0.5, (i % 2 ? 1 : -1) * 0.35, 0.55, "dark"));
  // Ground-level bone seams describe thresholds without arrows or glowing paths.
  const traces = [[-1.8,-3.9],[3,-5.8],[7,0],[11,5.5],[15.5,10.8],[24,0],[22,-8.6],[16,-10.8],[9,-6.3],[26,-10.2],[31,-15.8]];
  traces.forEach(([x,z], i) => add("trace", x, z, 1.7 + (i % 3) * 0.4, 0.018,
    0.3 + i * 0.43, 0, 0.045, "bone"));
  return slabs;
}

/** Shared flat-shaded slate geometry, grounded against the actual rendered height. */
export class EmotionalLandscape {
  private meshes: Mesh[] = [];
  private surfaces: StandardMaterial[];
  constructor(scene: Scene, heightAt: (x: number, z: number) => number, stoneTexture?: BaseTexture) {
    this.surfaces = [
      material(scene, "landscapeSlate", palette.slate.scale(0.55), 0.015),
      material(scene, "landscapeDarkSlate", palette.stone.scale(0.58), 0.012),
      material(scene, "landscapeBoneSeam", palette.bone.scale(0.45), 0.035),
    ];
    if (stoneTexture) { this.surfaces[0].diffuseTexture = stoneTexture; this.surfaces[1].diffuseTexture = stoneTexture; }
    for (const [slabIndex, slab] of landscapeLayout().entries()) {
      const mesh = new Mesh(slab.name, scene);
      const w = slab.width / 2, d = slab.depth / 2, h = slab.height;
      const chip = 0.5 + (slabIndex % 4) * 0.09;
      const profile = [[-w,0],[w,0],[w * chip + slab.lean,h * 0.72],
        [w * (slabIndex % 2 ? -0.22 : 0.25) + slab.lean,h],[-w * 0.7 + slab.lean,h * 0.82]];
      const corners = [-1,1].flatMap(side => profile.map(([x,y]) => [x,y,side * d * (y > 0 ? 0.65 : 1)]));
      const faces = [[0,1,2,3,4],[9,8,7,6,5], ...profile.map((_, i) => [i,i+5,(i+1)%5+5,(i+1)%5])];
      const positions: number[] = [], indices: number[] = [], normals: number[] = [], uvs: number[] = [];
      faces.forEach(face => {
        const base = positions.length / 3;
        face.forEach(index => {
          const point = corners[index]; positions.push(...point);
          // Shared terrain texture scales by 28; these UVs retain meter-sized strata.
          uvs.push((point[0] + point[2]) / 112, point[1] / 112);
        });
        for (let i = 1; i < face.length - 1; i++) indices.push(base, base+i+1, base+i);
      });
      // Explicit outward normals: Babylon's default normal cross product is left handed.
      VertexData.ComputeNormals(positions, indices, normals, { useRightHandedSystem: true });
      const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs; data.applyToMesh(mesh);
      const cos = Math.cos(slab.angle), sin = Math.sin(slab.angle);
      const footHeights = [corners[0],corners[1],corners[5],corners[6]].map(([x,,z]) => heightAt(slab.x + x * cos + z * sin, slab.z - x * sin + z * cos));
      // Embed the foot in the lowest supporting point, preventing hovering edges.
      mesh.position.set(slab.x, Math.min(...footHeights) - 0.06, slab.z);
      // Thin threshold seams must remain above the floor, rather than buried in it.
      if (slab.zone === "trace") mesh.position.y = heightAt(slab.x, slab.z) + 0.008;
      mesh.rotation.y = slab.angle;
      mesh.material = this.surfaces[slab.tone === "dark" ? 1 : slab.tone === "bone" ? 2 : 0];
      mesh.isPickable = false; mesh.freezeWorldMatrix();
      mesh.metadata = { landscapeZone: slab.zone };
      this.meshes.push(mesh);
    }
  }
  dispose(): void { this.meshes.forEach(mesh => mesh.dispose()); this.surfaces.forEach(surface => surface.dispose()); }
}
