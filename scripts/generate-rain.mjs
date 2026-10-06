/** Original remembered-rain texture: deterministic noise, no recordings/samples.
 * Rebuild with Node and ffmpeg: node scripts/generate-rain.mjs
 * Periodic filtering carries its state across the loop boundary; no fade-to-silence seam.
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const rate = 44100, seconds = 12, count = rate * seconds;
let seed = 0xFADE105;
const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
function filter(input, coefficient) {
  let state = 0;
  const output = new Float32Array(count);
  // First lap warms up; subsequent lap uses the steady periodic boundary state.
  for (let lap = 0; lap < 2; lap++) for (let i = 0; i < count; i++) {
    state += coefficient * (input[i] - state);
    output[i] = state;
  }
  return output;
}
const common = Float32Array.from({ length: count }, () => random() * 2 - 1);
const channels = [0, 1].map(() => {
  const white = Float32Array.from(common, value => value * 0.6 + (random() * 2 - 1) * 0.4);
  const soft = filter(white, 0.32), rumble = filter(soft, 0.018);
  return Float32Array.from(soft, (value, i) => value - rumble[i]);
});
let peak = 0, square = 0;
for (const channel of channels) for (const value of channel) { peak = Math.max(peak, Math.abs(value)); square += value * value; }
const gain = 0.32 / peak;
const wav = Buffer.alloc(44 + count * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(count * 4, 40);
for (let i = 0; i < count; i++) for (let channel = 0; channel < 2; channel++) wav.writeInt16LE(Math.round(channels[channel][i] * gain * 32767), 44 + i * 4 + channel * 2);
const output = fileURLToPath(new URL('../public/assets/fading-rain-memory.mp3', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'fading-rain-'));
try {
  const input = join(temp, 'rain.wav'); writeFileSync(input, wav);
  mkdirSync(fileURLToPath(new URL('../public/assets/', import.meta.url)), { recursive: true });
  const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-codec:a', 'libmp3lame', '-b:a', '128k', '-metadata', 'title=Fading remembered rain', '-metadata', 'comment=Original deterministic filtered noise; no recordings or external samples', output], { encoding: 'utf8' });
  if (encoded.status !== 0) throw new Error(encoded.stderr || 'ffmpeg could not encode remembered rain');
  console.log(JSON.stringify({ output, seconds, seed: '0xFADE105', peak: peak * gain, rms: Math.sqrt(square / (count * 2)) * gain, boundarySteps: channels.map(channel => Math.abs(channel[0] - channel[count - 1]) * gain) }));
} finally { rmSync(temp, { recursive: true, force: true }); }
