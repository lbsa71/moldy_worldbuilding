I’m building a demo for a narrative-driven web game using Astro, Babylon.js, and Ink (via inkjs). The goal is to load an Ink script, display its dialogues using Babylon.js's GUI system, and move an avatar to a specific position on the ground mesh for each Ink knot (where each knot corresponds to a unique 2D position). Here's what I need:

Requirements:
Integrate Ink Support:

Use src/utils/ink.ts to load a minimal Ink script src/ink/demo.ink.
Parse and manage dialogue progression and choices using inkjs.

Babylon.js Integration:

There is already a Babylon.js scene in src/components/GameScene.ts with:
A ground mesh representing a 2D plane.
A simple avatar in src/components/game/Character.ts with a src/components/game/CharacterController.ts and a  src/components/game/CharacterSystem.ts
- this should change to move to specified positions based on the current Ink knot.
Use Babylon.js GUI for displaying dialogue text and rendering interactive choice buttons.
Astro Integration:

There's an astro app in src/pages/index.astro and src/components/Game.astro

All interactivity (dialogue, avatar movement, etc.) should occur within the Babylon.js scene.
Minimal Ink Script Example:

Each Ink knot defines:
Dialogue text.
Choices for progression.
A position tag indicating the avatar’s next location on the ground mesh (see example script).


Key Features to Implement:
Load the Ink script using inkjs and parse its contents.
Display dialogue and choices using Babylon.js GUI (text overlays and buttons).
On choice selection:
Progress to the next knot.
Read the position tag to determine the new 2D location.
Use the existing character movement to animate the avatar moving to the new position on the ground mesh.
Keep all interactions within the Babylon.js scene.
Deliverables:
A single Astro project with:
A Babylon.js canvas rendering the interactive scene.
Dialogue and choices rendered using Babylon.js GUI.
Clear, modular code:
Ink integration logic (loading, parsing, handling choices).
Babylon.js scene setup and animations.
Minimal Astro integration to host the app.
Notes:
Keep the demo lightweight and focused on showing the interaction between Ink and Babylon.js.
