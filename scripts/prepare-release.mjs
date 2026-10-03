// Keep inherited, unverified and unused reference assets in source, out of release output.
import { rm } from 'node:fs/promises';
const archived = [
  'assets/soundtrack_1.mp3', 'assets/soundtrack_2.mp3', 'assets/soundtrack_3.mp3',
  'assets/end_credits.mp3', 'assets/hand_motif.png', 'assets/heightmap.png',
  'assets/fading-title.png', 'models/character.glb', 'HavokPhysics.wasm', 'wasm',
];
await Promise.all(archived.map(path => rm(`dist/${path}`, { recursive: true, force: true })));
