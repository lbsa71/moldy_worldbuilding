import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CameraSystem } from "./CameraSystem";
import { Character } from "./Character";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(dispose => dispose());
  vi.restoreAllMocks();
});

/** Match GameScene's construction and before-render callback ordering, while running
 * actual Scene.render() camera updates, view-matrix caching and mesh world updates. */
function renderedJourney(width: number, fps: number) {
  const engine = new NullEngine({
    renderWidth: width, renderHeight: 900, textureSize: 512,
    deterministicLockstep: false, lockstepMaxSteps: 4,
  });
  vi.spyOn(engine, "getDeltaTime").mockReturnValue(1000 / fps);
  const scene = new Scene(engine);
  const cameraSystem = new CameraSystem(scene, { clientWidth: width } as HTMLCanvasElement);
  const terrain = CreateGround("ground", { width: 80, height: 80 }, scene);
  const character = new Character(scene, () => 0);
  character.setPosition(new Vector3(0, 0.04, 0));
  scene.registerBeforeRender(() => cameraSystem.updatePosition(character.getPosition()));
  cameraSystem.setNarrativeScene("lamp", character.getPosition());
  cameraSystem.setCameraTarget(character.getPosition());
  cleanups.push(() => {
    character.dispose(); cameraSystem.dispose(); scene.dispose(); engine.dispose();
  });
  const camera = cameraSystem.getCamera();
  const snapshot = () => {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const listener = Vector3.Project(character.getPosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
    return {
      listener: character.getPosition().clone(),
      position: camera.position.clone(), globalPosition: camera.globalPosition.clone(),
      view: Array.from(camera.getViewMatrix().m),
      projected: new Vector3((listener.x - viewport.x) / viewport.width, (listener.y - viewport.y) / viewport.height, listener.z),
      viewport: camera.viewport,
    };
  };
  return { scene, character, terrain, cameraSystem, snapshot, render: () => scene.render() };
}

describe("camera through Babylon's rendered lifecycle", () => {
  for (const width of [760, 1440]) {
    for (const fps of [30, 60, 120]) {
      it(`moves the rendered view with the listener at ${width}px and ${fps} FPS`, async () => {
        const { character, terrain, cameraSystem, snapshot, render } = renderedJourney(width, fps);
        render();
        const opening = snapshot();
        const chair = new Vector3(4, 0.04, -2);
        cameraSystem.setNarrativeScene("chair", chair);
        const movement = character.moveTo(chair, terrain);
        for (let frame = 0; frame < fps; frame++) render();
        const transit = snapshot();
        expect(Vector3.Distance(transit.listener, opening.listener)).toBeCloseTo(4, 5);
        expect(Vector3.Distance(transit.position, opening.position)).toBeGreaterThan(2.3);
        expect(Vector3.Distance(transit.globalPosition, opening.globalPosition)).toBeGreaterThan(2.3);
        expect(transit.view).not.toEqual(opening.view);
        expect(transit.projected.x).toBeGreaterThan(0.1);
        expect(transit.projected.x).toBeLessThan(0.9);
        expect(transit.projected.y).toBeGreaterThan(0.1);
        expect(transit.projected.y).toBeLessThan(0.95);
        expect(transit.projected.z).toBeGreaterThan(0);
        expect(transit.projected.z).toBeLessThan(1);
        for (let frame = 0; frame < fps * 3; frame++) render();
        await movement;
        const arrived = snapshot();
        expect(arrived.listener.x).toBe(4);
        expect(arrived.listener.z).toBe(-2);
        expect(Vector3.Distance(arrived.position, opening.position)).toBeGreaterThan(4);
        expect(Vector3.Distance(arrived.position, arrived.globalPosition)).toBeLessThan(0.00001);
        expect(arrived.projected.x).toBeGreaterThan(0.25);
        expect(arrived.projected.x).toBeLessThan(0.75);
      });
    }
  }

  it("renders a new cup station and then restores the opening view on restart", async () => {
    const { character, terrain, cameraSystem, snapshot, render } = renderedJourney(1440, 60);
    render();
    const opening = snapshot();
    const cup = new Vector3(9, 0.04, 3);
    cameraSystem.setNarrativeScene("cup", cup);
    const movement = character.moveTo(cup, terrain);
    for (let frame = 0; frame < 360; frame++) render();
    await movement;
    const atCup = snapshot();
    expect(Vector3.Distance(atCup.position, opening.position)).toBeGreaterThan(7);
    expect(atCup.view).not.toEqual(opening.view);
    const cupEvidence = Vector3.TransformCoordinates(new Vector3(9.7, 0.6, 3.9), cameraSystem.getCamera().getViewMatrix());
    expect(cupEvidence.x).toBeCloseTo(0, 2);
    expect(cupEvidence.y).toBeCloseTo(0, 2);
    cameraSystem.setNarrativeScene("lamp", new Vector3(0, 0.04, 0));
    character.setPosition(new Vector3(0, 0.04, 0));
    cameraSystem.setCameraTarget(character.getPosition());
    render();
    const restarted = snapshot();
    expect(Vector3.Distance(restarted.position, opening.position)).toBeLessThan(0.00001);
    expect(Vector3.Distance(restarted.globalPosition, opening.globalPosition)).toBeLessThan(0.00001);
    expect(restarted.view).toEqual(opening.view);
  });

  it("renders reduced-motion arrival in the next frame without a stale view matrix", async () => {
    const { character, terrain, cameraSystem, snapshot, render } = renderedJourney(760, 60);
    render();
    const opening = snapshot();
    const rail = new Vector3(14, 0.04, 7);
    cameraSystem.setNarrativeScene("rail", rail);
    character.setReducedMotion(true); cameraSystem.setReducedMotion(true);
    await character.moveTo(rail, terrain);
    render();
    const arrived = snapshot();
    expect(Vector3.Distance(arrived.position, opening.position)).toBeGreaterThan(10);
    expect(Vector3.Distance(arrived.globalPosition, opening.globalPosition)).toBeGreaterThan(10);
    expect(arrived.view).not.toEqual(opening.view);
    expect(arrived.projected.x).toBeCloseTo(0.5, 1);
    expect(arrived.projected.z).toBeGreaterThan(0);
    expect(arrived.projected.z).toBeLessThan(1);
  });
});
