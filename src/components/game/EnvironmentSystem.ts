import {
  Scene,
  Vector3,
  Color3,
  Mesh,
  StandardMaterial,
  MeshBuilder,
  Ray,
  TransformNode,
  InstancedMesh,
  Nullable,
} from "@babylonjs/core";

export class EnvironmentSystem {
  private instances: (Mesh | InstancedMesh)[] = [];
  private treeMaterial: StandardMaterial;
  private rockMaterial: StandardMaterial;
  private treeTemplate?: Mesh;
  private rockTemplate?: Mesh;

  constructor(private scene: Scene) {
    this.treeMaterial = this.createTreeMaterial();
    this.rockMaterial = this.createRockMaterial();
    this.createTemplates();
  }

  private createTreeMaterial(): StandardMaterial {
    const material = new StandardMaterial("treeMaterial", this.scene);
    material.diffuseColor = new Color3(0.1, 0.15, 0.05);
    material.specularColor = new Color3(0, 0, 0);
    material.ambientColor = new Color3(0.05, 0.07, 0.02);
    material.emissiveColor = new Color3(0.02, 0.03, 0.01);
    return material;
  }

  private createRockMaterial(): StandardMaterial {
    const material = new StandardMaterial("rockMaterial", this.scene);
    material.diffuseColor = new Color3(0.15, 0.15, 0.15);
    material.specularColor = new Color3(0.05, 0.05, 0.05);
    material.ambientColor = new Color3(0.1, 0.1, 0.1);
    return material;
  }

  private createTemplates(): void {
    // Create tree template
    const trunkHeight = 3;
    const trunk = MeshBuilder.CreateCylinder(
      "trunkTemplate",
      {
        height: trunkHeight,
        diameterTop: 0.3,
        diameterBottom: 0.4,
        tessellation: 8,
        subdivisions: 1,
      },
      this.scene
    );

    const foliage = MeshBuilder.CreateCylinder(
      "foliageTemplate",
      {
        height: trunkHeight * 2,
        diameterTop: 0.1,
        diameterBottom: 2,
        tessellation: 8,
        subdivisions: 1,
      },
      this.scene
    );

    foliage.position.y = trunkHeight * 0.5;

    // Merge tree parts
    const treePartsArray = [trunk, foliage];
    const mergedTree = Mesh.MergeMeshes(
      treePartsArray,
      true,
      true,
      undefined,
      false,
      true
    );

    if (mergedTree) {
      this.treeTemplate = mergedTree;
      this.treeTemplate.material = this.treeMaterial;
      this.treeTemplate.isVisible = false;
    }

    // Create rock template
    this.rockTemplate = MeshBuilder.CreatePolyhedron(
      "rockTemplate",
      {
        type: 1,
        size: 1,
      },
      this.scene
    );
    this.rockTemplate.material = this.rockMaterial;
    this.rockTemplate.isVisible = false;
  }

  public populate(terrain: Mesh): void {
    if (!this.treeTemplate || !this.rockTemplate) return;

    // Create fewer but more strategically placed objects
    const numObjects = 30;
    const positions: Vector3[] = this.generatePositions(numObjects, terrain);

    positions.forEach((position) => {
      if (Math.random() > 0.3) {
        this.createTreeInstance(position);
      } else {
        this.createRockInstance(position);
      }
    });
  }

  private generatePositions(count: number, terrain: Mesh): Vector3[] {
    const positions: Vector3[] = [];
    const minDistance = 5; // Minimum distance between objects

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let position: Vector3 | null = null;

      while (!position && attempts < 10) {
        const x = Math.random() * 80 - 40;
        const z = Math.random() * 80 - 40;

        // Get height at position
        const ray = new Ray(new Vector3(x, 100, z), new Vector3(0, -1, 0), 200);
        const hit = this.scene.pickWithRay(ray, (mesh) => mesh === terrain);

        if (hit?.pickedPoint) {
          const newPos = hit.pickedPoint;

          // Check distance from other objects
          const isTooClose = positions.some(
            (pos) => Vector3.Distance(pos, newPos) < minDistance
          );

          if (!isTooClose) {
            position = newPos;
          }
        }
        attempts++;
      }

      if (position) {
        positions.push(position);
      }
    }

    return positions;
  }

  private createTreeInstance(position: Vector3): void {
    if (!this.treeTemplate) return;

    const instance = this.treeTemplate.createInstance(
      "tree" + this.instances.length
    );
    instance.position = position;
    instance.rotation = new Vector3(
      Math.random() * 0.2 - 0.1,
      Math.random() * Math.PI,
      Math.random() * 0.2 - 0.1
    );
    instance.scaling = new Vector3(
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4
    );
    this.instances.push(instance);
  }

  private createRockInstance(position: Vector3): void {
    if (!this.rockTemplate) return;

    const instance = this.rockTemplate.createInstance(
      "rock" + this.instances.length
    );
    instance.position = position;
    instance.rotation = new Vector3(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    instance.scaling = new Vector3(
      1 + Math.random() * 1.5,
      0.7 + Math.random() * 1.0,
      1 + Math.random() * 1.5
    );
    this.instances.push(instance);
  }
}
