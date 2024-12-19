import {
  Scene,
  Vector3,
  PointLight,
  MeshBuilder,
  Mesh,
  Color3,
  DirectionalLight,
} from "@babylonjs/core";

export class EnvironmentalLightElement {
  private light: PointLight;
  private mesh: Mesh;
  private directionalLight: DirectionalLight;

  constructor(scene: Scene, position: Vector3) {
    this.light = new PointLight("envLight", position, scene);
    this.light.intensity = 0.5;
    this.light.diffuse = new Color3(
      Math.random(),
      Math.random(),
      Math.random()
    );
    this.light.range = 15;

    this.mesh = MeshBuilder.CreateSphere("envLightMesh", { diameter: 0.5 }, scene);
    this.mesh.position = position;

    // Create directional light
    this.directionalLight = new DirectionalLight("envLightDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }

  setVisibility(value: number): void {
    this.light.intensity = value;
    this.mesh.visibility = value > 0 ? 1 : 0;
    this.directionalLight.intensity = value > 0 ? 0.5 : 0;
    this.directionalLight.setEnabled(value > 0);
  }

  dispose(): void {
    this.light.dispose();
    this.mesh.dispose();
    this.directionalLight.dispose();
  }

  updatePosition(position: Vector3): void {
    this.light.position = position;
    this.mesh.position = position;
    this.directionalLight.position = this.mesh.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mesh.position);
  }
}
