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

  it("samples terrain at every changing position without ray-picking the dense mesh", async () => {
    const { scene, terrain, frame } = world(30);
    const pick = vi.spyOn(scene, "pickWithRay");
    const heightAt = vi.fn((x: number, z: number) => x * 0.5 - z * 0.2 + 2);
    const character = new Character(scene, heightAt);
    const movement = character.moveTo(new Vector3(2, 100, 1), terrain);
    for (let index = 0; index < 30; index++) {
      frame();
      const position = character.getPosition();
      expect(position.y).toBeCloseTo(position.x * 0.5 - position.z * 0.2 + 2.04);
    }
    await movement;
    expect(heightAt.mock.calls.length).toBeGreaterThan(10);
    expect(heightAt.mock.calls[0][0]).toBeGreaterThan(0);
    expect(heightAt.mock.calls.at(-1)).toEqual([2, 1]);
    expect(pick).not.toHaveBeenCalled();
    expect(character.getPosition().y).toBeCloseTo(2.84);
    character.setReducedMotion(true);
    await character.moveTo(new Vector3(5, 0, -2), terrain);
    expect(character.getPosition().y).toBeCloseTo(4.94);
    expect(pick).not.toHaveBeenCalled();
    character.dispose();
  });

  it("falls back to mesh grounding when a sampler cannot provide a finite height", async () => {
    const { scene, terrain } = world();
    terrain.position.y = 2;
    terrain.computeWorldMatrix(true);
    const pick = vi.spyOn(scene, "pickWithRay");
    const character = new Character(scene, () => Number.NaN);
    character.setReducedMotion(true);
    await character.moveTo(new Vector3(3, 100, 1), terrain);
    expect(pick).toHaveBeenCalledOnce();
    expect(character.getPosition().y).toBeCloseTo(2.04);
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

describe("journey camera", () => {
  it("follows a visible station traversal before settling into the destination cup", async () => {
    const { scene, terrain, frame } = world(60);
    terrain.position.y = 3.2;
    terrain.computeWorldMatrix(true);
    const character = new Character(scene);
    character.setPosition(new Vector3(4, 3.24, -2));
    const system = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
    system.setCameraTarget(character.getPosition());
    const destination = new Vector3(9, 3.24, 3);
    system.setNarrativeScene("cup", destination);
    const arrived = vi.fn();
    const movement = character.moveTo(destination, terrain).then(arrived);
    // The library owns its station snapshot; caller mutation cannot move the close-up.
    destination.x = 90;
    for (let index = 0; index < 60; index++) {
      frame(); system.updatePosition(character.getPosition());
    }
    expect(arrived).not.toHaveBeenCalled();
    expect(system.getCamera().target.x).toBeGreaterThan(5);
    expect(system.getCamera().target.x).toBeLessThan(9);
    expect(system.getCamera().target.z).toBeGreaterThan(-1);
    expect(system.getCamera().target.y).toBeCloseTo(4.06);
    expect(system.getCamera().radius).toBe(7);
    for (let index = 0; index < 60; index++) {
      frame(); system.updatePosition(character.getPosition());
    }
    await movement;
    expect(arrived).toHaveBeenCalledOnce();
    expect(character.getPosition().x).toBe(9);
    expect(system.getCamera().radius).toBeGreaterThan(2.3);
    expect(system.getCamera().radius).toBeLessThan(7);
    for (let index = 0; index < 180; index++) system.updatePosition(character.getPosition());
    expect(system.getCamera().target.x).toBeCloseTo(9.7, 2);
    expect(system.getCamera().target.y).toBeCloseTo(3.8, 2);
    expect(system.getCamera().target.z).toBeCloseTo(3.9, 2);
    expect(system.getCamera().radius).toBeCloseTo(2.3, 2);
    expect(system.getCamera().beta).toBeCloseTo(0.95, 2);
    scene.render();
    expect(system.getCamera().radius).toBeCloseTo(2.3, 2);
    system.dispose(); character.dispose();
  });

  it("keeps terrain-relative height and world coordinates even far from the opening", () => {
    const { scene } = world();
    const system = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
    system.setReducedMotion(true);
    system.setNarrativeScene("rail", new Vector3(90, 4, -90));
    system.updatePosition(new Vector3(90, 4, -90));
    expect(system.getCamera().target.x).toBe(90);
    expect(system.getCamera().target.y).toBeCloseTo(4.9);
    expect(system.getCamera().target.z).toBeCloseTo(-89.7);
    expect(system.getCamera().radius).toBe(8);
    system.dispose();
  });

  it("opens distinctive landscape views on arrival and returns to an ending overview", () => {
    const { scene } = world();
    const system = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
    system.setReducedMotion(true);
    system.setNarrativeScene("contradiction", new Vector3(22, 2, 6));
    system.updatePosition(new Vector3(17, 1, 9));
    expect(system.getCamera().radius).toBe(7);
    expect(system.getCamera().target.x).toBe(17);
    system.updatePosition(new Vector3(22, 2, 6));
    expect(system.getCamera().radius).toBe(9);
    const contradictionAngle = system.getCamera().alpha;
    system.setNarrativeScene("boundary", new Vector3(25, 3, 1));
    system.updatePosition(new Vector3(25, 3, 1));
    expect(system.getCamera().radius).toBeCloseTo(8.2);
    expect(system.getCamera().beta).toBeCloseTo(1.34);
    expect(system.getCamera().target.y).toBeCloseTo(3.9);
    const boundaryRadius = system.getCamera().radius;
    const boundaryBeta = system.getCamera().beta;
    expect(system.getCamera().alpha).not.toBe(contradictionAngle);
    system.setNarrativeScene("quiet", new Vector3(21, 2, -5));
    system.updatePosition(new Vector3(21, 2, -5));
    expect(system.getCamera().radius).toBe(10);
    expect(boundaryRadius).toBeLessThan(system.getCamera().radius);
    // Larger beta lowers the orbit toward eye level, rather than looking down from above.
    expect(boundaryBeta).toBeGreaterThan(system.getCamera().beta);
    for (const ending of ["keep", "rest"]) {
      system.setNarrativeScene(ending, Vector3.Zero());
      system.updatePosition(Vector3.Zero());
      expect(system.getCamera().target.x).toBe(0);
      expect(system.getCamera().target.y).toBeCloseTo(0.95);
      expect(system.getCamera().radius).toBe(12);
    }
    system.setNarrativeScene("carry", new Vector3(30, 2, -12));
    system.updatePosition(new Vector3(30, 2, -12));
    expect(system.getCamera().target.x).toBe(30);
    expect(system.getCamera().target.z).toBeCloseTo(-11.7);
    expect(system.getCamera().radius).toBe(14);
    expect(system.getCamera().beta).toBe(1.28);
    system.dispose();
  });

  it("restores the opening immediately on restart without retaining a distant close-up", () => {
    const { scene } = world();
    const system = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
    const cup = new Vector3(9, 2, 3);
    system.setNarrativeScene("cup", cup); system.setCameraTarget(cup);
    expect(system.getCamera().radius).toBeCloseTo(2.3);
    const opening = new Vector3(0, 1.14, 0);
    system.setNarrativeScene("lamp", opening); system.setCameraTarget(opening);
    expect(system.getCamera().target.x).toBe(0);
    expect(system.getCamera().target.y).toBeCloseTo(1.96);
    expect(system.getCamera().target.z).toBeCloseTo(0.3);
    expect(system.getCamera().radius).toBe(7);
    expect(system.getCamera().beta).toBe(1.36);
    system.dispose();
  });

  it("snaps movement and framing together when reduced motion is enabled", async () => {
    const { scene, terrain } = world();
    const character = new Character(scene);
    const system = new CameraSystem(scene, { clientWidth: 760 } as HTMLCanvasElement);
    system.setCameraTarget(character.getPosition());
    const destination = new Vector3(9, 0.04, 3);
    system.setNarrativeScene("cup", destination);
    const movement = character.moveTo(destination, terrain);
    character.setReducedMotion(true); system.setReducedMotion(true);
    await movement;
    system.updatePosition(character.getPosition());
    expect(system.getCamera().target.x).toBeCloseTo(9.7);
    expect(system.getCamera().target.y).toBeCloseTo(0.6);
    expect(system.getCamera().target.z).toBeCloseTo(3.9);
    expect(system.getCamera().radius).toBe(1.5);
    expect(system.getCamera().beta).toBe(0.95);
    system.dispose(); character.dispose();
  });

  it("reserves the narrow sheet and desktop reading panel when reframing distant stations", () => {
    const { scene } = world();
    const canvas = { clientWidth: 760 } as HTMLCanvasElement;
    const system = new CameraSystem(scene, canvas);
    expect(system.getCamera().viewport).toMatchObject({ x: 0, y: 0.58, width: 1, height: 0.42 });
    expect(system.getCamera().radius).toBe(5);
    system.setNarrativeScene("boundary", new Vector3(25, 2, 1));
    system.setCameraTarget(new Vector3(25, 2, 1));
    expect(system.getCamera().radius).toBeCloseTo(6.3);
    Object.defineProperty(canvas, "clientWidth", { value: 1440 });
    system.resize();
    expect(system.getCamera().viewport).toMatchObject({ x: 0.35, y: 0, width: 0.65, height: 1 });
    expect(system.getCamera().radius).toBeCloseTo(8.2);
    expect(system.getCamera().target.x).toBe(25);
    system.dispose();
  });

  it("settles equally after one second across refresh rates", () => {
    const positions = [30, 60, 120].map(fps => {
      const { scene } = world(fps);
      const camera = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
      camera.setCameraTarget(Vector3.Zero());
      for (let index = 0; index < fps; index++) camera.updatePosition(new Vector3(20, 3, 0));
      const target = camera.getCamera().target.clone();
      camera.dispose();
      return target;
    });
    expect(Vector3.Distance(positions[0], positions[1])).toBeLessThan(0.000001);
    expect(Vector3.Distance(positions[1], positions[2])).toBeLessThan(0.000001);
  });

  it("keeps the same moving station journey at 30, 60 and 120 FPS", async () => {
    const journeys = await Promise.all([30, 60, 120].map(async fps => {
      const { scene, terrain, frame } = world(fps);
      const character = new Character(scene);
      const camera = new CameraSystem(scene, { clientWidth: 1440 } as HTMLCanvasElement);
      camera.setCameraTarget(character.getPosition());
      const destination = new Vector3(9, 0.04, 3);
      camera.setNarrativeScene("cup", destination);
      const movement = character.moveTo(destination, terrain);
      for (let index = 0; index < fps; index++) {
        frame(); camera.updatePosition(character.getPosition());
      }
      const transit = camera.getCamera().target.clone();
      expect(camera.getCamera().radius).toBe(7);
      for (let index = 0; index < fps * 5; index++) {
        frame(); camera.updatePosition(character.getPosition());
      }
      await movement;
      const arrival = camera.getCamera().target.clone();
      const radius = camera.getCamera().radius;
      camera.dispose(); character.dispose();
      return { transit, arrival, radius };
    }));
    for (const journey of journeys) {
      expect(Vector3.Distance(journey.transit, journeys[0].transit)).toBeLessThan(0.055);
      expect(Vector3.Distance(journey.arrival, new Vector3(9.7, 0.6, 3.9))).toBeLessThan(0.003);
      expect(journey.radius).toBeCloseTo(2.3, 2);
    }
  });
});
