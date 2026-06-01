import {
  Scene,
  Vector3,
  Color3,
  TransformNode,
  PointLight,
  StandardMaterial,
  MeshBuilder,
  Mesh,
  SpotLight,
  SceneLoader,
  AbstractMesh,
  AnimationGroup,
  Ray,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import {
  advanceCharacterMotion,
  createCharacterJourney,
  type CharacterJourneyPlan,
} from "../../game/experience/characterMotion";

export class Character {
  private root: TransformNode;
  private mesh?: AbstractMesh;
  private mainLight: PointLight;
  private spotLight: SpotLight;
  private animationGroups: AnimationGroup[] = [];
  private currentAnimation?: AnimationGroup;
  private isMoving = false;
  private targetPosition?: Vector3;
  private movementPlan?: CharacterJourneyPlan;
  private terrain?: AbstractMesh;

  constructor(private scene: Scene) {
    // Create root node for character
    this.root = new TransformNode("characterRoot", scene);

    // Create character lights
    this.mainLight = this.createMainLight();
    this.spotLight = this.createSpotLight();
    this.mainLight.parent = this.root;
    this.spotLight.parent = this.root;

    // Load character model
    this.loadCharacterModel();

    // Register before render loop for movement and physics
    this.scene.registerBeforeRender(() => this.update());
  }

  private async loadCharacterModel(): Promise<void> {
    try {
      // Load GLTF model
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "character.glb",
        this.scene
      );

      // Set up mesh
      this.mesh = result.meshes[0];
      if (this.mesh) {
        this.mesh.parent = this.root;
        this.mesh.scaling = new Vector3(0.1, 0.1, 0.1);
        this.mesh.rotate(Vector3.Up(), Math.PI); // Face forward

      }

      // Store animations
      this.animationGroups = result.animationGroups;

      // Start idle animation
      const idleAnim = this.animationGroups.find((a) =>
        a.name.toLowerCase().includes("idle")
      );
      if (idleAnim) {
        this.playAnimation(idleAnim, true);
      }
    } catch (error) {
      console.warn("Failed to load character model, using fallback:", error);
      this.createFallbackCharacter();
    }
  }

  private createFallbackCharacter(): void {
    // Create a capsule for the character
    const mesh = MeshBuilder.CreateCapsule(
      "characterMesh",
      {
        radius: 0.5,
        height: 2,
        tessellation: 8,
        subdivisions: 1,
        capSubdivisions: 8,
      },
      this.scene
    );

    // Create glowing material
    const material = new StandardMaterial("characterMaterial", this.scene);
    material.diffuseColor = new Color3(0.5, 0.7, 0.3);
    material.emissiveColor = new Color3(0.3, 0.4, 0.2);
    material.specularColor = new Color3(0.2, 0.3, 0.1);
    material.ambientColor = new Color3(0.1, 0.15, 0.05);
    mesh.material = material;

    mesh.parent = this.root;
    this.mesh = mesh;

  }

  private update(): void {
    if (!this.targetPosition || !this.movementPlan || !this.isMoving) return;

    const deltaMs = Math.min(this.scene.getEngine().getDeltaTime(), 100);
    const step = advanceCharacterMotion(
      {
        x: this.root.position.x,
        z: this.root.position.z,
        rotationY: this.root.rotation.y,
      },
      this.targetPosition,
      this.movementPlan,
      deltaMs
    );

    this.root.rotation.y = step.pose.rotationY;
    this.setGroundedPosition(step.pose.x, step.pose.z);

    if (step.arrived) {
      this.stopMovement();
    }
  }

  private stopMovement(): void {
    if (!this.isMoving) return;

    this.targetPosition = undefined;
    this.movementPlan = undefined;
    this.isMoving = false;

    this.playIdleAnimation();
  }

  private createMainLight(): PointLight {
    // Main character light (softer, wider)
    const light = new PointLight(
      "characterLight",
      new Vector3(0, 2, 0),
      this.scene
    );
    light.intensity = 3.5;
    light.radius = 35;
    light.diffuse = new Color3(0.3, 0.5, 0.2);
    light.specular = new Color3(0.1, 0.2, 0.05);

    // Add wider ambient glow
    const ambient = new PointLight(
      "characterAmbient",
      new Vector3(0, 1, 0),
      this.scene
    );
    ambient.parent = this.root;
    ambient.intensity = 1.5;
    ambient.radius = 70;
    ambient.diffuse = new Color3(0.1, 0.15, 0.05);
    ambient.specular = new Color3(0, 0, 0);
    ambient.setEnabled(true);

    return light;
  }

  private createSpotLight(): SpotLight {
    // Downward spot light for dramatic effect
    const spot = new SpotLight(
      "characterSpot",
      new Vector3(0, 4, 0),
      new Vector3(0, -1, 0),
      Math.PI / 2,
      2,
      this.scene
    );
    spot.intensity = 2;
    spot.diffuse = new Color3(0.3, 0.5, 0.2);
    spot.specular = new Color3(0.1, 0.2, 0.05);

    return spot;
  }

  private playAnimation(
    animation: AnimationGroup,
    loop: boolean = false
  ): void {
    // Stop current animation if any
    if (this.currentAnimation && this.currentAnimation !== animation) {
      this.currentAnimation.stop();
      this.currentAnimation = animation;
      animation.loopAnimation = loop;
      animation.start(true);
    } else if (!this.currentAnimation) {
      this.currentAnimation = animation;
      animation.loopAnimation = loop;
      animation.start(true);
    }
  }

  public async moveTo(target: Vector3, terrain: Mesh): Promise<void> {
    this.terrain = terrain;

    this.targetPosition = target.clone();
    this.movementPlan = createCharacterJourney({
      start: {
        x: this.root.position.x,
        z: this.root.position.z,
      },
      target,
      currentRotationY: this.root.rotation.y,
    });

    if (this.movementPlan.routeClass === "hold") {
      this.setGroundedPosition(target.x, target.z);
      this.targetPosition = undefined;
      this.movementPlan = undefined;
      this.isMoving = false;
      this.playIdleAnimation();
      return;
    }

    this.isMoving = true;

    // Start walk animation
    const walkAnim = this.animationGroups.find((a) =>
      a.name.toLowerCase().includes("walk")
    );
    if (walkAnim) {
      this.playAnimation(walkAnim, true);
    }
  }

  public setPosition(position: Vector3): void {
    this.root.position = position;
  }

  public getPosition(): Vector3 {
    return this.root.position;
  }

  public dispose(): void {
    this.mesh?.dispose();
    this.mainLight.dispose();
    this.spotLight.dispose();
    this.root.dispose();
  }

  private setGroundedPosition(x: number, z: number): void {
    const nextPosition = new Vector3(x, this.root.position.y, z);

    if (this.terrain) {
      const ray = new Ray(
        new Vector3(nextPosition.x, 100, nextPosition.z),
        new Vector3(0, -1, 0),
        1000
      );
      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);
      if (hit?.pickedPoint) {
        nextPosition.y = hit.pickedPoint.y + 1;
      }
    }

    this.root.position = nextPosition;
  }

  private playIdleAnimation(): void {
    const idleAnim = this.animationGroups.find((a) =>
      a.name.toLowerCase().includes("idle")
    );
    if (idleAnim) {
      this.playAnimation(idleAnim, true);
    }
  }
}
