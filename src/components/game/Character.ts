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
  PhysicsAggregate,
  PhysicsShapeType,
  PhysicsMotionType,
  AbstractMesh,
  AnimationGroup,
  Ray,
  PhysicsBody,
  Quaternion,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { CharacterController } from "./CharacterController";

export class Character {
  private root: TransformNode;
  private mesh?: AbstractMesh;
  private mainLight: PointLight;
  private spotLight: SpotLight;
  private controller: CharacterController;
  private physicsAggregate?: PhysicsAggregate;
  private animationGroups: AnimationGroup[] = [];
  private currentAnimation?: AnimationGroup;
  private isMoving = false;
  private targetPosition?: Vector3;
  private startPosition?: Vector3;
  private totalDistance = 0;
  private moveSpeed = 5; // Units per second
  private lastGroundY = 0;
  private debugSphere?: Mesh;
  private terrain?: AbstractMesh;

  constructor(private scene: Scene) {
    // Create root node for character
    this.root = new TransformNode("characterRoot", scene);

    // Create character lights
    this.mainLight = this.createMainLight();
    this.spotLight = this.createSpotLight();
    this.mainLight.parent = this.root;
    this.spotLight.parent = this.root;

    // Create controller
    this.controller = new CharacterController(scene, this.root);

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

        // Set up physics on the character mesh
        this.setupPhysics(this.mesh);

        // Create debug sphere after physics is set up
        // this.createDebugSphere();
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

    // Set up physics on the fallback mesh
    this.setupPhysics(mesh);

    // Create debug sphere after physics is set up
    this.createDebugSphere();
  }

  private createDebugSphere(): void {
    // Create a small sphere to visualize the physics shape
    this.debugSphere = MeshBuilder.CreateSphere(
      "debugSphere",
      {
        diameter: 2,
      },
      this.scene
    );

    const material = new StandardMaterial("debugMaterial", this.scene);
    material.wireframe = true;
    material.emissiveColor = new Color3(1, 0, 0);
    material.alpha = 0.3;
    this.debugSphere.material = material;
    this.debugSphere.parent = this.root;
  }

  private setupPhysics(mesh: AbstractMesh): void {
    console.log("Starting physics setup...");

    if (this.mesh) {
      this.mesh.parent = this.root;
      this.mesh.position = Vector3.Zero();
    }

    this.physicsAggregate = new PhysicsAggregate(
      this.root,
      PhysicsShapeType.SPHERE,
      {
        mass: 1,
        restitution: 0.0,
        friction: 0.3,
      },
      this.scene
    );

    const body = this.physicsAggregate.body;
    body.setMotionType(PhysicsMotionType.ANIMATED); // Changed to ANIMATED
    body.disablePreStep = false;

    console.log("Character physics initialized");
  }

  private update(): void {
    if (
      !this.physicsAggregate?.body ||
      !this.targetPosition ||
      !this.startPosition ||
      !this.isMoving
    )
      return;

    const currentPos = this.root.position;
    const distanceToTarget = Vector3.Distance(
      new Vector3(currentPos.x, 0, currentPos.z),
      new Vector3(this.targetPosition.x, 0, this.targetPosition.z)
    );

    // Stop if we're close enough to target
    if (distanceToTarget < 0.5) {
      this.stopMovement();
      return;
    }

    // Calculate movement direction
    const direction = this.targetPosition.subtract(currentPos);
    direction.y = 0;
    direction.normalize();

    // Calculate target rotation
    const targetAngle = Math.atan2(direction.x, direction.z);
    const currentRotation = this.root.rotation.y;
    const angleDiff = targetAngle - currentRotation;
    const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

    // Apply rotation more smoothly
    const newRotation = currentRotation + normalizedDiff * 0.05; // Reduced from 0.1
    this.root.rotation.y = newRotation;

    // Only move if roughly facing the target (increased threshold)
    const isRotationAligned = Math.abs(normalizedDiff) < Math.PI / 6; // Changed from PI/12

    if (isRotationAligned) {
      const moveAmount = direction.scale(this.moveSpeed * (1 / 60));
      const newPosition = currentPos.add(moveAmount);

      // Get terrain height at new position
      const ray = new Ray(
        new Vector3(newPosition.x, 100, newPosition.z),
        new Vector3(0, -1, 0),
        1000
      );

      const hit = this.scene.pickWithRay(ray, (mesh) => mesh === this.terrain);
      if (hit?.pickedPoint) {
        newPosition.y = hit.pickedPoint.y + 1;
      }

      // Update position
      this.root.position = newPosition;

      // Update physics body
      if (this.physicsAggregate?.body) {
        const uprightQuaternion = Quaternion.FromEulerAngles(0, newRotation, 0);
        this.physicsAggregate.body.setTargetTransform(
          newPosition,
          uprightQuaternion
        );
      }
    }
  }

  private stopMovement(): void {
    if (!this.isMoving) return;

    console.log("Stopping movement");
    this.targetPosition = undefined;
    this.startPosition = undefined;
    this.isMoving = false;

    // Play idle animation
    const idleAnim = this.animationGroups.find((a) =>
      a.name.toLowerCase().includes("idle")
    );
    if (idleAnim) {
      this.playAnimation(idleAnim, true);
    }
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

    console.log("Moving to target:", target);
    this.isMoving = true;
    this.targetPosition = target;
    this.startPosition = this.root.position.clone();

    // Calculate total distance to travel (ignoring height)
    this.totalDistance = Vector3.Distance(
      new Vector3(this.startPosition.x, 0, this.startPosition.z),
      new Vector3(target.x, 0, target.z)
    );

    // Start walk animation
    const walkAnim = this.animationGroups.find((a) =>
      a.name.toLowerCase().includes("walk")
    );
    if (walkAnim) {
      this.playAnimation(walkAnim, true);
    }
  }

  public setPosition(position: Vector3): void {
    console.log("Setting position:", position);
    this.root.position = position;
    this.lastGroundY = position.y;
    if (this.physicsAggregate?.body) {
      this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
      this.physicsAggregate.body.setAngularVelocity(Vector3.Zero());
    }
  }

  public getPosition(): Vector3 {
    return this.root.position;
  }

  public dispose(): void {
    this.mesh?.dispose();
    this.mainLight.dispose();
    this.spotLight.dispose();
    this.root.dispose();
    this.physicsAggregate?.dispose();
    this.debugSphere?.dispose();
  }
}
