declare namespace __AdaptedExports {
  /** Exported memory */
  export const memory: WebAssembly.Memory;
  /**
   * assembly/gameLogic/calculatePhysics
   * @param x `f32`
   * @param y `f32`
   * @param z `f32`
   * @returns `f32`
   */
  export function calculatePhysics(x: number, y: number, z: number): number;
}
/** Instantiates the compiled WebAssembly module with the given imports. */
export declare function instantiate(module: WebAssembly.Module, imports: {
}): Promise<typeof __AdaptedExports>;
