import {
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsMotionType,
  Mesh,
  VertexData,
  Ray,
  MeshBuilder,
  VertexBuffer,
} from "@babylonjs/core";

export class TerrainSystem {
  public terrain: Mesh;
  private physicsAggregate?: PhysicsAggregate;
  private size = 100;
  private subdivisions = 100;
  private heightData: Float32Array;
  private ready: Promise<void>;

  constructor(private scene: Scene) {
    // Generate height data first
    this.heightData = this.generateHeightData();

    // Create terrain mesh and wait for it to be ready
    this.terrain = this.createTerrain();

    // Store the ready promise
    this.ready = new Promise<void>((resolve) => {
      // Wait for the next frame to ensure mesh is fully created
      scene.executeWhenReady(() => {
        // Now set up physics
        this.setupPhysics();
        resolve();
      });
    });
  }

  public async waitForReady(): Promise<void> {
    return this.ready;
  }

  private generateHeightData(): Float32Array {
    const dataSize = this.subdivisions + 1;
    const heightData = new Float32Array(dataSize * dataSize);

    for (let z = 0; z <= this.subdivisions; z++) {
      for (let x = 0; x <= this.subdivisions; x++) {
        const xPos = (x / this.subdivisions - 0.5) * this.size;
        const zPos = (z / this.subdivisions - 0.5) * this.size;

        // Create organic-looking height using multiple sine waves
        let height = 0;
        height += Math.sin(xPos * 0.1) * 2;
        height += Math.sin(zPos * 0.1) * 2;
        height += Math.sin((xPos + zPos) * 0.15) * 1.5;
        height += Math.sin(Math.sqrt(xPos * xPos + zPos * zPos) * 0.2) * 2;
        height = Math.max(0, height); // Keep height positive

        heightData[z * dataSize + x] = height;
      }
    }

    return heightData;
  }

  private createTerrain(): Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Create vertices
    for (let z = 0; z <= this.subdivisions; z++) {
      for (let x = 0; x <= this.subdivisions; x++) {
        const xPos = (x / this.subdivisions - 0.5) * this.size;
        const zPos = (z / this.subdivisions - 0.5) * this.size;
        const height = this.heightData[z * (this.subdivisions + 1) + x];

        positions.push(xPos, height, zPos);
        uvs.push(x / this.subdivisions, z / this.subdivisions);
      }
    }

    // Create indices
    for (let z = 0; z < this.subdivisions; z++) {
      for (let x = 0; x < this.subdivisions; x++) {
        const baseIdx = z * (this.subdivisions + 1) + x;
        indices.push(
          baseIdx,
          baseIdx + 1,
          baseIdx + this.subdivisions + 1,
          baseIdx + 1,
          baseIdx + this.subdivisions + 2,
          baseIdx + this.subdivisions + 1
        );
      }
    }

    // Create mesh
    const terrain = new Mesh("terrain", this.scene);
    const vertexData = new VertexData();

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;

    // Compute normals
    VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;

    vertexData.applyToMesh(terrain);

    // Create material
    const material = new StandardMaterial("terrainMaterial", this.scene);
    material.diffuseColor = new Color3(0.2, 0.3, 0.1);
    material.specularColor = new Color3(0.1, 0.15, 0.05);
    material.emissiveColor = new Color3(0.02, 0.03, 0.01);
    material.ambientColor = new Color3(0.1, 0.15, 0.05);
    terrain.material = material;

    // Ensure the terrain mesh is static and won't move
    terrain.isPickable = true;
    terrain.receiveShadows = true;

    return terrain;
  }

  private setupPhysics(): void {
    // Create physics with the actual terrain mesh
    this.physicsAggregate = new PhysicsAggregate(
      this.terrain,
      PhysicsShapeType.MESH,
      {
        mass: 0,
        restitution: 0.0,
        friction: 0.3,
      },
      this.scene
    );

    // Set as static
    this.physicsAggregate.body.setMotionType(PhysicsMotionType.STATIC);

    // Ensure the physics body is properly positioned
    this.physicsAggregate.body.disablePreStep = false;

    console.log("Terrain physics initialized");
  }

  public getHeightAtPoint(x: number, z: number): number {
    // Convert world coordinates to heightmap indices
    const halfSize = this.size / 2;
    const xIndex = Math.floor(((x + halfSize) / this.size) * this.subdivisions);
    const zIndex = Math.floor(((z + halfSize) / this.size) * this.subdivisions);

    // Ensure indices are within bounds
    if (
      xIndex >= 0 &&
      xIndex <= this.subdivisions &&
      zIndex >= 0 &&
      zIndex <= this.subdivisions
    ) {
      return this.heightData[zIndex * (this.subdivisions + 1) + xIndex];
    }

    return 0;
  }

  public getNormalAtPoint(x: number, z: number): Vector3 {
    const ray = new Ray(new Vector3(x, 1000, z), Vector3.Down(), 2000);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);
    return hit?.getNormal() || Vector3.Up();
  }
}
