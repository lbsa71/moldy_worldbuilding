import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  ArcRotateCamera,
  HemisphericLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  GroundMesh,
  Mesh,
  Animation,
  SceneLoader,
  AbstractMesh,
  Ray,
  PickingInfo,
  Path3D,
  TransformNode,
  KeyboardEventTypes,
  PointerEventTypes,
  Matrix,
  VertexData,
  GlowLayer,
  Texture,
  ParticleSystem,
} from "@babylonjs/core";
// Import loaders
import "@babylonjs/loaders/glTF";

export class GameScene {
  private engine!: Engine;
  private scene!: Scene;
  private camera!: ArcRotateCamera;
  private terrain!: Mesh;
  private character?: AbstractMesh;
  private characterRoot?: TransformNode;
  private characterLight?: PointLight;
  private targetPoint?: Vector3;
  private initialized = false;
  private isWebGPU = false;
  private trees: Mesh[] = [];
  private rocks: Mesh[] = [];

  constructor(private canvas: HTMLCanvasElement) {}

  public async initialize(): Promise<void> {
    await this.setupEngine();
    this.initializeScene();
    await this.loadCharacter();
    this.setupInteraction();
    this.createEnvironmentObjects();
    this.initialized = true;
  }

  private async setupEngine(): Promise<void> {
    const webGPUSupported = await WebGPUEngine.IsSupportedAsync;

    if (webGPUSupported) {
      const webGPUEngine = new WebGPUEngine(this.canvas);
      await webGPUEngine.initAsync();
      this.engine = webGPUEngine as unknown as Engine;
      this.isWebGPU = true;
    } else {
      this.engine = new Engine(this.canvas, true);
      this.isWebGPU = false;
    }

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.05, 0.05, 1);
  }

  private initializeScene(): void {
    // Camera setup
    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      30,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 50;

    // Ambient lighting (very dim)
    const light = new HemisphericLight(
      "light",
      new Vector3(0.5, 1, 0.8),
      this.scene
    );
    light.intensity = 0.2;
    light.groundColor = new Color3(0.02, 0.02, 0.02);

    // Create procedural terrain
    this.createTerrain();

    // Add volumetric fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.015;
    this.scene.fogColor = new Color3(0.05, 0.05, 0.05);

    // Add ground mist particle system
    this.createGroundMist();

    // Add glow layer for the character light
    const gl = new GlowLayer("glow", this.scene, {
      mainTextureFixedSize: 1024,
      blurKernelSize: 64,
    });
    gl.intensity = 0.5;
  }

  private createGroundMist(): void {
    const mistSystem = new ParticleSystem("mist", 2000, this.scene);
    mistSystem.particleTexture = new Texture(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      this.scene
    );

    mistSystem.minEmitBox = new Vector3(-50, 0, -50);
    mistSystem.maxEmitBox = new Vector3(50, 0.5, 50);

    mistSystem.color1 = new Color4(0.1, 0.1, 0.1, 0.1);
    mistSystem.color2 = new Color4(0.1, 0.1, 0.1, 0.2);
    mistSystem.colorDead = new Color4(0.1, 0.1, 0.1, 0);

    mistSystem.minSize = 5.0;
    mistSystem.maxSize = 10.0;

    mistSystem.minLifeTime = 2.0;
    mistSystem.maxLifeTime = 3.0;

    mistSystem.emitRate = 100;

    mistSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    mistSystem.gravity = new Vector3(0, 0.05, 0);

    mistSystem.direction1 = new Vector3(-0.1, 0, -0.1);
    mistSystem.direction2 = new Vector3(0.1, 0.1, 0.1);

    mistSystem.minAngularSpeed = 0;
    mistSystem.maxAngularSpeed = 0.1;

    mistSystem.minEmitPower = 0.1;
    mistSystem.maxEmitPower = 0.3;

    mistSystem.start();
  }

  private createTerrain(): void {
    const size = 100;
    const subdivisions = 100;

    // Create custom vertex data
    const vertexData = new VertexData();
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Create vertices with more dramatic height variation
    for (let row = 0; row <= subdivisions; row++) {
      for (let col = 0; col <= subdivisions; col++) {
        const x = (col * size) / subdivisions - size / 2;
        const z = (row * size) / subdivisions - size / 2;

        // Create more dramatic mold-like terrain
        const freq1 = 0.03;
        const freq2 = 0.08;
        const freq3 = 0.15;
        const y =
          Math.sin(x * freq1) * Math.cos(z * freq1) * 8 +
          Math.sin(x * freq2) * Math.cos(z * freq2) * 4 +
          Math.sin(x * freq3) * Math.cos(z * freq3) * 2 +
          (Math.sin(Math.sqrt(x * x + z * z) * 0.05) + 1) * 3;

        positions.push(x, y, z);
        uvs.push(col / subdivisions, row / subdivisions);
      }
    }

    // Create indices
    for (let row = 0; row < subdivisions; row++) {
      for (let col = 0; col < subdivisions; col++) {
        const baseIdx = row * (subdivisions + 1) + col;
        indices.push(
          baseIdx,
          baseIdx + 1,
          baseIdx + subdivisions + 1,
          baseIdx + 1,
          baseIdx + subdivisions + 2,
          baseIdx + subdivisions + 1
        );
      }
    }

    // Compute normals
    VertexData.ComputeNormals(positions, indices, normals);

    // Apply vertex data to mesh
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    // Create the terrain mesh
    this.terrain = new Mesh("terrain", this.scene);
    vertexData.applyToMesh(this.terrain);

    // Create a darker material for the terrain
    const terrainMaterial = new StandardMaterial("terrainMaterial", this.scene);
    terrainMaterial.diffuseColor = new Color3(0.1, 0.15, 0.05);
    terrainMaterial.specularColor = new Color3(0.05, 0.05, 0.05);
    terrainMaterial.ambientColor = new Color3(0.05, 0.07, 0.05);
    terrainMaterial.emissiveColor = new Color3(0.01, 0.015, 0.01);
    this.terrain.material = terrainMaterial;
  }

  private createEnvironmentObjects(): void {
    // Create tree material
    const treeMaterial = new StandardMaterial("treeMaterial", this.scene);
    treeMaterial.diffuseColor = new Color3(0.1, 0.15, 0.05);
    treeMaterial.specularColor = new Color3(0, 0, 0);

    // Create rock material
    const rockMaterial = new StandardMaterial("rockMaterial", this.scene);
    rockMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    rockMaterial.specularColor = new Color3(0.1, 0.1, 0.1);

    // Create trees and rocks
    for (let i = 0; i < 50; i++) {
      // Random position within terrain bounds
      const x = Math.random() * 80 - 40;
      const z = Math.random() * 80 - 40;

      // Get height at position
      const ray = new Ray(new Vector3(x, 100, z), new Vector3(0, -1, 0), 200);
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);

      if (hit?.pickedPoint) {
        // Create tree
        if (Math.random() > 0.3) {
          const height = 3 + Math.random() * 2;
          const trunk = MeshBuilder.CreateCylinder(
            "trunk",
            {
              height: height,
              diameter: 0.3,
              tessellation: 8,
            },
            this.scene
          );
          const foliage = MeshBuilder.CreateCylinder(
            "foliage",
            {
              height: height * 2,
              diameterTop: 0.1,
              diameterBottom: 2,
              tessellation: 8,
            },
            this.scene
          );

          trunk.material = treeMaterial;
          foliage.material = treeMaterial;

          trunk.position = new Vector3(x, hit.pickedPoint.y + height / 2, z);
          foliage.position = new Vector3(
            x,
            hit.pickedPoint.y + height * 1.5,
            z
          );

          trunk.rotation.y = Math.random() * Math.PI;
          foliage.rotation.y = Math.random() * Math.PI;

          this.trees.push(trunk, foliage);
        }
        // Create rock
        else {
          const size = 1 + Math.random() * 2;
          const rock = MeshBuilder.CreatePolyhedron(
            "rock",
            {
              type: 1,
              size: size,
            },
            this.scene
          );

          rock.material = rockMaterial;
          rock.position = new Vector3(x, hit.pickedPoint.y + size / 2, z);
          rock.rotation = new Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );

          this.rocks.push(rock);
        }
      }
    }
  }

  private async loadCharacter(): Promise<void> {
    // Create a root node for the character
    this.characterRoot = new TransformNode("characterRoot", this.scene);

    // Load character model
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "https://assets.babylonjs.com/meshes/",
      "HVGirl.glb",
      this.scene
    );

    this.character = result.meshes[0];
    this.character.parent = this.characterRoot;
    this.character.scaling = new Vector3(0.1, 0.1, 0.1);

    // Add point light to character
    this.characterLight = new PointLight(
      "characterLight",
      new Vector3(0, 2, 0),
      this.scene
    );
    this.characterLight.parent = this.characterRoot;
    this.characterLight.intensity = 8;
    this.characterLight.radius = 10;
    this.characterLight.diffuse = new Color3(0.5, 0.7, 0.3);
    this.characterLight.specular = new Color3(0.3, 0.5, 0.1);

    // Position the character on the terrain
    this.characterRoot.position = new Vector3(0, 0, 0);
    this.updateCharacterHeight();
  }

  private setupInteraction(): void {
    // Handle click/tap for navigation
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const ray = this.scene.createPickingRay(
          this.scene.pointerX,
          this.scene.pointerY,
          Matrix.Identity(),
          this.camera
        );

        const hit = this.scene.pickWithRay(ray);
        if (hit?.pickedPoint && hit.pickedMesh === this.terrain) {
          this.moveCharacterTo(hit.pickedPoint);
        }
      }
    });
  }

  private moveCharacterTo(target: Vector3): void {
    if (!this.characterRoot) return;

    this.targetPoint = target;

    // Calculate direction and rotation
    const direction = target.subtract(this.characterRoot.position);
    direction.y = 0; // Keep character upright

    // Rotate character to face target
    const angle = Math.atan2(direction.x, direction.z);
    this.characterRoot.rotation.y = angle;

    // Create animation
    const anim = new Animation(
      "moveAnim",
      "position",
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [];
    keys.push({
      frame: 0,
      value: this.characterRoot.position.clone(),
    });
    keys.push({
      frame: 30,
      value: target,
    });
    anim.setKeys(keys);

    // Stop any current animation and start new one
    this.scene.stopAnimation(this.characterRoot);
    this.scene.beginDirectAnimation(
      this.characterRoot,
      [anim],
      0,
      30,
      false,
      1,
      () => {
        this.updateCharacterHeight();
      }
    );
  }

  private updateCharacterHeight(): void {
    if (!this.characterRoot || !this.terrain) return;

    // Ray cast to find ground height
    const ray = new Ray(
      new Vector3(
        this.characterRoot.position.x,
        100,
        this.characterRoot.position.z
      ),
      new Vector3(0, -1, 0),
      1000
    );

    const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);
    if (hit?.pickedPoint) {
      this.characterRoot.position.y = hit.pickedPoint.y;
    }
  }

  public async run(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  public getFps(): number {
    return this.engine.getFps();
  }

  public getRendererType(): string {
    return this.isWebGPU ? "WebGPU" : "WebGL";
  }
}
