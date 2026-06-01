import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  StandardMaterial,
  Color3,
  DirectionalLight,
  TransformNode,
  PointLight,
} from "@babylonjs/core";
import type { SceneObjectPresentation } from "../../game/content/sceneObjectPlanner";
import {
  applySceneObjectMaterial,
  scaleColor3,
  setProfileVisibilityAlpha,
  toColor3,
} from "./sceneMaterial";

export class HospitalElement {
  private mainNode: TransformNode;
  private meshes: Mesh[] = [];
  private materials: StandardMaterial[] = [];
  private materialBaseAlphas = new Map<StandardMaterial, number>();
  private buildingMaterial: StandardMaterial;
  private roofMaterial: StandardMaterial;
  private crossMaterial: StandardMaterial;
  private windowMaterial: StandardMaterial;
  private animation: Animation;
  private isVisible: boolean = false;
  private directionalLight: DirectionalLight;
  private pointLight: PointLight;
  private presentationLightIntensity = 1;

  constructor(scene: Scene, position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0)) {
    
    rotation = rotation.add(new Vector3(0,-60,0));
    
    this.mainNode = new TransformNode("hospitalElement", scene);
    this.mainNode.position = position;
    this.mainNode.rotation = rotation;

    // Main building material
    this.buildingMaterial = this.registerMaterial(
      new StandardMaterial("hospitalBuildingMaterial", scene),
      0.5
    );
    this.buildingMaterial.diffuseColor = new Color3(0.72, 0.8, 0.88);
    this.buildingMaterial.specularColor = new Color3(0.1, 0.12, 0.14);
    this.buildingMaterial.ambientColor = new Color3(0.14, 0.18, 0.2);

    // Main building
    const building = MeshBuilder.CreateBox("hospitalBuilding", { width: 2, height: 1.5, depth: 1.2 }, scene);
    building.material = this.buildingMaterial;
    building.parent = this.mainNode;
    this.meshes.push(building);

    // Roof material
    this.roofMaterial = this.registerMaterial(
      new StandardMaterial("hospitalRoofMaterial", scene),
      0.45
    );
    this.roofMaterial.diffuseColor = new Color3(0.44, 0.66, 0.84);
    this.roofMaterial.specularColor = new Color3(0.1, 0.12, 0.14);
    this.roofMaterial.ambientColor = new Color3(0.1, 0.14, 0.18);

    // Roof
    const roof = MeshBuilder.CreateCylinder("hospitalRoof", { 
      height: 0.3,
      diameter: 2.2,
      tessellation: 4,
    }, scene);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.9;
    roof.material = this.roofMaterial;
    roof.parent = this.mainNode;
    this.meshes.push(roof);

    // Cross material
    this.crossMaterial = this.registerMaterial(
      new StandardMaterial("hospitalCrossMaterial", scene),
      0.28
    );
    this.crossMaterial.diffuseColor = new Color3(0.66, 0.56, 0.5);
    this.crossMaterial.emissiveColor = new Color3(0.12, 0.18, 0.24);
    this.crossMaterial.specularColor = Color3.Black();

    // Hospital cross
    const crossVertical = MeshBuilder.CreateBox("crossVertical", { height: 0.6, width: 0.15, depth: 0.1 }, scene);
    const crossHorizontal = MeshBuilder.CreateBox("crossHorizontal", { height: 0.15, width: 0.4, depth: 0.1 }, scene);
    crossVertical.material = this.crossMaterial;
    crossHorizontal.material = this.crossMaterial;
    crossVertical.position.y = 0.4;
    crossVertical.position.z = 0.65;
    crossHorizontal.position.y = 0.4;
    crossHorizontal.position.z = 0.65;
    crossVertical.parent = this.mainNode;
    crossHorizontal.parent = this.mainNode;
    this.meshes.push(crossVertical, crossHorizontal);

    // Windows material
    this.windowMaterial = this.registerMaterial(
      new StandardMaterial("hospitalWindowMaterial", scene),
      0.58
    );
    this.windowMaterial.diffuseColor = new Color3(0.44, 0.66, 0.84);
    this.windowMaterial.emissiveColor = new Color3(0.12, 0.18, 0.24);
    this.windowMaterial.specularColor = Color3.Black();

    // Windows
    const windowPositions = [
      new Vector3(-0.5, 0.2, 0.61),
      new Vector3(0.5, 0.2, 0.61),
      new Vector3(-0.5, -0.2, 0.61),
      new Vector3(0.5, -0.2, 0.61),
    ];

    windowPositions.forEach((pos, index) => {
      const window = MeshBuilder.CreateBox(`window${index}`, { height: 0.3, width: 0.3, depth: 0.01 }, scene);
      window.position = pos;
      window.material = this.windowMaterial;
      window.parent = this.mainNode;
      this.meshes.push(window);
    });

    // Animation setup
    this.animation = new Animation(
      "hospitalElementPulse",
      "scaling",
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ 
      frame: 0, 
      value: new Vector3(1, 1, 1)
    });
    keys.push({ 
      frame: 60, 
      value: new Vector3(1.05, 1.05, 1.05)
    });
    keys.push({ 
      frame: 120, 
      value: new Vector3(1, 1, 1)
    });

    this.animation.setKeys(keys);

    scene.beginDirectAnimation(this.mainNode, [this.animation], 0, 120, true);

    // Lighting
    this.directionalLight = new DirectionalLight("hospitalElementDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mainNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mainNode.position);

    // Add point light for more dramatic effect
    this.pointLight = new PointLight("hospitalPointLight", this.mainNode.position.add(new Vector3(0, 1, 0)), scene);
    this.pointLight.intensity = 0.3;
    this.pointLight.diffuse = new Color3(0.9, 0.95, 1);
    this.pointLight.specular = new Color3(0.9, 0.95, 1);
  }

  setVisibility(value: number): void {
    this.materials.forEach(material => {
      setProfileVisibilityAlpha(
        material,
        this.materialBaseAlphas.get(material) ?? 1,
        value
      );
    });
    this.isVisible = value > 0;
    this.meshes.forEach(mesh => {
      mesh.isVisible = this.isVisible;
    });
    this.directionalLight.intensity = this.isVisible
      ? 0.5 * this.presentationLightIntensity
      : 0;
    this.pointLight.intensity = this.isVisible
      ? 0.3 * this.presentationLightIntensity
      : 0;
  }

  applyPresentation(presentation: SceneObjectPresentation): void {
    this.presentationLightIntensity = presentation.lightIntensity;
    this.setMaterialBaseAlpha(this.buildingMaterial, presentation.material.alpha);
    this.setMaterialBaseAlpha(
      this.roofMaterial,
      Math.max(0.32, presentation.material.alpha - 0.08)
    );
    this.setMaterialBaseAlpha(
      this.crossMaterial,
      Math.min(0.9, presentation.material.alpha + 0.08)
    );
    this.setMaterialBaseAlpha(
      this.windowMaterial,
      Math.min(0.92, presentation.material.alpha + 0.12)
    );
    applySceneObjectMaterial(this.buildingMaterial, presentation.material);
    applySceneObjectMaterial(this.roofMaterial, presentation.material, "secondary", {
      alpha: this.materialBaseAlphas.get(this.roofMaterial),
      emissiveScale: 0.65,
    });
    applySceneObjectMaterial(this.crossMaterial, presentation.material, "accent", {
      alpha: this.materialBaseAlphas.get(this.crossMaterial),
      emissiveScale: 1.25,
    });
    applySceneObjectMaterial(this.windowMaterial, presentation.material, "secondary", {
      alpha: this.materialBaseAlphas.get(this.windowMaterial),
      emissiveScale: 1.4,
    });
    this.directionalLight.diffuse = toColor3(presentation.material.diffuse);
    this.pointLight.diffuse = toColor3(presentation.material.secondary);
    this.pointLight.specular = scaleColor3(presentation.material.secondary, 0.8);
    this.mainNode.scaling = new Vector3(
      presentation.scale,
      presentation.scale,
      presentation.scale
    );
  }

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.materials.forEach(material => material.dispose());
    this.directionalLight.dispose();
    this.pointLight.dispose();
    this.mainNode.dispose();
  }

  updatePosition(position: Vector3): void {
    this.mainNode.position = position;
    this.directionalLight.position = this.mainNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mainNode.position);
    this.pointLight.position = this.mainNode.position.add(new Vector3(0, 1, 0));
  }

  private registerMaterial(
    material: StandardMaterial,
    baseAlpha: number
  ): StandardMaterial {
    material.alpha = baseAlpha;
    this.materialBaseAlphas.set(material, baseAlpha);
    this.materials.push(material);

    return material;
  }

  private setMaterialBaseAlpha(
    material: StandardMaterial,
    baseAlpha: number
  ): void {
    const alpha = Math.max(0, Math.min(baseAlpha, 1));
    this.materialBaseAlphas.set(material, alpha);
    material.alpha = alpha;
  }
}
