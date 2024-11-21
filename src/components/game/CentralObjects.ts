import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  Animation,
} from "@babylonjs/core";
import { LightingSystem } from "./LightingSystem";

export class CentralObjects {
  private sphere: Mesh;
  private torusKnot: Mesh;

  constructor(
    private scene: Scene,
    private lightingSystem: LightingSystem
  ) {
    this.sphere = this.createCentralSphere();
    this.torusKnot = this.createTorusKnot();
  }

  private createCentralSphere(): Mesh {
    const sphere = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2, segments: 32 },
      this.scene
    );
    sphere.position.y = 1;

    const sphereMaterial = new PBRMaterial("sphereMaterial", this.scene);
    sphereMaterial.metallic = 1.0;
    sphereMaterial.roughness = 0.1;
    sphereMaterial.albedoColor = new Color3(0.9, 0.9, 0.9);
    sphere.material = sphereMaterial;

    this.lightingSystem.addShadowCaster(sphere);

    return sphere;
  }

  private createTorusKnot(): Mesh {
    const torusKnot = MeshBuilder.CreateTorusKnot(
      "torusKnot",
      {
        radius: 2,
        tube: 0.5,
        radialSegments: 128,
        tubularSegments: 64,
      },
      this.scene
    );
    torusKnot.position.y = 5;

    const material = new PBRMaterial("torusKnotMaterial", this.scene);
    material.metallic = 0.8;
    material.roughness = 0.2;
    material.albedoColor = new Color3(0.8, 0.8, 0.9);
    material.emissiveColor = new Color3(0.2, 0.2, 0.3);
    torusKnot.material = material;

    this.lightingSystem.addShadowCaster(torusKnot);

    Animation.CreateAndStartAnimation(
      "torusKnotRotation",
      torusKnot,
      "rotation",
      30,
      120,
      Vector3.Zero(),
      new Vector3(0, Math.PI * 2, 0),
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    return torusKnot;
  }
}
