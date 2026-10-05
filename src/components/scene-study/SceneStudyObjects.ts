import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/** One source of object presence for the main view, mirror and shadow pass. */
export class SceneStudyObjects {
  private readonly initialRotation: Quaternion;
  private turn = 0;
  private targetTurn = 0;
  private reducedMotion = false;
  private cupVisible = true;
  private closed = false;

  constructor(
    private readonly chair: TransformNode,
    private readonly cup: TransformNode,
    private readonly meshes: readonly AbstractMesh[],
    private readonly applyRenderLists: (visibleMeshes: AbstractMesh[]) => void,
  ) {
    // glTF may export quaternion rotations. Retain the authored opening orientation.
    this.initialRotation = chair.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(chair.rotation);
    chair.rotationQuaternion = this.initialRotation.clone();
    chair.computeWorldMatrix(true);
    cup.computeWorldMatrix(true);
    // setParent preserves the cup's world transform, including an authored seat offset.
    if (!cup.isDescendantOf(chair)) cup.setParent(chair, true);
    this.syncPresence();
  }

  private syncPresence(): void {
    if (this.closed) return;
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
  settleArrangement(chairTurned: boolean, cupVisible: boolean): void {
    if (this.closed) return;
    this.targetTurn = this.turn = chairTurned ? -Math.PI / 9 : 0;
    this.cupVisible = cupVisible;
    this.applyTurn();
    this.syncPresence();
  }

  getChairTurnAngle(): number { return this.turn; }

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
    this.applyTurn();
    this.syncPresence();
  }

  getState(): { chairTurned: boolean; cupVisible: boolean; reducedMotion: boolean; settled: boolean } {
    return { chairTurned: this.targetTurn !== 0, cupVisible: this.cupVisible, reducedMotion: this.reducedMotion, settled: this.turn === this.targetTurn };
  }

  dispose(): void { this.closed = true; }
}
