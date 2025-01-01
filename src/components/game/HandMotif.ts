import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  Scalar,
  StandardMaterial,
  Texture,
  Color3,
  DirectionalLight,
} from "@babylonjs/core";

export class HandMotif {
  private mesh: Mesh;
  private animation: Animation;
  private material: StandardMaterial;
  private directionalLight: DirectionalLight;

  constructor(scene: Scene, position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0)) {
    this.material = new StandardMaterial("handMotifMaterial", scene);
    this.material.diffuseTexture = new Texture("assets/hand_motif.png", scene);
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.specularColor = Color3.Black();
    this.material.ambientColor = Color3.White();
    this.material.emissiveColor = Color3.White();
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
