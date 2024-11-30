import {
  Scene,
  Vector3,
  Color3,
  AbstractMesh,
  TransformNode,
  PointLight,
  Animation,
  Ray,
  Mesh,
  GlowLayer,
  SceneLoader,
  AnimationGroup,
  Quaternion,
  Space,
  EasingFunction,
  CircleEase,
  ICreateCapsuleOptions,
  StandardMaterial,
  Nullable,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

export class CharacterSystem {
  public characterRoot?: TransformNode;
  private character?: AbstractMesh;
  private characterLight?: PointLight;
  private glowLayer!: GlowLayer;
  private animationGroups: AnimationGroup[] = [];
  private currentAnimation?: AnimationGroup;
  private isMoving = false;

  constructor(private scene: Scene) {
    this.setupLighting();
  }

  private setupLighting(): void {
    // Add softer glow layer
    this.glowLayer = new GlowLayer("glow", this.scene, {
      mainTextureFixedSize: 1024,
      blurKernelSize: 128,
    });
    this.glowLayer.intensity = 0.8;
  }

  public async loadCharacter(): Promise<void> {
    // Create a root node for the character
    this.characterRoot = new TransformNode("characterRoot", this.scene);

    try {
      // Load character model with animations from local file
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "/models/",
        "character.glb",
        this.scene,
        (event) => {
          if (event.lengthComputable) {
            const progress = event.loaded / event.total;
            console.log(`Loading character: ${Math.round(progress * 100)}%`);
          }
        }
      );

      this.character = result.meshes[0];
      if (this.character && this.characterRoot) {
        this.character.parent = this.characterRoot;
        this.character.scaling = new Vector3(0.1, 0.1, 0.1);
        // Rotate character to face forward (Z-axis)
        this.character.rotate(Vector3.Up(), Math.PI);
      }

      // Store animation groups
      this.animationGroups = result.animationGroups;

      // Start idle animation if available
      const idleAnim = this.animationGroups.find((a) =>
        a.name.toLowerCase().includes("idle")
      );
      if (idleAnim) {
        this.playAnimation(idleAnim, true);
      }
    } catch (error) {
      console.error("Failed to load character model:", error);
      // Create fallback character if model fails to load
      this.createFallbackCharacter();
    }

    if (this.characterRoot) {
      // Add soft point light to character
      this.characterLight = new PointLight(
        "characterLight",
        new Vector3(0, 2, 0),
        this.scene
      );
      this.characterLight.parent = this.characterRoot;
      this.characterLight.intensity = 3;
      this.characterLight.radius = 25;
      this.characterLight.diffuse = new Color3(0.3, 0.5, 0.2);
      this.characterLight.specular = new Color3(0.1, 0.2, 0.05);

      // Add a second, larger light for ambient illumination
      const ambientLight = new PointLight(
        "characterAmbientLight",
        new Vector3(0, 1, 0),
        this.scene
      );
      ambientLight.parent = this.characterRoot;
      ambientLight.intensity = 1;
      ambientLight.radius = 50;
      ambientLight.diffuse = new Color3(0.1, 0.15, 0.05);
      ambientLight.specular = new Color3(0, 0, 0);

      // Position the character
      this.characterRoot.position = new Vector3(0, 0, 0);
    }
  }

  private playAnimation(
    animation: AnimationGroup,
    loop: boolean = false
  ): void {
    // Stop current animation if any
    if (this.currentAnimation) {
      this.currentAnimation.stop();
    }

    // Start new animation
    animation.loopAnimation = loop;
    animation.start(true);
    this.currentAnimation = animation;
  }

  private createFallbackCharacter(): void {
    if (!this.characterRoot) return;

    console.warn("Using fallback character model");

    const options: ICreateCapsuleOptions = {
      radius: 0.5,
      height: 2,
      tessellation: 8,
      subdivisions: 1,
      capSubdivisions: 8,
    };

    // Create capsule and check if it was created successfully
    const capsule: Nullable<Mesh> = Mesh.CreateCapsule(
      "character",
      options,
      this.scene
    );
    if (capsule) {
      capsule.parent = this.characterRoot;
      this.character = capsule;

      // Create a material for the capsule
      const material = new StandardMaterial("capsuleMaterial", this.scene);
      material.diffuseColor = new Color3(0.4, 0.6, 0.3);
      material.emissiveColor = new Color3(0.2, 0.3, 0.1);
      capsule.material = material;
    }
  }

  private async turnToTarget(targetDirection: Vector3): Promise<void> {
    if (!this.characterRoot) return;

    return new Promise((resolve) => {
      // Get current and target rotations
      const currentRotation = this.characterRoot.rotation.y;
      const targetRotation = Math.atan2(targetDirection.x, targetDirection.z);

      // Calculate shortest rotation path
      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

      // If the rotation is very small, skip the animation
      if (Math.abs(rotationDiff) < 0.1) {
        resolve();
        return;
      }

      // Find turn animation
      const turnAnim = this.animationGroups.find((a) =>
        a.name.toLowerCase().includes("turn")
      );
      if (turnAnim) {
        this.playAnimation(turnAnim, false);
      }

      // Create rotation animation
      const rotationAnim = new Animation(
        "turnAnim",
        "rotation.y",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Add easing function
      const ease = new CircleEase();
      ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      rotationAnim.setEasingFunction(ease);

      // Create animation keys
      const keys = [];
      keys.push({
        frame: 0,
        value: currentRotation,
      });
      keys.push({
        frame: 20,
        value: currentRotation + rotationDiff,
      });
      rotationAnim.setKeys(keys);

      // Play the rotation animation
      this.scene.beginDirectAnimation(
        this.characterRoot,
        [rotationAnim],
        0,
        20,
        false,
        1,
        () => {
          resolve();
        }
      );
    });
  }

  public async moveCharacterTo(target: Vector3, terrain: Mesh): Promise<void> {
    if (!this.characterRoot || this.isMoving) return;

    this.isMoving = true;

    // Calculate direction
    const direction = target.subtract(this.characterRoot.position);
    direction.y = 0; // Keep character upright

    // Turn to face target first
    await this.turnToTarget(direction);

    // Find walk animation
    const walkAnim = this.animationGroups.find((a) =>
      a.name.toLowerCase().includes("walk")
    );
    if (walkAnim) {
      this.playAnimation(walkAnim, true);
    }

    // Create movement animation
    const moveAnim = new Animation(
      "moveAnim",
      "position",
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    // Add easing
    const ease = new CircleEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    moveAnim.setEasingFunction(ease);

    const keys = [];
    keys.push({
      frame: 0,
      value: this.characterRoot.position.clone(),
    });
    keys.push({
      frame: 30,
      value: target,
    });
    moveAnim.setKeys(keys);

    // Play the movement animation
    this.scene.beginDirectAnimation(
      this.characterRoot,
      [moveAnim],
      0,
      30,
      false,
      1,
      () => {
        // Switch back to idle animation
        const idleAnim = this.animationGroups.find((a) =>
          a.name.toLowerCase().includes("idle")
        );
        if (idleAnim) {
          this.playAnimation(idleAnim, true);
        }
        this.updateCharacterHeight(terrain);
        this.isMoving = false;
      }
    );
  }

  public updateCharacterHeight(terrain: Mesh): void {
    if (!this.characterRoot) return;

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

    const hit = this.scene.pickWithRay(ray, (mesh) => mesh === terrain);
    if (hit?.pickedPoint) {
      this.characterRoot.position.y = hit.pickedPoint.y + 1; // Add offset for character height
    }
  }
}
