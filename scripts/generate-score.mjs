/** Original score study for Fading. No recordings, samples, or third-party music.
 * Rebuild with Node 22+ and ffmpeg on PATH: node scripts/generate-score.mjs
 * A 48-second D-centred loop, recurring two-note knocks and slow harmonic breath.
 */
import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const rate = 44100, seconds = 48, count = rate * seconds;
const midi = note => 440 * 2 ** ((note - 69) / 12);
const scores = {
  hushed: { chords: [[38,57,64],[38,57,62],[41,57,64],[38,57,62]], melody: [74,69,76,74], gain: .65 },
  warm: { chords: [[38,53,57,64],[41,57,60,64],[43,58,62,65],[38,53,57,62]], melody: [74,77,76,74], gain: .85 },
  uneasy: { chords: [[38,57,63],[39,55,62],[38,56,64],[38,57,63]], melody: [74,75,69,74], gain: .60 },
  resolved: { chords: [[38,53,57,62],[41,57,60,64],[43,53,58,62],[38,53,57,62]], melody: [77,76,74,62], gain: .80 },
};
mkdirSync('public/assets', { recursive: true });
function note(left, right, pitch, start, duration, level, pad, pan) {
  const f = midi(pitch), n = Math.floor(duration * rate), offset = Math.floor(start * rate);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = pad ? Math.sin(Math.PI * i / n) ** 2 : (1 - Math.exp(-t / .018)) * Math.exp(-t / 1.9) * Math.min(1, (duration - t) / .3);
    const shimmer = 1 + .08 * Math.sin(2 * Math.PI * .17 * t);
    const tone = Math.sin(2 * Math.PI * f * t) + (pad ? .16 : .27) * Math.sin(2 * Math.PI * f * 2 * t) * (pad ? 1 : Math.exp(-t));
    const soft = Math.sin(2 * Math.PI * f * 1.0007 * t);
    const j = (offset + i) % count;
    left[j] += (tone * .75 + soft * .25) * env * level * shimmer * Math.sqrt((1 - pan) / 2);
    right[j] += (tone * .7 + soft * .3) * env * level * shimmer * Math.sqrt((1 + pan) / 2);
  }
}
for (const [name, score] of Object.entries(scores)) {
  const left = new Float32Array(count), right = new Float32Array(count);
  score.chords.forEach((chord, bar) => {
    chord.forEach((pitch, voice) => note(left, right, pitch, bar * 12, 20, .032 * score.gain, true, (voice % 2 ? 1 : -1) * .35));
    // The two close notes recall a hand tapping the rail before making contact.
    note(left, right, score.melody[bar], bar * 12 + 3, 8, .052 * score.gain, false, -.22);
    note(left, right, score.melody[bar] - 7, bar * 12 + 3.65, 8, .037 * score.gain, false, .22);
    if (name !== 'hushed') note(left, right, chord.at(-1) + 12, bar * 12 + 9, 8, .024 * score.gain, false, .1);
  });
  const dryL = left.slice(), dryR = right.slice();
  for (const [delay, gain] of [[.31,.19],[.73,.14],[1.19,.09],[2.07,.055]]) {
    const samples = Math.floor(delay * rate);
    for (let i = 0; i < count; i++) { const j = (i + samples) % count; left[j] += dryR[i] * gain; right[j] += dryL[i] * gain; }
  }
  const wav = Buffer.alloc(44 + count * 4);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length - 8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(rate,24); wav.writeUInt32LE(rate * 4,28); wav.writeUInt16LE(4,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(count * 4,40);
  let peak = 0;
  for (let i = 0; i < count; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1,left[i] * 3)) * 32767),44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1,right[i] * 3)) * 32767),46 + i * 4);
  }
  if (peak * 3 >= .95) throw new Error(`${name} exceeded headroom: ${peak * 3}`);
  const temporary = join(tmpdir(), `fading-score-${process.pid}-${name}.wav`);
  writeFileSync(temporary,wav);
  const result = spawnSync('ffmpeg',['-y','-v','error','-i',temporary,'-codec:a','libmp3lame','-b:a','160k',`public/assets/fading-${name}.mp3`],{stdio:'inherit'});
  unlinkSync(temporary);
  if (result.status !== 0) throw new Error('ffmpeg is required to render the score');
  console.log(`${name}: ${seconds}s, peak ${(20*Math.log10(peak*3)).toFixed(1)} dBFS`);
}
// A separate short rail cue can be synchronized to the remembered two taps.
const tap = '0.16*(sin(2*PI*880*t)+0.3*sin(2*PI*1763*t))*exp(-14*t)';
const secondTap = 'if(gte(t,0.65),0.14*(sin(2*PI*880*(t-0.65))+0.3*sin(2*PI*1763*(t-0.65)))*exp(-14*(t-0.65)),0)';
const cueResult = spawnSync('ffmpeg',['-y','-v','error','-f','lavfi','-i',`aevalsrc='${tap}+${secondTap}':s=44100:d=2.5`,'-ac','2','-codec:a','libmp3lame','-b:a','160k','public/assets/fading-taps.mp3'],{stdio:'inherit'});
if (cueResult.status !== 0) throw new Error('Could not render the rail cue');
