import {
  Scene,
  Vector3,
  Color3,
  Color4,
  ParticleSystem,
  Texture,
  HemisphericLight,
} from "@babylonjs/core";

export class AtmosphereSystem {
  private groundMist!: ParticleSystem;
  private atmosphericMist!: ParticleSystem;
  private ambientLight!: HemisphericLight;
  private mistTexture: Texture;
  private initialFogDensity: number;
  private initialGroundMistEmitRate: number;
  private initialAtmosphericMistEmitRate: number;

  constructor(private scene: Scene) {
    this.mistTexture = this.createMistTexture();
    this.setupLighting();
    this.setupFog();
    this.groundMist = this.createGroundMist();
    this.atmosphericMist = this.createAtmosphericMist();
    this.initialFogDensity = this.scene.fogDensity;
    this.initialGroundMistEmitRate = this.groundMist.emitRate;
    this.initialAtmosphericMistEmitRate = this.atmosphericMist.emitRate;
  }

  private createMistTexture(): Texture {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return new Texture(canvas.toDataURL(), this.scene);
  }

  private setupLighting(): void {
    // Dim ambient lighting with slight color
    this.ambientLight = new HemisphericLight(
      "ambientLight",
      new Vector3(0.5, 1, 0.8),
      this.scene
    );
    this.ambientLight.intensity = 0.2;
    this.ambientLight.groundColor = new Color3(0.04, 0.06, 0.04);
    this.ambientLight.diffuse = new Color3(0.15, 0.2, 0.15);
  }

  private setupFog(): void {
    // Less dense exponential fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.05;
    this.scene.fogColor = new Color3(0.04, 0.06, 0.04);
    this.scene.fogStart = 20;
    this.scene.fogEnd = 60;
  }

  private createGroundMist(): ParticleSystem {
    const mistSystem = new ParticleSystem("groundMist", 2000, this.scene);

    // Use shared texture
    mistSystem.particleTexture = this.mistTexture;

    // Emission box near ground
    mistSystem.minEmitBox = new Vector3(-50, 0, -50);
    mistSystem.maxEmitBox = new Vector3(50, 0.5, 50);

    // Soft green-gray colors with moderate opacity
    mistSystem.color1 = new Color4(0.15, 0.2, 0.15, 0.3);
    mistSystem.color2 = new Color4(0.2, 0.25, 0.2, 0.4);
    mistSystem.colorDead = new Color4(0.15, 0.2, 0.15, 0);

    // Larger, slower particles
    mistSystem.minSize = 15.0;
    mistSystem.maxSize = 25.0;
    mistSystem.minLifeTime = 4.0;
    mistSystem.maxLifeTime = 6.0;

    // Moderate emission rate
    mistSystem.emitRate = 200;

    // Blending for soft appearance
    mistSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    // Gentle upward drift
    mistSystem.gravity = new Vector3(0, 0.02, 0);

    // Slow random movement
    mistSystem.direction1 = new Vector3(-0.05, 0, -0.05);
    mistSystem.direction2 = new Vector3(0.05, 0.1, 0.05);

    // Slight rotation
    mistSystem.minAngularSpeed = 0;
    mistSystem.maxAngularSpeed = 0.1;

    // Very slow emission
    mistSystem.minEmitPower = 0.1;
    mistSystem.maxEmitPower = 0.2;

    // Enable GPU particles for better performance
    mistSystem.isBillboardBased = true;
    mistSystem.useRampGradients = false;

    // Start the system
    mistSystem.start();

    return mistSystem;
  }

  private createAtmosphericMist(): ParticleSystem {
    const atmosphericSystem = new ParticleSystem(
      "atmosphericMist",
      1000,
      this.scene
    );

    // Use shared texture
    atmosphericSystem.particleTexture = this.mistTexture;

    // Emit in a larger volume
    atmosphericSystem.minEmitBox = new Vector3(-50, 2, -50);
    atmosphericSystem.maxEmitBox = new Vector3(50, 15, 50);

    // Very transparent, soft colors
    atmosphericSystem.color1 = new Color4(0.15, 0.2, 0.15, 0.15);
    atmosphericSystem.color2 = new Color4(0.2, 0.25, 0.2, 0.2);
    atmosphericSystem.colorDead = new Color4(0.15, 0.2, 0.15, 0);

    // Large, slow-moving particles
    atmosphericSystem.minSize = 25.0;
    atmosphericSystem.maxSize = 35.0;
    atmosphericSystem.minLifeTime = 6.0;
    atmosphericSystem.maxLifeTime = 8.0;

    // Sparse emission rate
    atmosphericSystem.emitRate = 80;

    // Very soft blending
    atmosphericSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    // Almost no gravity
    atmosphericSystem.gravity = new Vector3(0, 0.01, 0);

    // Very slow random movement
    atmosphericSystem.direction1 = new Vector3(-0.02, 0, -0.02);
    atmosphericSystem.direction2 = new Vector3(0.02, 0.05, 0.02);

    // Minimal rotation
    atmosphericSystem.minAngularSpeed = 0;
    atmosphericSystem.maxAngularSpeed = 0.05;

    // Extremely slow emission
    atmosphericSystem.minEmitPower = 0.05;
    atmosphericSystem.maxEmitPower = 0.1;

    // Enable GPU particles for better performance
    atmosphericSystem.isBillboardBased = true;
    atmosphericSystem.useRampGradients = false;

    // Start the system
    atmosphericSystem.start();

    return atmosphericSystem;
  }

  public updateFog(trust: number): void {
    // Map trust (0-8) to fog density (0.002 - 0.012)
    const minFogDensity = 0.002;
    const maxFogDensity = this.initialFogDensity;
    const fogDensity =
      minFogDensity + (maxFogDensity - minFogDensity) * (1 - Math.min(1, trust / 8));
    
      console.log("fogDensity:", fogDensity);

    this.scene.fogDensity = fogDensity;

    // Map trust to particle emission rates
    const minEmitRate = 20;
    const maxGroundEmitRate = this.initialGroundMistEmitRate;
    const maxAtmosphericEmitRate = this.initialAtmosphericMistEmitRate;

    this.groundMist.emitRate =
      minEmitRate + (maxGroundEmitRate - minEmitRate) * Math.min(1, trust / 8);
    this.atmosphericMist.emitRate =
      minEmitRate + (maxAtmosphericEmitRate - minEmitRate) * Math.min(1, trust / 8);
  }
}
