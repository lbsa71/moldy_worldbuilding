import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  Scalar,
  StandardMaterial,
  Color3,
  DirectionalLight,
} from "@babylonjs/core";

export class GeometricShape {
  private mesh: Mesh;
  private animation: Animation;
  private material: StandardMaterial;
  private directionalLight: DirectionalLight;

  constructor(scene: Scene, position: Vector3) {
    const shapeOptions = [
      { type: "sphere", options: { diameter: 1 } },
      { type: "box", options: { size: 1 } },
      { type: "cylinder", options: { height: 1, diameter: 1 } },
      { type: "cone", options: { height: 1, diameter: 1 } },
    ];

    const randomShape =
      shapeOptions[Math.floor(Math.random() * shapeOptions.length)];

    switch (randomShape.type) {
      case "sphere":
        this.mesh = MeshBuilder.CreateSphere(
          "geometricShape",
          randomShape.options,
          scene
        );
        break;
      case "box":
        this.mesh = MeshBuilder.CreateBox(
          "geometricShape",
          randomShape.options,
          scene
        );
        break;
      case "cylinder":
        this.mesh = MeshBuilder.CreateCylinder(
          "geometricShape",
          randomShape.options,
          scene
        );
        break;
      case "cone":
        this.mesh = MeshBuilder.CreateCylinder(
          "geometricShape",
          { ...randomShape.options, diameterTop: 0 },
          scene
        );
        break;
      default:
        this.mesh = MeshBuilder.CreateSphere(
          "geometricShape",
          { diameter: 1 },
          scene
        );
    }

    this.material = new StandardMaterial("geometricShapeMaterial", scene);
    this.material.diffuseColor = new Color3(
      Math.random(),
      Math.random(),
      Math.random()
    );
    this.material.specularColor = Color3.Black();
    this.material.ambientColor = Color3.White();
    this.material.alpha = 0.5;

    this.mesh.position = position;
    this.mesh.material = this.material;

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

    scene.beginDirectAnimation(this.mesh, [this.animation, hoverAnimation], 0, 120, true);

    // Create directional light
    this.directionalLight = new DirectionalLight("geometricShapeDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }

  setVisibility(value: number): void {
    this.material.alpha = value;
    this.directionalLight.intensity = value > 0 ? 0.5 : 0;
    this.mesh.visibility = value > 0 ? 1 : 0;
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
