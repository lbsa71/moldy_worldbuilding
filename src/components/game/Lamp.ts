import {
  Scene,
  Vector3,
  PointLight,
  GlowLayer,
  MeshBuilder,
  Mesh,
  Color3,
  DirectionalLight,
} from "@babylonjs/core";

export class Lamp {
  private light: PointLight;
  private glowLayer: GlowLayer;
  private mesh: Mesh;
  private pole: Mesh;
  private directionalLight: DirectionalLight;

  constructor(scene: Scene, position: Vector3) {
    // Create pole
    this.pole = MeshBuilder.CreateCylinder(
      "lampPole",
      { height: 3, diameter: 0.2 },
      scene
    );
    this.pole.position = position.clone();
    this.pole.position.y += 1.5;

    // Create lamp mesh
    this.mesh = MeshBuilder.CreateSphere("lampMesh", { diameter: 1 }, scene);
    this.mesh.position = position.clone();
    this.mesh.position.y += 3;
    this.mesh.parent = this.pole;

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
    this.directionalLight.parent = this.mesh;
  }

  setVisibility(value: number): void {
    this.light.intensity = value;
    this.mesh.visibility = value > 0 ? 1 : 0;
    this.pole.visibility = value > 0 ? 1 : 0;
    this.directionalLight.intensity = value > 0 ? 0.5 : 0;
  }

  dispose(): void {
    this.light.dispose();
    this.glowLayer.dispose();
    this.mesh.dispose();
    this.pole.dispose();
    this.directionalLight.dispose();
  }

  updatePosition(position: Vector3): void {
    this.pole.position = position.clone();
    this.pole.position.y += 1.5;
    this.mesh.position = position.clone();
    this.mesh.position.y += 3;
    this.light.position = this.mesh.position;
  }
}
