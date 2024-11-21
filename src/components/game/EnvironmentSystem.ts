import {
  Scene,
  CubeTexture,
  MeshBuilder,
  PBRMaterial,
  Color3,
  DefaultRenderingPipeline,
  GlowLayer,
  ArcRotateCamera,
} from "@babylonjs/core";

export class EnvironmentSystem {
  private pipeline!: DefaultRenderingPipeline;
  private glowLayer!: GlowLayer;

  constructor(
    private scene: Scene,
    camera: ArcRotateCamera
  ) {
    this.setupEnvironment();
    this.setupPostProcessing(camera);
  }

  private setupEnvironment(): void {
    // Create environment and skybox
    const envTexture = CubeTexture.CreateFromPrefilteredData(
      "https://playground.babylonjs.com/textures/environment.env",
      this.scene
    );
    this.scene.environmentTexture = envTexture;
    this.scene.createDefaultSkybox(envTexture, true, 1000);

    // Create ground with PBR material
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 30, height: 30 },
      this.scene
    );
    const groundMaterial = new PBRMaterial("groundMaterial", this.scene);
    groundMaterial.metallic = 0.1;
    groundMaterial.roughness = 0.8;
    groundMaterial.albedoColor = new Color3(0.2, 0.2, 0.2);
    groundMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05);
    ground.material = groundMaterial;
    ground.receiveShadows = true;

    // Setup fog
    this.scene.fogEnabled = true;
    this.scene.fogDensity = 0.005;
    this.scene.fogColor = new Color3(0.1, 0.1, 0.1);
  }

  private setupPostProcessing(camera: ArcRotateCamera): void {
    // Add post-processing effects
    this.pipeline = new DefaultRenderingPipeline(
      "defaultPipeline",
      true,
      this.scene,
      [camera]
    );
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.7;
    this.pipeline.bloomWeight = 0.3;
    this.pipeline.bloomKernel = 64;

    this.pipeline.chromaticAberrationEnabled = true;
    this.pipeline.chromaticAberration.aberrationAmount = 0.5;

    this.pipeline.depthOfFieldEnabled = true;
    this.pipeline.depthOfField.focalLength = 50;
    this.pipeline.depthOfField.fStop = 2.8;
    this.pipeline.depthOfField.focusDistance = 5000;

    // Add glow layer
    this.glowLayer = new GlowLayer("glow", this.scene);
    this.glowLayer.intensity = 0.3;
  }

  public getGround(): any {
    return this.scene.getMeshByName("ground");
  }
}
