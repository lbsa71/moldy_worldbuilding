import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  StandardMaterial,
  Texture,
  Color3,
  DirectionalLight,
} from "@babylonjs/core";
import type { SceneObjectPresentation } from "../../game/content/sceneObjectPlanner";
import {
  applySceneObjectMaterial,
  setProfileVisibilityAlpha,
  toColor3,
} from "./sceneMaterial";

export class HandMotif {
  private mesh: Mesh;
  private animation: Animation;
  private material: StandardMaterial;
  private directionalLight: DirectionalLight;
  private baseAlpha = 0.52;
  private presentationLightIntensity = 1;

  constructor(scene: Scene, position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0)) {
    this.material = new StandardMaterial("handMotifMaterial", scene);
    this.material.diffuseTexture = new Texture("assets/hand_motif.png", scene);
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.specularColor = Color3.Black();
    this.material.ambientColor = new Color3(0.06, 0.13, 0.15);
    this.material.emissiveColor = new Color3(0.06, 0.2, 0.26);
    this.material.diffuseColor = new Color3(0.24, 0.56, 0.62);
    this.material.alpha = this.baseAlpha;
    this.material.backFaceCulling = false;

    this.mesh = MeshBuilder.CreatePlane("handMotif", { size: 2 }, scene);
    this.mesh.position = position;
    this.mesh.rotation = rotation;
    this.mesh.material = this.material;

    this.animation = new Animation(
      "handMotifFloat",
      "position.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ frame: 0, value: position.y });
    keys.push({ frame: 60, value: position.y + 0.5 });
    keys.push({ frame: 120, value: position.y });

    this.animation.setKeys(keys);
    scene.beginDirectAnimation(this.mesh, [this.animation], 0, 120, true);

    // Create directional light
    this.directionalLight = new DirectionalLight("handMotifDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }

  setVisibility(value: number): void {
    setProfileVisibilityAlpha(this.material, this.baseAlpha, value);
    this.directionalLight.intensity =
      value > 0 ? 0.5 * value * this.presentationLightIntensity : 0;
    this.mesh.visibility = value > 0 ? 1 : 0;
  }

  applyPresentation(presentation: SceneObjectPresentation): void {
    this.presentationLightIntensity = presentation.lightIntensity;
    this.baseAlpha = presentation.material.alpha;
    applySceneObjectMaterial(this.material, presentation.material, "diffuse", {
      emissiveScale: 1.25,
    });
    this.directionalLight.diffuse = toColor3(presentation.material.accent);
    this.mesh.scaling = new Vector3(
      presentation.scale,
      presentation.scale,
      presentation.scale
    );
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
    this.directionalLight.dispose();
  }

  updatePosition(position: Vector3): void {
    this.mesh.position = position;
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }
}
