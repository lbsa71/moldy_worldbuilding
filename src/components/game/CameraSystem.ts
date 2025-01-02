import {
  Scene,
  Vector3,
  ArcRotateCamera,
  Animation,
  EasingFunction,
  CubicEase,
} from "@babylonjs/core";

export class CameraSystem {
  private camera: ArcRotateCamera;
  private cameraTarget = Vector3.Zero();
  private cameraHeightOffset = 5;
  private cameraDistanceFromCharacter = 15;
  private cameraSmoothingFactor = 0.1;
  private cameraFocus? : Vector3;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI * 0.75,
      Math.PI * 0.35,
      this.cameraDistanceFromCharacter,
      this.cameraTarget,
      scene
    );

    this.setupCamera(canvas);
  }

  private setupCamera(canvas: HTMLCanvasElement): void {
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 15;
    this.camera.upperRadiusLimit = 50;
    this.camera.wheelDeltaPercentage = 0.01;

    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.lowerBetaLimit = Math.PI / 4;

    this.camera.inertia = 0.7;
    this.camera.angularSensibilityX = 500;
    this.camera.angularSensibilityY = 500;

    this.camera.panningSensibility = 0;
  }

  public updatePosition(characterPosition: Vector3): void {
    this.cameraTarget = Vector3.Lerp(
      this.cameraTarget,
      new Vector3(
        characterPosition.x,
        characterPosition.y + this.cameraHeightOffset,
        characterPosition.z
      ),
      this.cameraSmoothingFactor
    );

    this.camera.target = this.cameraTarget;
  }

  public animateToPosition(
    targetPosition: Vector3,
    targetAlpha: number,
    targetBeta: number,
    frameRate = 30,
    duration = 120
  ): void {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

    Animation.CreateAndStartAnimation(
      "cameraPosition",
      this.camera,
      "position",
      frameRate,
      duration,
      this.camera.position,
      targetPosition,
      0,
      ease
    );

    Animation.CreateAndStartAnimation(
      "cameraAlpha",
      this.camera,
      "alpha",
      frameRate,
      duration,
      this.camera.alpha,
      targetAlpha,
      0,
      ease
    );

    Animation.CreateAndStartAnimation(
      "cameraBeta",
      this.camera,
      "beta",
      frameRate,
      duration,
      this.camera.beta,
      targetBeta,
      0,
      ease
    );
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public setCameraTarget(target: Vector3): void {
    this.cameraTarget = target;
    this.camera.target = target;
  }

  public setCameraFocus(target?: Vector3): void {
    this.cameraFocus = target;
  }
}
