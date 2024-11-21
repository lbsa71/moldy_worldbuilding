// src/components/GameScene.ts
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  DirectionalLight,
  ShadowGenerator,
  MeshBuilder,
  Color3,
  Color4,
  CubeTexture,
  PBRMaterial,
  GlowLayer,
  DefaultRenderingPipeline,
  PointLight,
  Animation,
  ParticleSystem,
  Texture,
  StandardMaterial,
  Path3D,
  TransformNode,
  Space,
  Mesh,
  ActionManager,
  ExecuteCodeAction,
  Matrix,
  Quaternion,
  EasingFunction,
  CubicEase,
  Scalar,
} from "@babylonjs/core";

declare global {
  interface Window {
    calculatePhysics: (x: number, y: number, z: number) => number;
  }
}

export class GameScene {
  private engine: Engine;
  private scene: Scene;
  private time = 0;
  private camera!: ArcRotateCamera;

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);

    if (typeof window.calculatePhysics === "function") {
      this.initialize();
    } else {
      const checkWasm = setInterval(() => {
        if (typeof window.calculatePhysics === "function") {
          clearInterval(checkWasm);
          this.initialize();
        }
      }, 100);
    }
  }

  private createParticleSystem(emitter: Mesh, color: Color4): ParticleSystem {
    const particles = new ParticleSystem("particles", 2000, this.scene);
    particles.particleTexture = new Texture(
      "https://www.babylonjs-playground.com/textures/flare.png",
      this.scene
    );
    particles.emitter = emitter;
    particles.minEmitBox = new Vector3(-0.1, 0, -0.1);
    particles.maxEmitBox = new Vector3(0.1, 0, 0.1);
    particles.color1 = color;
    particles.color2 = color.scale(0.5);
    particles.colorDead = new Color4(0, 0, 0.2, 0.0);
    particles.minSize = 0.1;
    particles.maxSize = 0.5;
    particles.minLifeTime = 0.3;
    particles.maxLifeTime = 1.5;
    particles.emitRate = 500;
    particles.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    particles.gravity = new Vector3(0, 0, 0);
    particles.direction1 = new Vector3(-1, 8, 1);
    particles.direction2 = new Vector3(1, 8, -1);
    particles.minAngularSpeed = 0;
    particles.maxAngularSpeed = Math.PI;
    particles.minEmitPower = 1;
    particles.maxEmitPower = 3;
    particles.updateSpeed = 0.005;
    return particles;
  }

  private createOrbitalPath(): Vector3[] {
    const points: Vector3[] = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * 8;
      const z = Math.sin(angle) * 8;
      const y = Math.sin(angle * 3) * 2 + 3;
      points.push(new Vector3(x, y, z));
    }
    return points;
  }

  private createTorusKnot(): Mesh {
    const torusKnot = MeshBuilder.CreateTorusKnot(
      "torusKnot",
      {
        radius: 2,
        tube: 0.5,
        radialSegments: 128,
        tubularSegments: 64,
      },
      this.scene
    );
    torusKnot.position.y = 5;

    const material = new PBRMaterial("torusKnotMaterial", this.scene);
    material.metallic = 0.8;
    material.roughness = 0.2;
    material.albedoColor = new Color3(0.8, 0.8, 0.9);
    material.emissiveColor = new Color3(0.2, 0.2, 0.3);
    torusKnot.material = material;

    Animation.CreateAndStartAnimation(
      "torusKnotRotation",
      torusKnot,
      "rotation",
      30,
      120,
      Vector3.Zero(),
      new Vector3(0, Math.PI * 2, 0),
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    return torusKnot;
  }

  private animateCamera(
    targetPosition: Vector3,
    targetAlpha: number,
    targetBeta: number
  ): void {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

    Animation.CreateAndStartAnimation(
      "cameraPosition",
      this.camera,
      "position",
      30,
      120,
      this.camera.position,
      targetPosition,
      0,
      ease
    );

    Animation.CreateAndStartAnimation(
      "cameraAlpha",
      this.camera,
      "alpha",
      30,
      120,
      this.camera.alpha,
      targetAlpha,
      0,
      ease
    );

    Animation.CreateAndStartAnimation(
      "cameraBeta",
      this.camera,
      "beta",
      30,
      120,
      this.camera.beta,
      targetBeta,
      0,
      ease
    );
  }

  private initialize(): void {
    // Create an arc rotate camera
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      15,
      new Vector3(0, 0, 0),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 25;
    this.camera.wheelDeltaPercentage = 0.01;

    // Create main directional light for shadows
    const mainLight = new DirectionalLight(
      "mainLight",
      new Vector3(-1, -2, -1),
      this.scene
    );
    mainLight.intensity = 2;
    mainLight.position = new Vector3(5, 10, 5);

    // Enable shadows
    const shadowGenerator = new ShadowGenerator(2048, mainLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;
    shadowGenerator.setDarkness(0.3);

    // Add dynamic point lights
    const createDynamicLight = (
      name: string,
      basePos: Vector3,
      color: Color3
    ) => {
      const light = new PointLight(name, basePos, this.scene);
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
      return light;
    };

    createDynamicLight(
      "pointLight1",
      new Vector3(4, 3, -4),
      new Color3(0.1, 0.3, 1)
    );
    createDynamicLight(
      "pointLight2",
      new Vector3(-4, 3, 4),
      new Color3(1, 0.3, 0.1)
    );
    createDynamicLight(
      "pointLight3",
      new Vector3(4, 3, 4),
      new Color3(0.1, 1, 0.3)
    );

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

    // Create central sphere
    const sphere = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2, segments: 32 },
      this.scene
    );
    sphere.position.y = 1;
    const sphereMaterial = new PBRMaterial("sphereMaterial", this.scene);
    sphereMaterial.metallic = 1.0;
    sphereMaterial.roughness = 0.1;
    sphereMaterial.albedoColor = new Color3(0.9, 0.9, 0.9);
    sphere.material = sphereMaterial;
    shadowGenerator.addShadowCaster(sphere);

    // Add particle system to sphere
    const particles = this.createParticleSystem(
      sphere,
      new Color4(0.7, 0.8, 1.0, 1.0)
    );
    particles.start();

    // Create torus knot
    const torusKnot = this.createTorusKnot();
    shadowGenerator.addShadowCaster(torusKnot);

    // Create orbital path for floating objects
    const path = this.createOrbitalPath();
    const orbitRoot = new TransformNode("orbitRoot", this.scene);

    // Create floating objects that follow the path
    const numObjects = 8;
    const floatingObjects: Mesh[] = [];

    for (let i = 0; i < numObjects; i++) {
      const box = MeshBuilder.CreateBox(`box${i}`, { size: 0.8 }, this.scene);

      const boxMaterial = new PBRMaterial(`boxMaterial${i}`, this.scene);
      boxMaterial.metallic = 0.5;
      boxMaterial.roughness = 0.3;
      const color = new Color3(Math.random(), Math.random(), Math.random());
      boxMaterial.albedoColor = color;
      boxMaterial.emissiveColor = color.scale(0.5);
      box.material = boxMaterial;
      shadowGenerator.addShadowCaster(box);

      box.parent = orbitRoot;
      floatingObjects.push(box);

      // Add interaction
      box.actionManager = new ActionManager(this.scene);
      box.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          const particles = this.createParticleSystem(
            box,
            new Color4(color.r, color.g, color.b, 1.0)
          );
          particles.start();
          setTimeout(() => particles.dispose(), 1000);

          // Animate camera to look at the clicked box
          this.animateCamera(
            box.getAbsolutePosition().add(new Vector3(0, 2, -5)),
            this.camera.alpha + Math.PI / 4,
            Math.PI / 2.2
          );
        })
      );
    }

    // Animate objects along path
    this.scene.onBeforeRenderObservable.add(() => {
      this.time += this.engine.getDeltaTime() / 1000;

      floatingObjects.forEach((box, index) => {
        const offset = (index / numObjects) * path.length;
        const pos = Math.floor((this.time * 0.2 + offset) % path.length);
        const nextPos = (pos + 1) % path.length;

        const current = path[pos];
        const next = path[nextPos];

        const interpolation = (this.time * 0.2 + offset) % 1;
        const position = Vector3.Lerp(current, next, interpolation);

        box.position = position;
        box.rotate(Vector3.Up(), 0.02, Space.WORLD);
      });

      orbitRoot.rotate(Vector3.Up(), 0.005, Space.WORLD);
    });

    // Add exponential fog
    this.scene.fogEnabled = true;
    this.scene.fogDensity = 0.005;
    this.scene.fogColor = new Color3(0.1, 0.1, 0.1);

    // Add post-processing effects
    const pipeline = new DefaultRenderingPipeline(
      "defaultPipeline",
      true,
      this.scene,
      [this.camera]
    );
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.7;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;

    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 0.5;

    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 2.8;
    pipeline.depthOfField.focusDistance = 5000;

    // Add glow layer
    const gl = new GlowLayer("glow", this.scene);
    gl.intensity = 0.3;
  }

  public render(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }
}
