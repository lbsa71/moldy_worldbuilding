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

export class HospitalElement {
  private mesh: Mesh;
  private material: StandardMaterial;
  private animation: Animation;
  private isVisible: boolean = false;
  private directionalLight: DirectionalLight;

  constructor(scene: Scene, position: Vector3) {
    this.material = new StandardMaterial("hospitalElementMaterial", scene);
    this.material.diffuseColor = new Color3(0.8, 0.9, 1);
    this.material.specularColor = Color3.Black();
    this.material.ambientColor = Color3.White();
    this.material.alpha = 0.2;

    this.mesh = MeshBuilder.CreateBox("hospitalElement", { size: 1 }, scene);
    this.mesh.position = position;
    this.mesh.material = this.material;
    this.mesh.isVisible = false;

    this.animation = new Animation(
      "hospitalElementPulse",
      "scaling.x",
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ frame: 0, value: 1 });
    keys.push({ frame: 60, value: 1.1 });
    keys.push({ frame: 120, value: 1 });

    this.animation.setKeys(keys);

    scene.beginDirectAnimation(this.mesh, [this.animation], 0, 120, true);

    // Create directional light
    this.directionalLight = new DirectionalLight("hospitalElementDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }

  setVisibility(value: number): void {
    this.material.alpha = value;
    this.isVisible = value > 0;
    this.mesh.isVisible = this.isVisible;
    this.directionalLight.intensity = this.isVisible ? 0.5 : 0;
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
