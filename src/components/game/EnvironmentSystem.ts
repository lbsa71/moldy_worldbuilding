import {
  Scene,
  Vector3,
  Color3,
  Mesh,
  StandardMaterial,
  MeshBuilder,
  Ray,
  InstancedMesh,
  AbstractMesh,
} from "@babylonjs/core";
import { Lamp } from "./Lamp";
import { HandMotif } from "./HandMotif";
import { GeometricShape } from "./GeometricShape";
import { HospitalElement } from "./HospitalElement";
import { EnvironmentalLightElement } from "./EnvironmentalLightElement";
import {
  getSceneObjectVisibility,
  planSceneObjects,
  type SceneObjectPlacement,
  type SceneObjectPresentation,
  type SceneObjectState,
} from "../../game/content/sceneObjectPlanner";
import type { NarrativeObjectType } from "../../game/content/worldDesign";

type NarrativeSceneObject = {
  type: NarrativeObjectType;
  applyPresentation?(presentation: SceneObjectPresentation): void;
  setVisibility(value: number): void;
  dispose(): void;
};

export class EnvironmentSystem {
  private instances: (Mesh | InstancedMesh)[] = [];
  private treeMaterial: StandardMaterial;
  private rockMaterial: StandardMaterial;
  private treeTemplate?: Mesh;
  private rockTemplate?: Mesh;
  private narrativeObjects: NarrativeSceneObject[] = [];
  private environmentalLightElementInstances: EnvironmentalLightElement[] = [];
  private debug: boolean = false;
  private terrain: AbstractMesh | null = null;
  private firstObjectPosition: Vector3 | null = null;

  constructor(private scene: Scene) {
    this.treeMaterial = this.createTreeMaterial();
    this.rockMaterial = this.createRockMaterial();
    this.createTemplates();
  }

  public createObjectsFromTag(
    objectNames: string[],
    terrain: AbstractMesh,
    position?: { x: number; z: number },
    state: SceneObjectState = {}
  ): void {
    if (!terrain) {
      console.error("No terrain provided to createObjectsFromTag");
      return;
    }

    this.terrain = terrain;
    this.clearNarrativeObjects();
    this.clearFirstObjectPosition();

    if (!objectNames?.length) {
      return;
    }

    const placements = planSceneObjects(
      objectNames,
      position ?? { x: 0, z: 0 },
      state
    );

    placements.forEach((placement) => {
      try {
        const adjustedPosition = this.getTerrainAdjustedPosition(placement);
        adjustedPosition.y += placement.presentation.verticalOffset;
        const instance = this.createNarrativeObject(placement, adjustedPosition);

        if (!this.firstObjectPosition) {
          this.firstObjectPosition = adjustedPosition.clone();
        }

        instance.applyPresentation?.(placement.presentation);
        instance.setVisibility(placement.visibility);
        this.narrativeObjects.push(instance);
      } catch (error) {
        console.error(`Failed to create ${placement.type}:`, error);
      }
    });
  }

  private clearNarrativeObjects(): void {
    this.narrativeObjects.forEach((object) => object.dispose());
    this.environmentalLightElementInstances.forEach((light) => light.dispose());
    this.narrativeObjects = [];
    this.environmentalLightElementInstances = [];
  }

  private getTerrainAdjustedPosition(placement: SceneObjectPlacement): Vector3 {
    const plannedPosition = new Vector3(
      placement.worldPosition.x,
      0,
      placement.worldPosition.z
    );
    const ray = new Ray(
      new Vector3(plannedPosition.x, 100, plannedPosition.z),
      new Vector3(0, -1, 0),
      200
    );
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);
    const pickedPoint = hit?.pickedPoint;

    return (pickedPoint ? pickedPoint : plannedPosition).add(new Vector3(0, 2, 0));
  }

  private createNarrativeObject(
    placement: SceneObjectPlacement,
    position: Vector3
  ): NarrativeSceneObject {
    const rotation = new Vector3(
      placement.rotation.x,
      placement.rotation.y,
      placement.rotation.z
    );

    if (placement.type === "lamp") {
      return Object.assign(new Lamp(this.scene, position, rotation), {
        type: placement.type,
      });
    }

    if (placement.type === "hand") {
      return Object.assign(new HandMotif(this.scene, position, rotation), {
        type: placement.type,
      });
    }

    if (placement.type === "geometric") {
      return Object.assign(
        new GeometricShape(
          this.scene,
          position,
          rotation,
          placement.presentation.variant
        ),
        {
          type: placement.type,
        }
      );
    }

    return Object.assign(new HospitalElement(this.scene, position, rotation), {
      type: placement.type,
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

  public populate(terrain: Mesh, _objectNames: string[]): void {
    if (!this.treeTemplate || !this.rockTemplate) return;
    this.terrain = terrain;

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
    const minDistance = 5;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let position: Vector3 | null = null;

      while (!position && attempts < 10) {
        const x = Math.random() * 80 - 40;
        const z = Math.random() * 80 - 40;

        const ray = new Ray(new Vector3(x, 100, z), new Vector3(0, -1, 0), 200);
        const hit = this.scene.pickWithRay(ray, (mesh) => mesh === terrain);

        if (hit?.pickedPoint) {
          const newPos = hit.pickedPoint;
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

  public updateObjectVisibilities(
    trust: number,
    hospital_clarity: boolean
  ): void {
    this.narrativeObjects.forEach((object) => {
      object.setVisibility(
        this.debug
          ? 1
          : getSceneObjectVisibility(object.type, {
              trust,
              hospitalClarity: hospital_clarity,
            })
      );
    });

    this.environmentalLightElementInstances.forEach((lightElement) => {
      lightElement.setVisibility(0.5);
    });
  }

  public toggleDebug(): void {
    this.debug = !this.debug;
    console.log("Debug mode:", this.debug);
  }

  public getFirstObjectPosition(): Vector3 | null {
    return this.firstObjectPosition;
  }

  public clearFirstObjectPosition(): void {
    this.firstObjectPosition = null;
  }
}
