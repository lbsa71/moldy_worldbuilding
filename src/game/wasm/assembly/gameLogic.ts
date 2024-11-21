// src/game/wasm/assembly/gameLogic.ts
memory.grow(1);

/** Calculate physics for a point in 3D space */
export function calculatePhysics(x: f32, y: f32, z: f32): f32 {
  // Example physics calculation in AssemblyScript
  return x * x + y * y + z * z;
}
