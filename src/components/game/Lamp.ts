import {
  Scene,
  Vector3,
  PointLight,
  GlowLayer,
  MeshBuilder,
  Mesh,
  Color3,
  DirectionalLight,
  StandardMaterial,
} from "@babylonjs/core";
import type { SceneObjectPresentation } from "../../game/content/sceneObjectPlanner";
import {
  applySceneObjectMaterial,
  scaleColor3,
  setProfileVisibilityAlpha,
  toColor3,
} from "./sceneMaterial";

export class Lamp {
  private light: PointLight;
  private glowLayer: GlowLayer;
  private mesh: Mesh;
  private pole: Mesh;
  private shade: Mesh;
  private base: Mesh;
  private bulbMaterial: StandardMaterial;
  private poleMaterial: StandardMaterial;
  private directionalLight: DirectionalLight;
  private bulbBaseAlpha = 0.82;
  private poleBaseAlpha = 0.92;
  private materialGlowIntensity = 1;
  private presentationLightIntensity = 1;

  constructor(scene: Scene, position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0)) {
    // Create pole
    this.pole = MeshBuilder.CreateCylinder(
      "lampPole",
      { height: 6, diameter: 0.2 },
      scene
    );
    this.pole.position = position.clone();
    this.pole.position.y += 1;
    this.pole.rotation = rotation.clone();
    this.poleMaterial = new StandardMaterial("lampPoleMaterial", scene);
    this.poleMaterial.diffuseColor = new Color3(0.16, 0.13, 0.1);
    this.poleMaterial.ambientColor = new Color3(0.06, 0.05, 0.04);
    this.poleMaterial.specularColor = new Color3(0.1, 0.08, 0.06);
    this.poleMaterial.alpha = this.poleBaseAlpha;
    this.pole.material = this.poleMaterial;

    // Create lamp mesh
    this.mesh = MeshBuilder.CreateSphere("lampMesh", { diameter: 1 }, scene);
    this.mesh.parent = this.pole;
    this.mesh.position = new Vector3(0, 2.5, -0.5); // Position relative to pole (2 units up)
    this.bulbMaterial = new StandardMaterial("lampBulbMaterial", scene);
    this.bulbMaterial.diffuseColor = new Color3(0.98, 0.78, 0.36);
    this.bulbMaterial.emissiveColor = new Color3(0.42, 0.25, 0.1);
    this.bulbMaterial.ambientColor = new Color3(0.28, 0.19, 0.1);
    this.bulbMaterial.specularColor = new Color3(0.16, 0.12, 0.08);
    this.bulbMaterial.alpha = this.bulbBaseAlpha;
    this.mesh.material = this.bulbMaterial;

    this.shade = MeshBuilder.CreateCylinder(
      "lampShade",
      {
        diameterBottom: 1.25,
        diameterTop: 0.62,
        height: 0.42,
        tessellation: 16,
      },
      scene
    );
    this.shade.parent = this.pole;
    this.shade.position = new Vector3(0, 2.25, -0.5);
    this.shade.material = this.poleMaterial;

    this.base = MeshBuilder.CreateTorus(
      "lampBaseRing",
      { diameter: 0.86, thickness: 0.06, tessellation: 24 },
      scene
    );
    this.base.parent = this.pole;
    this.base.position = new Vector3(0, -3, 0);
    this.base.material = this.poleMaterial;

    // Create light
    this.light = new PointLight("lampLight", this.mesh.position, scene);
    this.light.intensity = 1;
    this.light.diffuse = new Color3(1, 0.8, 0.6);
    this.light.range = 20;

    this.glowLayer = new GlowLayer("glow", scene);
    this.glowLayer.intensity = 0.5;
    this.glowLayer.addIncludedOnlyMesh(this.mesh);

    // Create directional light
    this.directionalLight = new DirectionalLight("lampDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 0.8, 0.6);
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }

  setVisibility(value: number): void {
    this.light.intensity =
      value * this.presentationLightIntensity * this.materialGlowIntensity;
    this.glowLayer.intensity = value > 0 ? this.materialGlowIntensity * value : 0;
    setProfileVisibilityAlpha(this.bulbMaterial, this.bulbBaseAlpha, value);
    setProfileVisibilityAlpha(this.poleMaterial, this.poleBaseAlpha, value);
    this.mesh.visibility = value > 0 ? 1 : 0;
    this.pole.visibility = value > 0 ? 1 : 0;
    this.shade.visibility = value > 0 ? 1 : 0;
    this.base.visibility = value > 0 ? 1 : 0;
    this.directionalLight.intensity =
      value > 0 ? 0.5 * value * this.presentationLightIntensity : 0;
  }

  applyPresentation(presentation: SceneObjectPresentation): void {
    this.presentationLightIntensity = presentation.lightIntensity;
    this.materialGlowIntensity = Math.max(0.4, presentation.material.glow * 1.35);
    this.bulbBaseAlpha = presentation.material.alpha;
    this.poleBaseAlpha = Math.min(0.96, presentation.material.alpha + 0.12);
    applySceneObjectMaterial(this.bulbMaterial, presentation.material, "accent", {
      alpha: this.bulbBaseAlpha,
      emissiveScale: 1.35,
    });
    applySceneObjectMaterial(this.poleMaterial, presentation.material, "secondary", {
      alpha: this.poleBaseAlpha,
      emissiveScale: 0.25,
    });
    this.light.diffuse = toColor3(presentation.material.accent);
    this.light.specular = scaleColor3(presentation.material.accent, 0.7);
    this.directionalLight.diffuse = toColor3(presentation.material.diffuse);
    this.pole.scaling = new Vector3(
      presentation.scale,
      presentation.scale * presentation.composition.verticalStretch,
      presentation.scale
    );
    this.shade.scaling = new Vector3(
      presentation.composition.frameScale,
      1,
      presentation.composition.frameScale
    );
    this.base.scaling = new Vector3(
      presentation.composition.frameScale,
      presentation.composition.frameScale,
      presentation.composition.frameScale
    );
    this.light.range = 20 * presentation.scale;
  }

  dispose(): void {
    this.light.dispose();
    this.glowLayer.dispose();
    this.mesh.dispose();
    this.shade.dispose();
    this.base.dispose();
    this.pole.dispose();
    this.bulbMaterial.dispose();
    this.poleMaterial.dispose();
    this.directionalLight.dispose();
  }

  updatePosition(position: Vector3): void {
    this.pole.position = position.clone();
    this.pole.position.y += 1.5;
    this.mesh.position = position.clone();
    this.mesh.position.y += 3;
    this.light.position = this.mesh.position;
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }
}
