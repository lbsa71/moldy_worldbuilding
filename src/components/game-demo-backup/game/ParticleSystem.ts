import {
  Scene,
  ParticleSystem as BabylonParticleSystem,
  Texture,
  Vector3,
  Color4,
  Color3,
  Mesh,
} from "@babylonjs/core";

export class ParticleSystemManager {
  constructor(private scene: Scene) {}

  public createExplosion(emitter: Mesh, color: Color4): BabylonParticleSystem {
    const particles = new BabylonParticleSystem("particles", 2000, this.scene);
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
    particles.blendMode = BabylonParticleSystem.BLENDMODE_ONEONE;
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

  public createExplosionAndDispose(
    emitter: Mesh,
    color: Color4,
    duration: number = 1000
  ): void {
    const particles = this.createExplosion(emitter, color);
    particles.start();
    setTimeout(() => particles.dispose(), duration);
  }

  public createExplosionEffect(mesh: Mesh, color: Color4): void {
    // Store the original position and visibility
    const originalPosition = mesh.position.clone();

    // Create explosion particles
    this.createExplosionAndDispose(mesh, color);

    // Hide the mesh
    mesh.visibility = 0;

    // Generate new random position
    const randomPosition = new Vector3(
      (Math.random() - 0.5) * 20, // X between -10 and 10
      Math.random() * 5 + 1, // Y between 1 and 6
      (Math.random() - 0.5) * 20 // Z between -10 and 10
    );

    // Generate new random color
    const newColor = new Color3(Math.random(), Math.random(), Math.random());

    // After explosion animation, rematerialize
    setTimeout(() => {
      // Move to new position
      mesh.position = randomPosition;

      // Update material color
      if (mesh.material) {
        const material = mesh.material as any;
        if (material.albedoColor) {
          material.albedoColor = newColor;
          material.emissiveColor = newColor.scale(0.5);
        }
      }

      // Create materialization particles
      this.createExplosionAndDispose(
        mesh,
        new Color4(newColor.r, newColor.g, newColor.b, 1.0)
      );

      // Show the mesh
      mesh.visibility = 1;
    }, 1000);
  }
}
