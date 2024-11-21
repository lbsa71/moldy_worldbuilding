// src/components/GameScene.ts
import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
} from "@babylonjs/core";

declare global {
  interface Window {
    calculatePhysics: (x: number, y: number, z: number) => number;
  }
}

export class GameScene {
  private engine: Engine;
  private scene: Scene;

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    // Wait for WASM to be ready before initializing
    if (window.calculatePhysics) {
      this.initialize();
    } else {
      const checkWasm = setInterval(() => {
        if (window.calculatePhysics) {
          clearInterval(checkWasm);
          this.initialize();
        }
      }, 100);
    }
  }

  private initialize(): void {
    // Same Babylon.js setup as before
    const camera = new FreeCamera(
      "camera1",
      new Vector3(0, 5, -10),
      this.scene
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.canvas, true);

    const light = new HemisphericLight(
      "light1",
      new Vector3(0, 1, 0),
      this.scene
    );

    const ground = MeshBuilder.CreateGround(
      "ground1",
      { width: 6, height: 6 },
      this.scene
    );

    const box = MeshBuilder.CreateBox("box1", { size: 1 }, this.scene);
    box.position.y = 1;

    // Example of using WASM
    const physics = window.calculatePhysics(
      box.position.x,
      box.position.y,
      box.position.z
    );
    console.log("WASM physics result:", physics);
  }

  public render(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }
}
