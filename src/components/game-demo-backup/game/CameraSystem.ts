import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Animation,
  EasingFunction,
  CubicEase,
} from "@babylonjs/core";

export class CameraSystem {
  private camera: ArcRotateCamera;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      15,
      new Vector3(0, 0, 0),
      scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 5;
    this.camera.upperRadiusLimit = 25;
    this.camera.wheelDeltaPercentage = 0.01;
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public animateToPosition(
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
}
