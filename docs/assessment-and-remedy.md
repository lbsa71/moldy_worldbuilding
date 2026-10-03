# Fading assessment and remedy plan

Assessment date: 3 October 2026. Baseline: commit `326cb74`, before the changes accompanying this report. References to old line numbers refer to that commit. This is a source audit and local browser review, not an audience study or certification of production readiness.

Fading has a strong small-game premise: accompany a fading presence through fragments of memory, with one lamp as a constant. Its best opportunity is an exceptional, tightly directed interactive chamber piece. The existing implementation is a prototype with disconnected systems, repetitive writing, and serious presentation problems. Adding more branches, particles, or model-generated assets before repairing those foundations would multiply the weaknesses.

“AAA level” should mean a demanding quality bar for authored moments, visual coherence, sound, usability, and reliability. It cannot honestly mean that this repository already has the asset library, performance coverage, animation, voice direction, localization, accessibility testing, or production team of a large commercial release. This plan establishes a complete playable chapter and defines the evidence required before expanding it.

## What exists

The active game uses Astro, Babylon.js and a vendored Ink compiler/runtime. The player selects dialogue choices; an avatar moves to coordinates associated with story passages. Procedural hills, primitive trees and rocks, hospital motifs, hand images and lamps appear around those passages. Four MP3 files provide a soundtrack and credits cue. The repository also contains a backup scene, an unused WASM physics calculation, a character model, and Cloudflare deployment infrastructure.

The design documents promise graded emotional response, silence as an interaction, layered sound, changing memory clarity, and philosophical endings. Several of those features are descriptions rather than implemented mechanics. The README is still the Astro starter README. This makes it difficult to distinguish a deliberate design from an experiment that happened to remain in the code.

Baseline validation found three passing tests, all focused on launch behavior; type checking reported no errors and 42 hints; the production build succeeded after repairing the dependency lockfile. A clean `npm ci` initially failed because platform entries for esbuild were missing. The baseline Babylon client chunk was 5.37 MB minified / 1.19 MB gzip; the eagerly loaded application/compiler chunk was 261 kB / 67 kB gzip. These are measured build sizes, not measured download times or device performance.

## Critical assessment

### Story and player agency

The nameless presence, lamp, care memories and uncertainty form a coherent emotional vocabulary. They make an achievable game concept because intimacy does not require a large world. The hospital imagery also gives abstraction a possible material anchor.

The writing repeatedly substitutes mood for incident. The four paths repeat variants of “your presence shapes this space” and reach almost identical speeches. A relationship is asserted before the player has done something particular enough to establish it. Choice text often describes an attitude in elaborate language rather than an understandable action. Most branches immediately reconverge, and the resulting world response does not demonstrate the distinction. See `src/ink/demo.ink:73–84`, `195–206`, and `502–514`.

There is no sustained dramatic question with a concrete payoff. Neither the remembered person nor the act of care becomes specific enough to surprise the player. The ending offers generic philosophical advice and abruptly commands the player to wake up; it feels detached from the preceding decisions. Ambiguity works better when facts are concrete and their meaning remains open.

State logic compounds the writing problem. `acknowledged_silence` is written but never read, and `visited_memory` is unused. The memory route can earn at most two trust points on a first run while its warm ending requires more than two; uncertainty can earn only one. Replays retain earlier trust and clarity, and once-only choices remove previously used entry paths. These are mechanical consequences without clear fictional justification. Silence is advertised as equal participation but often leads to the less connected ending. See `demo.ink:2–5`, `237–294`, `411–438`, and `524–581`.

Remedy: replace the repetitive route structure with a finite chapter built around one remembered act: someone left a light on and a place beside them. Give the player evidence to preserve, question, or leave unresolved; acknowledge silence in later dialogue; make the final act a real choice with distinct codas. Avoid diagnosing the presence, revealing a cheap “you were dead” twist, or scoring grief as correct and incorrect behavior. Human editorial review and player feedback remain necessary.

### Interaction and accessibility

The existing game is a choice-driven installation, not a free-roaming adventure. That is a valid design, but its presentation should explain it. A visible avatar and orbit camera imply movement controls that the game does not provide. The player has no reliable indication of ending, replay, mute, or motion settings.

