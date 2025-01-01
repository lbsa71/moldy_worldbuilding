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
  AbstractMesh,
} from "@babylonjs/core";
import { Lamp } from "./Lamp";
import { HandMotif } from "./HandMotif";
import { GeometricShape } from "./GeometricShape";
import { HospitalElement } from "./HospitalElement";
import { EnvironmentalLightElement } from "./EnvironmentalLightElement";

export class EnvironmentSystem {
  private instances: (Mesh | InstancedMesh)[] = [];
  private treeMaterial: StandardMaterial;
  private rockMaterial: StandardMaterial;
  private treeTemplate?: Mesh;
  private rockTemplate?: Mesh;
  private lampInstances: Lamp[] = [];
  private handMotifInstances: HandMotif[] = [];
  private geometricShapeInstances: GeometricShape[] = [];
  private hospitalElementInstances: HospitalElement[] = [];
  private environmentalLightElementInstances: EnvironmentalLightElement[] = [];
  private debug: boolean = false;
  private terrain: AbstractMesh | null = null;

  constructor(private scene: Scene) {
    this.treeMaterial = this.createTreeMaterial();
    this.rockMaterial = this.createRockMaterial();
    this.createTemplates();
  }

  public createObjectsFromTag(objectNames: string[], terrain: AbstractMesh, position?: { x: number, z: number }): void {
    console.log("Creating objects from tag:", objectNames, "at position:", position);
    
    if (!terrain) {
      console.error("No terrain provided to createObjectsFromTag");
      return;
    }
    this.terrain = terrain;
    
    // Clear previous instances
    console.log("Clearing previous instances");
    this.lampInstances.forEach(lamp => lamp.dispose());
    this.handMotifInstances.forEach(hand => hand.dispose());
    this.geometricShapeInstances.forEach(shape => shape.dispose());
    this.hospitalElementInstances.forEach(hospital => hospital.dispose());
    
    this.lampInstances = [];
    this.handMotifInstances = [];
    this.geometricShapeInstances = [];
    this.hospitalElementInstances = [];

    // If no objects to create, return early
    if (!objectNames?.length) {
      console.log("No objects to create");
      return;
    }

    // Calculate spread positions around the target position
    const radius = 3; // Smaller spread radius
    const angleStep = (2 * Math.PI) / objectNames.length;
    const centerX = position?.x || 0;
    const centerZ = position?.z || 0;
    
    objectNames.forEach((objectName, index) => {
      // Calculate spread position around the center point
      const angle = angleStep * index;
      const offsetX = centerX + (radius * Math.cos(angle));
      const offsetZ = centerZ + (radius * Math.sin(angle));
      const position = new Vector3(offsetX, 0, offsetZ);
      
      // Raycast to find ground height
      const ray = new Ray(new Vector3(position.x, 100, position.z), new Vector3(0, -1, 0), 200);
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);

      const pickedPoint = hit?.pickedPoint;
      const adjustedPosition = (pickedPoint ? pickedPoint : position).add(new Vector3(0, 2, 0));


        console.log(`Creating ${objectName} at position:`, adjustedPosition);
        
        try {
          // Create random rotation for variety
          const randomRotation = new Vector3(
            Math.random() * Math.PI * 0.2 - Math.PI * 0.1, // Slight tilt on X (-0.1π to 0.1π)
            Math.random() * Math.PI * 2,                    // Full rotation on Y (0 to 2π)
            Math.random() * Math.PI * 0.2 - Math.PI * 0.1  // Slight tilt on Z (-0.1π to 0.1π)
          );

          if (objectName === 'lamp') {
            const lamp = new Lamp(this.scene, adjustedPosition, randomRotation);
            this.lampInstances.push(lamp);
          }
          if (objectName === 'hand') {
            const hand = new HandMotif(this.scene, adjustedPosition, randomRotation);
            this.handMotifInstances.push(hand);
          }
          if (objectName === 'geometric') {
            const shape = new GeometricShape(this.scene, adjustedPosition, randomRotation);
            this.geometricShapeInstances.push(shape);
          }
          if (objectName === 'hospital') {
            const hospital = new HospitalElement(this.scene, adjustedPosition, randomRotation);
            this.hospitalElementInstances.push(hospital);
          }
        } catch (error) {
          console.error(`Failed to create ${objectName}:`, error);
        }
   
    });
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

  public populate(terrain: Mesh, objectNames: string[]): void {
    if (!this.treeTemplate || !this.rockTemplate) return;
    this.terrain = terrain;

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

  private createObjectInstances(): void {
    if (!this.terrain) return;

    const objectPositions = [
      { class: Lamp, positions: [new Vector3(0, 0, 1), new Vector3(90, 20, 0)] },
      { class: HandMotif, positions: [new Vector3(10, 2, 0), new Vector3(40, 8, 0), new Vector3(60, 12, 0), new Vector3(100, 22, 0)] },
      { class: GeometricShape, positions: [new Vector3(20, 4, 0), new Vector3(30, 6, 0)] },
      { class: HospitalElement, positions: [new Vector3(70, 14, 0), new Vector3(40, 8, 0), new Vector3(100, 22, 0)] },
      { class: EnvironmentalLightElement, positions: [new Vector3(30, 6, 0), new Vector3(60, 12, 0), new Vector3(80, 16, 0)] },
    ];

    objectPositions.forEach(({ class: ObjectClass, positions }) => {
      positions.forEach(position => {
        const ray = new Ray(new Vector3(position.x, 100, position.z), new Vector3(0, -1, 0), 200);
        const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);

        if (hit?.pickedPoint) {
          const adjustedPosition = hit.pickedPoint.add(new Vector3(0, 1, 0));
          const randomRotation = new Vector3(
            Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 0.2 - Math.PI * 0.1
          );

          if (ObjectClass === Lamp) this.lampInstances.push(new Lamp(this.scene, adjustedPosition, randomRotation));
          if (ObjectClass === HandMotif) this.handMotifInstances.push(new HandMotif(this.scene, adjustedPosition, randomRotation));
          if (ObjectClass === GeometricShape) this.geometricShapeInstances.push(new GeometricShape(this.scene, adjustedPosition, randomRotation));
          if (ObjectClass === HospitalElement) this.hospitalElementInstances.push(new HospitalElement(this.scene, adjustedPosition, randomRotation));
          if (ObjectClass === EnvironmentalLightElement) this.environmentalLightElementInstances.push(new EnvironmentalLightElement(this.scene, adjustedPosition));
        }
      });
    });
  }

  public updateObjectVisibilities(trust: number, hospital_clarity: boolean): void {
    // Lamp
    this.lampInstances.forEach((lamp) => {
      lamp.setVisibility(this.debug ? 1 : 1); // Always visible
    });

    // HandMotif
    this.handMotifInstances.forEach((handMotif, index) => {
        handMotif.setVisibility(0.5);
    });

    // GeometricShape
    this.geometricShapeInstances.forEach((geometricShape) => {
      geometricShape.setVisibility(0.5);
    });

    // HospitalElement
    this.hospitalElementInstances.forEach((hospitalElement) => {
      hospitalElement.setVisibility(0.5);
    });

    // EnvironmentalLightElement
    this.environmentalLightElementInstances.forEach((lightElement) => {
      lightElement.setVisibility(0.5);
    });
  }

  public toggleDebug(): void {
    this.debug = !this.debug;
    console.log("Debug mode:", this.debug);
  }
}
