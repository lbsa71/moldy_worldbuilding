import {
  Engine,
  Scene,
  Vector3,
  WebGPUEngine,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
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
  private targetPoint?: Vector3;
  private initialized = false;
  private isWebGPU = false;

  constructor(private canvas: HTMLCanvasElement) {}

  public async initialize(): Promise<void> {
    await this.setupEngine();
    this.initializeScene();
    await this.loadCharacter();
    this.setupInteraction();
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

    // Lighting
    const light = new HemisphericLight(
      "light",
      new Vector3(0.5, 1, 0.8),
      this.scene
    );
    light.intensity = 0.7;

    // Create procedural terrain
    this.createTerrain();

    // Add fog for mood
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.01;
    this.scene.fogColor = new Color3(0.1, 0.15, 0.1);
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

    // Create vertices
    for (let row = 0; row <= subdivisions; row++) {
      for (let col = 0; col <= subdivisions; col++) {
        const x = (col * size) / subdivisions - size / 2;
        const z = (row * size) / subdivisions - size / 2;

        // Create organic, mold-like terrain using multiple noise functions
        const freq1 = 0.03;
        const freq2 = 0.08;
        const y =
          Math.sin(x * freq1) * Math.cos(z * freq1) * 5 +
          Math.sin(x * freq2) * Math.cos(z * freq2) * 2 +
          (Math.sin(Math.sqrt(x * x + z * z) * 0.05) + 1) * 3;

        positions.push(x, y, z);

        // UV coordinates
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

    // Create a custom material for the terrain
    const terrainMaterial = new StandardMaterial("terrainMaterial", this.scene);
    terrainMaterial.diffuseColor = new Color3(0.2, 0.3, 0.1);
    terrainMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    terrainMaterial.ambientColor = new Color3(0.1, 0.15, 0.1);
    terrainMaterial.emissiveColor = new Color3(0.02, 0.03, 0.02);
    this.terrain.material = terrainMaterial;
  }

  private async loadCharacter(): Promise<void> {
    // Create a root node for the character
    this.characterRoot = new TransformNode("characterRoot", this.scene);

    // Load a simple character model (you can replace this with a more complex model later)
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "https://assets.babylonjs.com/meshes/",
      "HVGirl.glb",
      this.scene
    );

    this.character = result.meshes[0];
    this.character.parent = this.characterRoot;
    this.character.scaling = new Vector3(0.1, 0.1, 0.1);

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