The browser review at a narrow viewport showed choice text visibly clipped inside small canvas buttons. Dialogue occupies much of the scene and is difficult to separate from the world. Canvas controls do not expose the story or choices in the browser accessibility tree. See `GameScene.ts:94–145` and `CameraSystem.ts:25`. Pointer-only controls and fixed pixel heights exclude players and obscure the very content being presented.

Remedy: use a semantic HTML dialogue layer with natural text reflow, visible keyboard focus, native buttons, selectable text, an accessible history, audio and motion settings, and an explicit ending/restart flow. Keep the scene visible as the principal spatial response. Do not time out decisions or equate reading speed with silence. Any future timed silence should be opt-in and skippable.

### Art direction and graphics

The lamp could be a strong visual identity. Currently the scene mixes an imported humanoid, primitive conifer silhouettes, glossy green hills, floating hospital parts and an opaque hand photograph. The result lacks a consistent material language, scale, composition, or hierarchy. Random placement cannot replace authored staging. More geometry would not resolve this.

There are also concrete visual faults. The terrain occupies only ±50 units while routes reach ±90. The lamp light uses child-local coordinates without parenting, leaving illumination near the origin when the lamp moves (`Lamp.ts:36`). Lamps are disposed and respawned at every passage despite being the promised constant (`EnvironmentSystem.ts:50–82`). The hand texture is RGB without transparency, while the material assumes alpha (`HandMotif.ts:22–23`). State-driven object visibility ignores its arguments (`EnvironmentSystem.ts:302`).

The intended fog response is inverted in practice. Authored fog tags are parsed, then discarded, and raw trust is passed as density. Starting trust clears the fog; higher trust thickens it, and negative trust can yield negative emission rates (`GameScene.ts:74,119`; `AtmosphereSystem.ts:198–208`).

Remedy: direct a restrained scene of slate-blue mist, charcoal stone, bone-colored memory structures and a warm brass lamp. Use a persistent landmark, authored sightlines, silhouettes and a small number of readable props. Smooth transitions should express a decision. Share glow and materials, bound particles and lights, and favor deterministic layouts. A bespoke hero asset, environment material pass, character/animation decision and art review remain later production work.

### Music and sound

The project has four existing music files and a natural reason for adaptive music: attention, uncertainty and resolution can alter the same musical identity. The source does not establish authorship or license of these assets. Their quality cannot be inferred from filenames or code; this review does not claim a listening-panel assessment.

The playback system has correctness problems: rapid transitions share and overwrite `nextAudio`, cancel fade timers without resolving outstanding work, and invoke uncaught playback promises (`AudioSystem.ts:24–54`; `GameScene.ts:77–80`). Its claimed two-second fade actually reaches zero in about one second. It fades out before starting the next track rather than crossfading. There are no volume or mute controls, no coherent lifecycle, and no musical transition contract.

Remedy: implement bounded overlapping transitions, rejected-playback handling, pause/disposal, and independent player volume/mute control. Add an original restrained procedural motif and ambience as a working musical layer, with separate state changes for harmony and density. This is a composition prototype; a professional score still needs intentional stems, loop points, transitions, dynamic-range review, and listening tests on headphones, speakers and phones. Establish an asset provenance ledger before release. Spotify integration is not required for the creative premise and adds unnecessary external dependency at this stage.

### Engineering and delivery

The launch controller is a useful separation and already has tests. Ink is appropriate for explicit, inspectable branching. A static browser game can be easy to share and iterate. These are foundations to retain.

Runtime ownership is incomplete. WebGPU initialization has no WebGL recovery when capability detection succeeds but engine startup fails. GameScene has no disposal method, permanent resize/render handlers, and uncaught asynchronous work. Movement assumes 60 frames per second. Tag parsing accepts NaN coordinates and loose substring matches. The parser consumes multiple passages into one screen and keeps only their final tags, so written visual events can disappear before being displayed. See `GameScene.ts:166–169,251–259`, `Character.ts:173–180`, and `utils/ink.ts:25–59`.

The CI workflow updates dependencies and commits generated outputs, but does not validate the actual game. Deployment is triggered by a successful workflow run without sufficient event/branch restriction. The repository needs deterministic installation, tests/check/build at the game root, and deployment of the checked revision. Build success alone says little about the player experience.

