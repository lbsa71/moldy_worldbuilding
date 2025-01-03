import { Scene, Vector3, ArcRotateCamera } from "@babylonjs/core";

export class CameraSystem {
  private camera: ArcRotateCamera;
  private heightOffset = 10; // Fixed height above avatar
  private maxRadius = 10; // Maximum distance in x/z plane
  private adjustmentSpeed = 0.05; // How quickly to adjust position/rotation

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    // Start behind and above the character
    this.camera = new ArcRotateCamera(
      "camera",
      Math.PI, // Start facing forward (behind character)
      Math.PI / 4, // 45 degree angle down
      this.maxRadius,
      Vector3.Zero(),
      scene
    );

    // Basic camera setup
    this.camera.attachControl(canvas, true);
    this.camera.panningSensibility = 0; // Disable panning
    
    // Limit camera angle to prevent weird views
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.lowerBetaLimit = Math.PI / 4;
  }

  public updatePosition(characterPosition: Vector3): void {
    // Calculate ideal camera height
    const targetHeight = characterPosition.y + this.heightOffset;
    
    // Get current camera position in x/z plane
    const currentPos = this.camera.position;
    const characterXZ = new Vector3(characterPosition.x, 0, characterPosition.z);
    const cameraXZ = new Vector3(currentPos.x, 0, currentPos.z);
    
    // Calculate distance in x/z plane
    const xzOffset = cameraXZ.subtract(characterXZ);
    const xzDistance = xzOffset.length();
    
    // If outside max radius, move closer
    if (xzDistance > this.maxRadius) {
      const direction = xzOffset.normalize();
      const targetXZ = characterXZ.add(direction.scale(this.maxRadius));
      
      // Smoothly move camera in x/z plane
      this.camera.position.x += (targetXZ.x - currentPos.x) * this.adjustmentSpeed;
      this.camera.position.z += (targetXZ.z - currentPos.z) * this.adjustmentSpeed;
    }
    
    // Smoothly adjust height
    this.camera.position.y += (targetHeight - currentPos.y) * this.adjustmentSpeed;
    
    // Update target to look at character
    this.camera.target = characterPosition;
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public setCameraTarget(target: Vector3): void {
    this.camera.target = target;
  }
}
