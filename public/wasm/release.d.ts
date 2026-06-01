declare namespace __AdaptedExports {
  /** Exported memory */
  export const memory: WebAssembly.Memory;
  /**
   * assembly/index/add
   * @param a `i32`
   * @param b `i32`
   * @returns `i32`
   */
  export function add(a: number, b: number): number;
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
