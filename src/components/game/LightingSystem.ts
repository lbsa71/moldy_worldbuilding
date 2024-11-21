import {
  DirectionalLight,
  PointLight,
  Scene,
  ShadowGenerator,
  Vector3,
  Color3,
  Animation,
} from "@babylonjs/core";

export class LightingSystem {
  private mainLight: DirectionalLight;
  private shadowGenerator: ShadowGenerator;
  private pointLights: PointLight[] = [];

  constructor(scene: Scene) {
    // Create main directional light for shadows
    this.mainLight = new DirectionalLight(
      "mainLight",
      new Vector3(-1, -2, -1),
      scene
    );
    this.mainLight.intensity = 2;
    this.mainLight.position = new Vector3(5, 10, 5);

    // Enable shadows
    this.shadowGenerator = new ShadowGenerator(2048, this.mainLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.setDarkness(0.3);

    this.createDynamicLights(scene);
  }

  private createDynamicLights(scene: Scene): void {
    this.createDynamicLight(
      "pointLight1",
      new Vector3(4, 3, -4),
      new Color3(0.1, 0.3, 1),
      scene
    );
    this.createDynamicLight(
      "pointLight2",
      new Vector3(-4, 3, 4),
      new Color3(1, 0.3, 0.1),
      scene
    );
    this.createDynamicLight(
      "pointLight3",
      new Vector3(4, 3, 4),
      new Color3(0.1, 1, 0.3),
      scene
    );
  }

  private createDynamicLight(
    name: string,
    basePos: Vector3,
    color: Color3,
    scene: Scene
  ): void {
    const light = new PointLight(name, basePos, scene);
    light.intensity = 0.7;
    light.diffuse = color;
    light.specular = color;

    Animation.CreateAndStartAnimation(
      `${name}Anim`,
      light,
      "position",
      30,
      240,
      basePos,
      basePos.add(new Vector3(0, 2, 0)),
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    this.pointLights.push(light);
  }

  public getShadowGenerator(): ShadowGenerator {
    return this.shadowGenerator;
  }

  public addShadowCaster(mesh: any): void {
    this.shadowGenerator.addShadowCaster(mesh);
  }
}
