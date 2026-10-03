import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { material, palette } from "./VisualStyle";

export class TerrainSystem {
  public terrain: Mesh;
  private surface: StandardMaterial;
  private stoneTexture: RawTexture;
  private readonly size = 220;
  private readonly subdivisions = 88;
  private heights: Float32Array;
  constructor(private scene: Scene) {
    this.terrain = CreateGround("slateBasin", { width: this.size, height: this.size, subdivisions: this.subdivisions, updatable: false }, scene);
    const positions = this.terrain.getVerticesData(VertexBuffer.PositionKind)!;
    this.heights = new Float32Array(positions.length / 3);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], z = positions[i + 2];
      const distance = Math.hypot(x, z);
      // The room's center is quiet; the landscape gathers into distant folds.
      const ripple = Math.sin(x * 0.055) * Math.cos(z * 0.06) * 0.55;
      const rim = Math.pow(Math.max(0, distance - 32) / 60, 2) * 2.2;
      positions[i + 1] = ripple + rim;
      this.heights[i / 3] = positions[i + 1];
    }
    this.terrain.setVerticesData(VertexBuffer.PositionKind, positions);
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, this.terrain.getIndices()!, normals);
    this.terrain.setVerticesData(VertexBuffer.NormalKind, normals);
    this.surface = material(scene, "slateGround", palette.stone, 0.025);
    // Periodic mineral strata give stone a quiet grain without unseeded noise.
    const textureSize = 128;
    const pixels = new Uint8Array(textureSize * textureSize * 4);
    for (let y = 0; y < textureSize; y++) for (let x = 0; x < textureSize; x++) {
      const u = x / textureSize * Math.PI * 2, v = y / textureSize * Math.PI * 2;
      const stratum = Math.sin(u * 3 + Math.sin(v) * 0.7);
      const vein = Math.pow(Math.max(0, Math.cos(u * 6 + Math.sin(v * 2) * 0.5)), 18);
      const value = Math.round(218 + stratum * 11 - vein * 20);
      const offset = (y * textureSize + x) * 4;
      pixels[offset] = value; pixels[offset + 1] = value; pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
    // WebGPU requires a supported four-channel texture format.
    this.stoneTexture = RawTexture.CreateRGBATexture(pixels, textureSize, textureSize, scene, true, false);
    this.stoneTexture.name = "proceduralSlateStrata";
    this.stoneTexture.uScale = this.stoneTexture.vScale = 28;
    this.surface.diffuseTexture = this.stoneTexture;
    this.terrain.material = this.surface; this.terrain.isPickable = true;
    this.terrain.refreshBoundingInfo(); this.terrain.computeWorldMatrix(true);
  }
  async waitForReady(): Promise<void> { /* Procedural geometry is immediately available. */ }
  getHeightAtPoint(x: number, z: number): number {
    const half = this.size / 2;
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > half || Math.abs(z) > half) return 0;
    const gridX = (x + half) / this.size * this.subdivisions;
    // Babylon ground vertex rows descend from positive z.
    const gridZ = (half - z) / this.size * this.subdivisions;
    const x0 = Math.min(this.subdivisions - 1, Math.floor(gridX));
    const z0 = Math.min(this.subdivisions - 1, Math.floor(gridZ));
    const tx = gridX - x0, tz = gridZ - z0, stride = this.subdivisions + 1;
    const a = this.heights[z0 * stride + x0], b = this.heights[z0 * stride + x0 + 1];
    const c = this.heights[(z0 + 1) * stride + x0], d = this.heights[(z0 + 1) * stride + x0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }
  getNormalAtPoint(x: number, z: number): Vector3 {
    const e = 0.1;
    return new Vector3(this.getHeightAtPoint(x-e,z)-this.getHeightAtPoint(x+e,z), 2*e, this.getHeightAtPoint(x,z-e)-this.getHeightAtPoint(x,z+e)).normalize();
  }
  dispose(): void { this.terrain.dispose(); this.surface.dispose(); this.stoneTexture.dispose(); }
}
