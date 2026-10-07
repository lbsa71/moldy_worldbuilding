import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Node } from '@babylonjs/core/node';
import { fullStage, type StagePresence } from '../../game/presentation/SceneDirection';

/** One source of object presence for the main view, mirror and shadow pass. */
export class SceneStudyObjects {
  private readonly initialRotation: Quaternion;
  private turn = 0;
  private targetTurn = 0;
  private reducedMotion = false;
  private cupVisible = true;
  private closed = false;
  private stage = fullStage();
  private readonly stageNodes: Partial<Record<keyof StagePresence, Node>>;

  constructor(
    private readonly chair: TransformNode,
    private readonly cup: TransformNode,
    private readonly meshes: readonly AbstractMesh[],
    private readonly applyRenderLists: (visibleMeshes: AbstractMesh[]) => void,
  ) {
    // glTF may export quaternion rotations. Retain the authored opening orientation.
    this.initialRotation = chair.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(chair.rotation);
    const scene = chair.getScene();
    this.stageNodes = {
      chair,
      lamp: scene.getNodeByName('Fading_StudyLamp') ?? scene.getNodeByName('Fading_Lamp') ?? undefined,
      books: scene.getNodeByName('Fading_StudyBooks') ?? undefined,
      // The accepted export groups rail and fabric beneath one curtain root.
      // Hide their individual meshes so either can remain meaningful on its own.
      curtain: scene.getNodeByName('StudyPartialCurtain') ?? undefined,
      rail: scene.getNodeByName('StudyBedRail') ?? undefined,
    };
    chair.rotationQuaternion = this.initialRotation.clone();
    chair.computeWorldMatrix(true);
    cup.computeWorldMatrix(true);
    // setParent preserves the cup's world transform, including an authored seat offset.
    if (!cup.isDescendantOf(chair)) cup.setParent(chair, true);
    this.syncPresence();
  }

  private syncPresence(): void {
    if (this.closed) return;
    for (const key of Object.keys(this.stageNodes) as (keyof StagePresence)[]) {
      this.stageNodes[key]?.setEnabled(this.stage[key] === 'present');
    }
    this.cup.setEnabled(this.cupVisible);
    this.applyRenderLists(this.meshes.filter(mesh => !mesh.isDisposed() && mesh.isEnabled() && mesh.isVisible && mesh.getTotalVertices() > 0));
  }

  private applyTurn(): void {
    this.chair.rotationQuaternion = this.initialRotation.multiply(Quaternion.RotationAxis(Vector3.Up(), this.turn));
    this.chair.computeWorldMatrix(true);
  }

  setChairTurned(value: boolean): void {
    if (this.closed) return;
    this.targetTurn = value ? -Math.PI / 9 : 0;
    if (this.reducedMotion) { this.turn = this.targetTurn; this.applyTurn(); }
  }

  setCupVisible(value: boolean): void {
    if (this.closed) return;
    this.cupVisible = value;
    this.syncPresence();
  }

  /** Editorial cuts replace the complete arrangement without a second animation clock. */
  settleArrangement(chairTurned: boolean, cupVisible: boolean, stage: StagePresence = fullStage()): void {
    if (this.closed) return;
    this.targetTurn = this.turn = chairTurned ? -Math.PI / 9 : 0;
    this.cupVisible = cupVisible;
    this.stage = { ...stage };
    this.applyTurn();
    this.syncPresence();
  }

  getChairTurnAngle(): number { return this.turn; }
  refreshPresence(): void { this.syncPresence(); }

  /** One director clock animates the chair, its child cup, mirror and shadows. */
  setEditorialTurn(angle: number, targetTurned: boolean): void {
    if (this.closed) return;
    this.turn = angle;
    this.targetTurn = targetTurned ? -Math.PI / 9 : 0;
    this.applyTurn();
  }

  setReducedMotion(value: boolean): void {
    if (this.closed) return;
    this.reducedMotion = value;
    if (value) { this.turn = this.targetTurn; this.applyTurn(); }
  }

  update(deltaSeconds: number): void {
    if (this.closed || this.turn === this.targetTurn) return;
    const distance = this.targetTurn - this.turn;
    const step = Math.min(Math.max(deltaSeconds, 0), 0.05) * 0.55;
    this.turn += Math.sign(distance) * Math.min(Math.abs(distance), step);
    this.applyTurn();
  }

  reset(): void {
    if (this.closed) return;
    this.targetTurn = this.turn = 0;
    this.cupVisible = true;
    this.stage = fullStage();
    this.applyTurn();
    this.syncPresence();
  }

  getState(): { chairTurned: boolean; cupVisible: boolean; reducedMotion: boolean; settled: boolean; stage: StagePresence } {
    return { chairTurned: this.targetTurn !== 0, cupVisible: this.cupVisible && this.stage.chair === 'present',
      reducedMotion: this.reducedMotion, settled: this.turn === this.targetTurn, stage: { ...this.stage } };
  }

  dispose(): void { this.closed = true; }
}
