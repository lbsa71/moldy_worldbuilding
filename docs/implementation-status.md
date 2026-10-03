# Fading implementation and verification

3 October 2026. This records the implementation waves following the [baseline critique, SWOT and remedy plan](assessment-and-remedy.md). It is a substantially improved playable chapter, not a claim of AAA production completion. The implementation is prepared for the requested main-branch release; [GitHub Actions](https://github.com/lbsa71/moldy_worldbuilding/actions) records its validation and deployment status.

## What changed

| Area | Delivered behavior |
| --- | --- |
| Narrative | An eleven-decision chapter with specific cup, chair and bedside memories; a contradiction about who brought the tea; callbacks to silence, consent and a chosen keepsake; three equally available resolutions: keep, carry and rest. The old story is preserved separately. |
| Player experience | Semantic HTML dialogue and choices, an authored cup detail view, keyboard navigation and keys 1–4, visible focus, conversation history, text size, sound/volume and reduced motion controls, explicit ending/replay, and local save/resume. Audio and motion preferences persist; text size is session-only. |
| World response | Strict scene, fog, mood, position and object tags; bounded authored positions; a persistent lamp and stable memory-prop identities; a turning chair and different ending light states. Dialogue advances independently of audio loading. |
| Art | A slate-blue, brass and bone palette, staged bedside composition, shared glow, subtle ground texture, restrained dust, original Blender lamp/chair/cup/bedside props and a procedural attention marker. Procedural props remain as loading/failure fallbacks. A generated title illustration establishes the intended atmosphere; it is concept art, separate from the real-time asset study. |
| Music and sound | Four original 48-second synthesized ambient score studies, a recurring two-note motif, a synchronized two-tap rail cue, overlapping score fades, latest-request ownership, and bounded playback with volume, mute, pause and cleanup. No third-party samples. |
| Runtime | WebGPU initialization with WebGL recovery, startup ownership and disposal, renderer resize and tab visibility handling, frame-rate-independent movement, strict story validation and safe restart. |
| Build and delivery | Repaired lockfile, updated root toolchain, lazy game/compiler loading, targeted Babylon imports, release-asset filtering, and CI that validates and deploys the tested artifact. The separate Cloudflare worker remains a further review item. |

Three GPT-6.1 Sol agents at high reasoning handled narrative, runtime and scene work, with the primary agent integrating the interface, score, asset direction, build pipeline and verification. The agents also reviewed each other's interfaces and added focused regression coverage. No more expensive model escalation was needed for this implementation wave.

## Verification performed

| Check | Result and limits |
| --- | --- |
| Clean install | `npm ci --no-fund` succeeded with the updated lockfile. Node 24.13.0 was used locally; the declared minimum is Node 22.12. |
| Automated suite | **133 tests passed in 11 files.** Covers story contract and outcomes, 162 complete mixed-choice histories, save/reset behavior, launch/retry/disposal, movement, visual state, semantic controls, audio races, fades and one-shot cleanup. Added binary GLB integrity/semantic/budget checks and imported-asset cache, fallback, state-continuity and disposal coverage. |
| Type checking | `astro check`: **0 errors, 0 warnings, 25 hints**. Remaining hints are largely unused/unreachable declarations in inherited code. |
| Production build | `npm run validate` passed; production build passed after the Blender integration. Vite reports a chunk-size advisory for the renderer/PBR bundle; see sizes below. `git diff --check` passed. |
| Real browser | Played the original upgraded build through all eleven decisions to the Carry coda, then exercised the Blender build through the Rest coda and restart; verified the selected keepsake callback and dimmed PBR lamp. Also checked save restoration, numeric keyboard choices, settings, reduced motion and mute. Automated story tests cover all three endings; this is not a claim that every path received human playtesting. |
| Responsive presentation | Inspected at 1440×900 and 390×844. Standard-size choices remain visible on the phone layout; 140% dialogue text uses a scrollable panel. These are desktop browser viewport checks, not physical mobile-device validation. |
| Renderer compatibility | Initial WebGPU testing exposed an unsupported RGB raw texture; RGBA fixed it. The Blender wave was then inspected in actual WebGPU and explicit WebGL modes, including PBR lamp emission, model visibility and cup framing. Blocking model URLs verified that procedural fallbacks and choices remain usable. The block was removed after testing. Device-matrix testing remains. |
| Release assets | Inspected the built file list: the reviewed GLBs, new score, tap cue and optimized title image are included with game code. Inherited recordings, images, model and unused WASM are excluded. |
| Blender production | Blender 5.2.2 LTS on the Windows management host generated, rendered and reimport-validated the source and GLBs. The pushed handoff was selectively imported here and every delivered checksum verified. See [coordination](blender-coordination.md) for exact revisions and source provenance. |

### Measured JavaScript payload

Sizes below are local production-file bytes and gzip bytes, not network traces or frame-rate results. Exact hashes may change on subsequent builds.

| Chunk | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Babylon, baseline | 5,374,840 | 1,192,920 |
| Babylon, procedural first wave | 1,575,863 | 370,367 |
| Babylon, current with glTF/PBR | 2,150,780 | 504,040 |
| Current launch/interface entry | 16,191 | 5,714 |
| Current lazy game scene | 47,170 | 14,837 |
| Current lazy Ink compiler | 236,915 | 59,529 |

The current renderer/glTF/PBR chunk is approximately **60% smaller** than the baseline, or **58% smaller gzipped**. Supporting the imported materials increased it from the procedural first-wave size; it now exceeds the build's 2 MB chunk advisory threshold. Ink still compiles in the browser after launch; build-time compilation is a worthwhile later improvement. Frame rate, peak memory, thermal behavior and slow-network loading have not yet been benchmarked against agreed target hardware.

## Visual evidence

Actual production-browser screenshots, captured after the changes:

![Desktop real-time chapter with Blender assets](evidence/blender-desktop-overview.jpg)

![Phone-width real-time cup detail](evidence/blender-mobile-cup.jpg)

The [title PNG](../public/assets/fading-title.png) and its [full generation prompt and provenance](asset-provenance.md) are separate from this real-time evidence. The active title uses the optimized WebP. All new runtime geometry and score material is project-authored. The consolidated Blender set contains 9,564 triangles, 10 base-pass mesh primitives and 306,720 bytes of GLBs. Those ten primitives exclude scenery, the support table, particles and extra rendering passes; they are not the whole scene's draw-call count. No external asset download was necessary in this wave.

## Remaining production work, in order

1. **Refine the integrated asset study.** The [generator and run instructions](../scripts/blender/README.md) now reproduce reviewed original hero models. The first handoff is integrated, with human-scale staging, optional loading, independent rail/curtain visibility and PBR ending emission. Continue artist review of surfaces, composition, shadows, LODs and close-up detail; measure their device costs before increasing complexity. See [coordination status](blender-coordination.md) for the subsequent primitive consolidation.
2. **Playtest the complete chapter with people.** Check whether the memory contradiction is comprehensible, silence feels acknowledged, the final choice feels earned, and the presence sounds like a person. Revise from observed reactions before adding chapters. Resolve target duration, audience and voice/localization scope.
3. **Finish art and sound with human review.** Refine hero materials, staging, animation and transitions against the actual camera. Listen to all loops, boundaries and transitions on headphones, phone and speakers; replace or refine score studies as needed. Current synthesis is an original working score, not a professionally mastered soundtrack.
4. **Measure target devices and accessibility.** Real WebGPU/WebGL desktop and mobile runs, screen-reader navigation, zoom/reflow, contrast, motion sensitivity, long sessions and repeated restarts. Establish frame, memory and load budgets from measured hardware. DOM controls and viewport checks are a foundation, not an accessibility certification.
5. **Close dependency and provenance gaps.** The root audit fell from 32 findings to two high-severity package entries: `http-cache-semantics` and its affected parent Astro. These represent [one underlying advisory](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), with no patched version published at this check. Npm's proposed force fix would downgrade Astro to 2.10.9. Do not apply that downgrade blindly. The static artifact does not expose Astro's remote-image cache to players, but the dependency advisory remains unresolved. Reassess applicability and a maintained fix before release. Audit the separate worker toolchain and verify the vendored Ink revision/license. Existing unverified media stays out of release output.
6. **Verify production delivery.** The saved Cloudflare token failed direct verification as invalid during release preparation and needs replacement in the repository's `CLOUDFLARE_API_TOKEN` secret. Confirm the resulting GitHub Actions run, R2 serving and cache behavior, exact artifact deployment, failure recovery and rollback. Files are uploaded with HTML last; this is not an atomic deployment transaction. Add release credits and save migration policy before expanding the game.

The [art/audio production brief](art-and-audio-production.md) and [narrative direction](narrative-direction.md) define the next pass. The quality bar remains deliberately ambitious; further content should pass those gates rather than merely increase asset or word count.
