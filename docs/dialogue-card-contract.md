# Dialogue reading flow and fit contract

Updated 7 October 2026. Applies to `journey-2026-10-07-v2`. The first revision solved long scrolling passages by making each paragraph a short page. The user found that correction too fragmented and requested roughly two to three times more text at once, with desktop play taking priority. This revision groups the existing prose; story wording, choices and save edition remain unchanged.

## Current reading contract

| Element | Bound or target | Writing and presentation rule |
| --- | --- | --- |
| Grouped prose card | Target roughly 70–100 words; upper bounds **100 whitespace-delimited words and 660 characters** | Keep adjacent paragraphs together where they fit. A paragraph break preserves an expressive pause; it does not force a new page. Shorter passages are valid. |
| Choice label | 8 words and 48 characters | Make the intended act clear; the surrounding passage supplies its stakes. |
| Heading | 30 characters | Orient the reader without retelling the scene. |
| Ink beat | Up to 4 choices | A complete dramatic beat may occupy one grouped card. Do not add Continue presses to simulate decisions or duration. |

The shared [DialogueCards helper](../src/game/experience/DialogueCards.ts) implements the grouping bounds and preserves paragraph breaks and source offsets. Browser fitting can subdivide a group when the available space or chosen text size requires it. Keep the final paragraph beside its responses when it fits; use a separate decision card as a fallback. Never discard, clip, ellipsize or shrink prose to satisfy a page count.

Continue and Back navigate the same Ink passage. They neither submit a choice, change facts or props, replay scene/audio cues, nor add another transcript entry. The full passage appears once in history. Numeric shortcuts act only when responses are visible. Save/resume retains the passage entrance and reading position; resizing or regrouping uses the source position to keep the reader near the same text. A real decision or restart opens the first card of its new passage.

The [route audit](evidence/journey-01-routes.json) records **nine base grouped prose cards per route**, compared with 35 paragraph-sized pages under the superseded policy. Each group currently contains at most **93 words, 535 characters and four paragraphs**. Viewport reflow and separate decision pages can increase the number actually displayed. All 1,344 sequences retain eight decisions, seven possible accounts and 744–829 visible words including options. These measurements do not establish playtime or enjoyment.

## Desktop fit and small-screen adaptation

Desktop reading flow is the release priority. Check every exact reachable tuple of heading, prose, ordered choice labels and ending status with production `DialogueUI` and `experience.css`, retaining a witness route. Use 1440×900 as a desktop baseline and record additional desktop/laptop sizes actually reviewed. Exercise Standard, Large and Extra large text (1, 1.2 and 1.4); record browser, fonts and source hashes. Editorial word limits alone cannot establish physical fit.

At the recorded desktop targets require complete, legible prose and choices, without panel/document scrolling, offscreen controls or overlap. Standard prose remains at least 16px and choices at least 14px; the larger-text settings increase them. Actionable reading/choice controls remain at least 44px in each dimension. Include terminal cards and restoration/storage notices, and check the full passage survives pagination unchanged.

Small screens retain adaptive fitting, navigation and readable controls. Their results are diagnostic: **mobile compatibility and the former 667×320 minimum are not release-blocking requirements** for this desktop-first direction. Do not fragment ordinary desktop passages to satisfy a phone viewport. Record any remaining small-screen limitation honestly; no viewport audit is a claim about every physical device, font or zoom level.

## Historical evidence

The [earlier fit matrix](evidence/journey-02-card-fit.json) belongs to the superseded 35-word/220-character, paragraph-per-page policy. Its 15 configurations passed across 375 distinct variants, three notice states and 70,160 rendered page observations. Preserve that record as evidence of the earlier implementation; it does **not** validate the current grouping or establish that its frequent paging was enjoyable. Current browser results are recorded with their source hashes in the [implementation status](implementation-status.md).

## Reproduce

1. Run `npm run dev` and open `/__card-study/`. This audit endpoint exists only in development and does not ship in the static build.
2. Set a desktop viewport and text scale, then select **Run card fit audit**. The harness compiles the actual Ink, traverses every reachable prefix and renders the production component, checking every resulting page and notice state.
3. Save reports under `docs/evidence/` with their viewport and source hashes. Review representative passages in `/journey/` with the real scene visible. Additional small-screen runs are useful diagnostics, not the desktop release gate.
4. Run `npm run validate`. Route tests check grouped-card limits, text/source-offset preservation, consequences, permission gates and empty endings. UI/save tests check navigation, transcript uniqueness, shortcuts, stale controls and restored reading position.

Human review still needs to establish whether the fuller passages sustain attention and leave enough room for the scene. The complete game's 30–45 minute target must come from consequential encounters, not extra words, forced waits or navigation taps.
