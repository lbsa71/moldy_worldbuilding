# Fading

Fading is a contemplative 3D narrative game built with Astro, Babylon.js, and Ink. The player moves through fog, light, hands, and half-remembered hospital spaces while accompanying a fading consciousness.

The current production direction is documented in:

- `docs/concept.md`
- `docs/elements.md`
- `docs/endings.md`
- `docs/instructions.md`
- `docs/production_plan.md`

## Development

```sh
npm install
npm run dev
```

The local dev server runs at `http://localhost:4321`.

## Quality Gates

```sh
npm run test
npm run check
npm run build
npm run validate
```

`npm run validate` runs the content/unit tests, Astro type checking, the WASM build, and the production Astro build.

## Content Rules

- The Ink script must compile before runtime.
- Dialogue should avoid repeated filler lines and mojibake.
- Object and audio tags must reference implemented assets.
- The 100x100 terrain is intentionally finite.
- Late story positions can move into the liminal off-map band to make endings feel like leaving reliable ground.
