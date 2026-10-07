# Dialogue card budget and fit contract

7 October 2026. Applies to the compact `journey-2026-10-07-v2` episode. The previous draft's scrolling and long passages interrupted play; this contract addresses readable cards and tests their physical fit. It does not establish emotional quality or enjoyable duration.

## Authoring limits

| Element | Hard limit | Writing rule |
| --- | --- | --- |
| One prose card | 35 words **and** 220 characters | One thought or exchange. Both limits include the displayed text; characters include spaces and punctuation. |
| One choice label | 8 words **and** 48 characters | Make the intended act clear. Put necessary stakes in the preceding prose, not an essay inside the button. |
| Heading | 30 characters | Orient the reader without retelling the scene. |
| One Ink beat | 2–4 prose cards, up to 4 choices | Cut repeated explanation before adding a card. The final paragraph must make sense beside the decision. |

A nonempty authored paragraph is a card. The UI provides fallback splitting for older long paragraphs. Continue and Back are navigation: neither submits an Ink choice, changes facts/props, replays scene/audio cues, nor adds a transcript entry. The full passage appears once in history. Numeric shortcuts work only when choices are visible. Save/resume retains the Ink entrance and reading position, including endings. A real decision and restart return to the first card.

The compact script currently reaches maxima of 31 prose words / 178 characters, 8 choice words / 48 characters, and 30 heading characters across every reachable variant. All 1,344 complete sequences retain eight decisions and the same seven possible accounts. Every route has 35 authored prose cards and 744–829 visible words including displayed options. Those figures do not count UI labels as story content and do not imply measured playtime.

## Rendered fit is the release gate

Editorial bounds are necessary but not sufficient. Font metrics, line breaks, choice count, accessibility size, safe areas and notices affect geometry. Use production `DialogueUI` and `experience.css` to check every exact reachable tuple of heading, text, ordered choice labels and ending status, retaining a witness route. Scene-ID-only sampling misses conditional text and choice variants.

Minimum target: a **667×320 CSS-pixel landscape viewport**. Also check 812×375 and 844×390 landscape, 375×667 portrait, and 1440×900 desktop. At every size, exercise Standard, Large and Extra large text (1, 1.2 and 1.4). Use the existing local font stack; record browser and computed fonts. This is a viewport contract, not a claim to have tested every physical phone or arbitrary browser zoom.

For every reading/decision/ending page, require:

- No panel or document overflow in either axis; text and visible controls stay inside the panel and viewport.
- No overlap between the card and header controls, or between reading/navigation/response controls.
- At least 16px prose and 14px choice text at Standard; accessibility settings increase them.
- At least 44px-wide and 44px-high actionable reading/choice targets.
- Complete content: do not clip, ellipsize or shrink text to make measurements pass.
- Restoration and storage notices remain readable without displacing choices offscreen.

Larger text may need more reading pages or a dedicated decision page. Keep the final prose beside the choices when it fits. Back must remain available to reread the context. Resizing must preserve the reader's location rather than choose a response.

## Measured result

The [recorded matrix](evidence/journey-02-card-fit.json) passes all **15 configurations**, covering 375 distinct variants, three notice states and 70,160 rendered page observations. Every report includes matching source hashes and its browser/font environment. Standard text uses 16px prose and 14px choices at the minimum landscape viewport. Extra large increases both by 1.4; it may subdivide paragraphs further or put all choices on an expanded decision card. A strict single-page word limit is therefore paired with responsive pagination, not treated as a universal physical guarantee.

## Reproduce

1. Run `npm run dev` and open `/__card-study/`. This audit endpoint exists only in the development server and does not ship in the static build.
2. Set a viewport from the matrix and a text scale, then run **Run card fit audit**. The harness traverses the actual compiled Ink and renders production controls; it reports variant/page counts, geometry failures, witness routes and source hashes.
3. Repeat the matrix and save the JSON reports under `docs/evidence/`. Investigate every failure, then replay representative cases in `/journey/` with the real scene visible.
4. Run `npm run validate`. Narrative checks must retain consequences, permission gates, route counts and identical empty endings after prose edits. UI/save checks cover navigation, transcript uniqueness, shortcuts, stale buttons, disposal and restoration.

The browser report establishes fit for its recorded environment. Device testing, safe-area behavior on physical notched phones, screen-reader experience and whether paging itself becomes tedious still need human review. Do not lengthen prose or add navigation taps to meet the full game's 30–45 minute target; earn that time through meaningful interaction.
