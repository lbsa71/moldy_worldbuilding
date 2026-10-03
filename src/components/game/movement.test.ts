import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Character } from "./Character";
import { CameraSystem } from "./CameraSystem";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).forEach(dispose => dispose());
  vi.restoreAllMocks();
});

function world(fps = 60) {
  const engine = new NullEngine();
  vi.spyOn(engine, "getDeltaTime").mockReturnValue(1000 / fps);
  const scene = new Scene(engine);
  const terrain = CreateGround("ground", { width: 50, height: 50 }, scene);
  terrain.computeWorldMatrix(true);
  cleanups.push(() => { scene.dispose(); engine.dispose(); });
  return { scene, engine, terrain, frame: () => scene.onBeforeRenderObservable.notifyObservers(scene) };
}

describe("time-based character movement", () => {
  it("travels the same distance in one second at 30, 60 and 120 FPS", () => {
    const distances = [30, 60, 120].map(fps => {
      const { scene, terrain, frame } = world(fps);
      const character = new Character(scene);
      void character.moveTo(new Vector3(20, 0, 0), terrain);
      for (let index = 0; index < fps; index++) frame();
      const distance = character.getPosition().x;
      character.dispose();
      return distance;
    });
    distances.forEach(distance => expect(distance).toBeCloseTo(4, 6));
  });

  it("snaps exactly to its grounded destination and resolves on arrival", async () => {
    const { scene, terrain, frame } = world(30);
    const character = new Character(scene);
    const arrived = vi.fn();
    const movement = character.moveTo(new Vector3(0.2, 0, 0), terrain).then(arrived);
    expect(arrived).not.toHaveBeenCalled();
    frame();
    frame();
    await movement;
    expect(character.getPosition().x).toBe(0.2);
    expect(character.getPosition().y).toBeCloseTo(0.04);
    expect(arrived).toHaveBeenCalledOnce();
    character.dispose();
  });

  it("settles movement immediately in reduced-motion mode and on disposal", async () => {
    const { scene, terrain } = world();
    const character = new Character(scene);
    const movement = character.moveTo(new Vector3(8, 0, 0), terrain);
    character.setReducedMotion(true);
    await movement;
    expect(character.getPosition().x).toBe(8);
    character.setReducedMotion(false);
    const cancelled = character.moveTo(new Vector3(10, 0, 0), terrain);
    character.dispose();
    await cancelled;
    expect(scene.onBeforeRenderObservable.hasObservers()).toBe(false);
  });
});

describe("directed camera", () => {
  it("makes the cup evidence readable, then returns to the bedside composition", () => {
    const { scene } = world();
    const system = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
    system.setReducedMotion(true);
    system.setNarrativeScene("cup"); system.updatePosition(new Vector3(20, 0, -20));
    expect(system.getCamera().target.x).toBeCloseTo(0.7);
    expect(system.getCamera().target.y).toBeCloseTo(0.56);
    expect(system.getCamera().target.z).toBeCloseTo(0.9);
    expect(system.getCamera().radius).toBeCloseTo(2.3);
    expect(system.getCamera().beta).toBeCloseTo(0.95);
    scene.render();
    expect(system.getCamera().radius).toBeCloseTo(2.3);
    system.setNarrativeScene("rail"); system.updatePosition(Vector3.Zero());
    expect(system.getCamera().radius).toBe(7);
    expect(system.getCamera().target.y).toBe(0.82);
    system.dispose();
  });
  it("stages the room above the narrow sheet and beside the desktop reading panel", () => {
    const { scene } = world();
    const canvas = { clientWidth: 760 } as HTMLCanvasElement;
    const system = new CameraSystem(scene, canvas);
    expect(system.getCamera().viewport).toMatchObject({ x: 0, y: 0.58, width: 1, height: 0.42 });
    expect(system.getCamera().radius).toBe(5);
    Object.defineProperty(canvas, "clientWidth", { value: 1440 });
    system.resize();
    expect(system.getCamera().viewport).toMatchObject({ x: 0.35, y: 0, width: 0.65, height: 1 });
    expect(system.getCamera().radius).toBe(7);
    expect(system.getCamera().beta).toBe(1.36);
    system.dispose();
  });

  it("keeps distant narrative positions framed around the fixed lamp room", () => {
    const { scene } = world();
    const system = new CameraSystem(scene, {} as HTMLCanvasElement);
    system.setReducedMotion(true);
    system.updatePosition(new Vector3(90, 0, -90));
    expect(system.getCamera().target.x).toBeCloseTo(0.7);
    expect(system.getCamera().target.y).toBeCloseTo(0.82);
    expect(system.getCamera().target.z).toBeCloseTo(-0.4);
    system.dispose();
  });

  it("settles equally after one second across refresh rates", () => {
    const positions = [30, 60, 120].map(fps => {
      const { scene } = world(fps);
      const camera = new CameraSystem(scene, {} as HTMLCanvasElement);
      camera.setCameraTarget(Vector3.Zero());
      for (let index = 0; index < fps; index++) camera.updatePosition(new Vector3(20, 0, 0));
      const x = camera.getCamera().target.x;
      camera.dispose();
      return x;
    });
    expect(positions[0]).toBeCloseTo(positions[1], 6);
    expect(positions[1]).toBeCloseTo(positions[2], 6);
  });
});