Performance concerns requiring measurement include broad Babylon imports, runtime Ink compilation, repeated terrain raycasts, large alpha particle systems, per-lamp glow passes, and unrestricted object lights. The two mist systems are CPU ParticleSystems despite comments describing GPU particles. These are plausible costs, not benchmarked bottlenecks.

## SWOT

| Strengths | Weaknesses |
| --- | --- |
| A distinctive intimate premise with a memorable lamp motif. | Repetitive prose, shallow consequences and broken ending/state logic. |
| Small spatial scope suits a carefully authored experience. | Conflicting art styles and weak scene composition. |
| Ink makes narrative state explicit and testable. | Story, atmosphere, object visibility and movement do not agree. |
| Existing browser renderer, music, model and launch flow provide a starting point. | Inaccessible canvas dialogue, clipping, incomplete audio/lifecycle handling, and little meaningful test coverage. |

| Opportunities | Threats |
| --- | --- |
| Make silence, remembering and uncertainty distinct ways to participate. | Adding content before a verified narrative/world contract magnifies defects. |
| Use one excellent lamp-centered scene to establish a recognizable visual signature. | “AAA” scope inflation can eliminate the intimacy that makes the game distinctive. |
| Turn music and lighting into observable consequences without exposing moral scores. | Unverified asset rights or inconsistent generated assets can prevent release. |
| Test a complete short chapter cheaply with real players before scaling. | Mobile GPU/thermal limits, browser audio restrictions, and inaccessible controls can undermine an otherwise strong story. |
| Use targeted agents for independent implementation and critique. | Autonomous content volume can exceed the project's editorial and QA capacity. |

## Remedy and acceptance plan

These are ordered production gates, not calendar estimates. Duration and budget require an agreed platform, content length, team and asset strategy.

| Gate | Work | Evidence required to advance |
| --- | --- | --- |
| 1. Reproducible foundation | Repair lockfile; validate real application; fix launch retry, fallback and cleanup; establish strict tag contract. | Clean install, tests, type check and production build pass; failure/retry and cleanup tests pass. |
| 2. Complete chapter | Rewrite an opening, specific memory development, turning point and three distinct resolutions; add explicit replay and consequence callbacks. | Every ending reachable from a fresh state; no dead ends; silence has later acknowledgement; all positions and tags valid. |
| 3. Directed presentation | Recompose terrain, lamp, memory props, fog and camera; add accessible responsive dialogue and settings. | Desktop and narrow-screen screenshots; keyboard playthrough; legible choices; lamp/props aligned; reduced motion works. |
| 4. Musical response | Repair crossfades and controls; add a coherent original motif and ambience; document asset provenance. | Rapid cue changes do not reject or leak; mute/pause/restart behave; every ending has intentional sonic response. Human listening review remains required. |
| 5. Production proof | Build a target-device matrix; profile frames, load, memory and thermal behavior; commission or author final hero assets and stems; conduct narrative/accessibility playtests. | Measured performance reports, asset licenses, human QA and editor sign-off; no unresolved blocking defects. |
| 6. Expansion and release | Extend only the proven interaction grammar; add localization, production save migration, broader input support if needed, credits and release automation. | Release candidate passes the matrix and audience comprehension tests; each added scene meets the same bar. |

Proposed performance budgets for later measurement: 60 FPS on an agreed desktop baseline, 30 FPS on an agreed mobile baseline, no choice response blocked by audio loading, and no accumulation of scenes/audio across ten restarts. A claim of achieving these budgets requires measured devices and repeatable traces. Desktop browser success does not prove mobile performance.

The first implementation wave assigns a GPT-6.1 Sol agent to narrative/state tests, one to runtime/lifecycle, and one to scene art systems. The primary agent owns accessible interface, audio, integration, dependency/CI cleanup and final verification. File ownership is separated; interfaces are agreed before edits. More expensive model escalation is reserved for unresolved design or correctness problems, rather than using it for every edit.

## Production decisions still open

The current direction preserves a short, choice-driven browser experience. Before funding a larger game, decide the target duration, supported devices, whether an embodied avatar is artistically necessary, the intended degree of ambiguity, voice acting and localization scope, original music/asset ownership, and the size of the human creative/QA team. These decisions should follow the chapter playtest rather than block repairs that are already justified.

The implementation and validation record is maintained separately in `docs/implementation-status.md` so this baseline critique is not mistaken for a description of the improved build.
