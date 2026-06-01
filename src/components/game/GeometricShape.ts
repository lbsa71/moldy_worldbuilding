import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  StandardMaterial,
  Color3,
  DirectionalLight,
  NoiseProceduralTexture,
  TransformNode,
} from "@babylonjs/core";
import type { SceneObjectPresentation } from "../../game/content/sceneObjectPlanner";

export class GeometricShape {
  private rootNode: TransformNode;
  private primaryMesh: Mesh;
  private secondaryMesh: Mesh;
  private animation: Animation;
  private material: StandardMaterial;
  private directionalLight: DirectionalLight;
  private presentationLightIntensity = 1;

  constructor(
    scene: Scene,
    position: Vector3,
    rotation: Vector3 = new Vector3(0, 0, 0),
    variant = 0
  ) {
    this.rootNode = new TransformNode("geometricShapeRoot", scene);
    this.rootNode.position = position;
    this.rootNode.rotation = rotation;

    // Create primary shape
    const primaryShapeOptions = [
      { type: "sphere", options: { diameter: 1 }, createFn: MeshBuilder.CreateSphere },
      { type: "box", options: { size: 1 }, createFn: MeshBuilder.CreateBox },
      { type: "cylinder", options: { height: 1, diameter: 1 }, createFn: MeshBuilder.CreateCylinder },
      { type: "cone", options: { height: 1, diameter: 1, diameterTop: 0 }, createFn: MeshBuilder.CreateCylinder },
    ];

    const primaryShape =
      primaryShapeOptions[Math.abs(variant) % primaryShapeOptions.length];
    this.primaryMesh = primaryShape.createFn(
      "geometricShapePrimary",
      primaryShape.options,
      scene
    );
    this.primaryMesh.parent = this.rootNode;

    // Create secondary shape (smaller decorative element)
    const secondaryShapeOptions = [
      { type: "sphere", options: { diameter: 0.3 }, createFn: MeshBuilder.CreateSphere },
      { type: "box", options: { size: 0.3 }, createFn: MeshBuilder.CreateBox },
      { type: "torus", options: { diameter: 0.4, thickness: 0.1 }, createFn: MeshBuilder.CreateTorus },
    ];

    const secondaryShape =
      secondaryShapeOptions[
        Math.floor(Math.abs(variant) / primaryShapeOptions.length) %
          secondaryShapeOptions.length
      ];
    this.secondaryMesh = secondaryShape.createFn(
      "geometricShapeSecondary",
      secondaryShape.options,
      scene
    );
    this.secondaryMesh.parent = this.rootNode;
    
    // Position secondary shape relative to primary
    const randomAngle = ((Math.abs(variant) % 16) / 16) * Math.PI * 2;
    this.secondaryMesh.position = new Vector3(
      Math.cos(randomAngle) * 0.7,
      0.5,
      Math.sin(randomAngle) * 0.7
    );

    // Create and setup materials
    this.material = new StandardMaterial("geometricShapeMaterial", scene);
    const palette = [
      new Color3(0.55, 0.9, 0.72),
      new Color3(0.68, 0.78, 1),
      new Color3(0.88, 0.72, 0.96),
      new Color3(0.95, 0.86, 0.52),
    ];
    const baseColor = palette[Math.abs(variant) % palette.length];
    this.material.diffuseColor = baseColor;
    this.material.specularColor = Color3.Black();
    this.material.ambientColor = Color3.White();
    this.material.alpha = 0.5;

    // Add noise texture for more visual interest
    const noiseTexture = new NoiseProceduralTexture("noiseTexture", 256, scene);
    noiseTexture.octaves = 3;
    noiseTexture.persistence = 0.8;
    noiseTexture.animationSpeedFactor = 1;
    this.material.bumpTexture = noiseTexture;
    this.material.bumpTexture.level = 0.4;

    this.primaryMesh.material = this.material;
    this.secondaryMesh.material = this.material;

    this.animation = new Animation(
      "geometricShapeRotate",
      "rotation.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ frame: 0, value: 0 });
    keys.push({ frame: 120, value: Math.PI * 2 });

    this.animation.setKeys(keys);

    const hoverAnimation = new Animation(
      "geometricShapeHover",
      "position.y",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const hoverKeys = [];
    hoverKeys.push({ frame: 0, value: position.y });
    hoverKeys.push({ frame: 60, value: position.y + 0.2 });
    hoverKeys.push({ frame: 120, value: position.y });

    hoverAnimation.setKeys(hoverKeys);

    scene.beginDirectAnimation(this.rootNode, [this.animation, hoverAnimation], 0, 120, true);

    // Add secondary shape rotation
    const secondaryRotation = new Animation(
      "geometricShapeSecondaryRotate",
      "rotation",
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const secondaryKeys = [];
    secondaryKeys.push({ 
      frame: 0, 
      value: new Vector3(0, 0, 0) 
    });
    secondaryKeys.push({ 
      frame: 120, 
      value: new Vector3(Math.PI * 2, Math.PI * 2, 0) 
    });

    secondaryRotation.setKeys(secondaryKeys);
    scene.beginDirectAnimation(this.secondaryMesh, [secondaryRotation], 0, 120, true);

    // Create directional light
    this.directionalLight = new DirectionalLight("geometricShapeDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.rootNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.rootNode.position);
  }

  setVisibility(value: number): void {
    this.material.alpha = value;
    this.directionalLight.intensity =
      value > 0 ? 0.5 * this.presentationLightIntensity : 0;
    this.primaryMesh.visibility = value > 0 ? 1 : 0;
    this.secondaryMesh.visibility = value > 0 ? 1 : 0;
  }

  applyPresentation(presentation: SceneObjectPresentation): void {
    this.presentationLightIntensity = presentation.lightIntensity;
    this.rootNode.scaling = new Vector3(
      presentation.scale,
      presentation.scale,
      presentation.scale
    );
  }

  dispose(): void {
    this.primaryMesh.dispose();
    this.secondaryMesh.dispose();
    this.rootNode.dispose();
    this.material.dispose();
    if (this.material.bumpTexture) {
      this.material.bumpTexture.dispose();
    }
    this.directionalLight.dispose();
  }

  updatePosition(position: Vector3): void {
    this.rootNode.position = position;
    this.directionalLight.position = this.rootNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.rootNode.position);
  }
}
