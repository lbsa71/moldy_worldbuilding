import {
  Scene,
  Vector3,
  TransformNode,
  Animation,
  EasingFunction,
  CircleEase,
  Mesh,
  Ray,
  AbstractMesh,
} from "@babylonjs/core";

export class CharacterController {
  private isMoving = false;
  private isRotating = false;
  private targetRotation = 0;
  private moveSpeed = 0.1;
  private rotationSpeed = 0.1;

  constructor(
    private scene: Scene,
    private root: TransformNode
  ) {}

  public async moveTo(target: Vector3, terrain: AbstractMesh): Promise<void> {
    if (this.isMoving) return;

    // Calculate direction to target
    const direction = target.subtract(this.root.position);
    direction.y = 0;

    // Calculate target rotation
    const targetAngle = Math.atan2(direction.x, direction.z);

    // First rotate to face target
    await this.rotateToAngle(targetAngle);

    // Then move to target
    await this.moveToPosition(target, terrain);
  }

  private async rotateToAngle(targetAngle: number): Promise<void> {
    return new Promise((resolve) => {
      // Normalize angles to 0 to 2PI range first
      let currentRotation = this.root.rotation.y % (Math.PI * 2);
      if (currentRotation < 0) currentRotation += Math.PI * 2;

      let normalizedTarget = targetAngle % (Math.PI * 2);
      if (normalizedTarget < 0) normalizedTarget += Math.PI * 2;

      // Calculate shortest rotation path
      let rotationDiff = normalizedTarget - currentRotation;

      // Ensure we take the shortest path
      if (Math.abs(rotationDiff) > Math.PI) {
        if (rotationDiff > 0) {
          rotationDiff -= Math.PI * 2;
        } else {
          rotationDiff += Math.PI * 2;
        }
      }

      // If already facing target, skip rotation
      if (Math.abs(rotationDiff) < 0.1) {
        resolve();
        return;
      }

      // Create rotation animation
      const rotationAnim = new Animation(
        "rotationAnim",
        "rotation.y",
        60,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Add easing
      const ease = new CircleEase();
      ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      rotationAnim.setEasingFunction(ease);

      // Animation keys
      const keys = [];
      keys.push({
        frame: 0,
        value: currentRotation,
      });
      keys.push({
        frame: Math.abs(rotationDiff) * 30,
        value: currentRotation + rotationDiff,
      });
      rotationAnim.setKeys(keys);

      // Play animation
      this.scene.beginDirectAnimation(
        this.root,
        [rotationAnim],
        0,
        Math.abs(rotationDiff) * 30,
        false,
        1,
        () => resolve()
      );
    });
  }

  private async moveToPosition(target: Vector3, terrain: AbstractMesh): Promise<void> {
    return new Promise((resolve) => {
      this.isMoving = true;

      // Create movement animation
      const moveAnim = new Animation(
        "moveAnim",
        "position",
        60,
        Animation.ANIMATIONTYPE_VECTOR3,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Add easing
      const ease = new CircleEase();
      ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      moveAnim.setEasingFunction(ease);

      // Calculate distance for duration
      const distance = Vector3.Distance(this.root.position, target);
      const duration = distance * 30; // Frames based on distance

      // Animation keys
      const keys = [];
      keys.push({
        frame: 0,
        value: this.root.position.clone(),
      });
      keys.push({
        frame: duration,
        value: target,
      });
      moveAnim.setKeys(keys);

      // Play animation
      this.scene.beginDirectAnimation(
        this.root,
        [moveAnim],
        0,
        duration,
        false,
        1,
        () => {
          this.isMoving = false;
          this.updateHeight(terrain);
          resolve();
        }
      );
    });
  }

  private updateHeight(terrain: AbstractMesh): void {
    const ray = new Ray(
      new Vector3(this.root.position.x, 100, this.root.position.z),
      new Vector3(0, -1, 0),
      1000
    );

    const hit = this.scene.pickWithRay(ray, (mesh) => mesh === terrain);
    if (hit?.pickedPoint) {
      this.root.position.y = hit.pickedPoint.y + 1;
    }
  }
}
