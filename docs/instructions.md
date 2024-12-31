I’m building a demo for a narrative-driven web game using Astro, Babylon.js, and Ink (via inkjs). The goal is to load an Ink script, display its dialogues using Babylon.js's GUI system, and move an avatar to a specific position on the ground mesh for each Ink knot (where each knot corresponds to a unique 2D position). 
My ink parser src/utils/ink.ts loads a minimal Ink script src/ink/demo.ink using inkjs.

There is already a Babylon.js scene in src/components/GameScene.ts with:
A ground mesh representing a 2D plane.
A simple avatar in src/components/game/Character.ts with a src/components/game/CharacterController.ts and a  src/components/game/CharacterSystem.ts
- this should change to move to specified positions based on the current Ink knot.
Use Babylon.js GUI for displaying dialogue text and rendering interactive choice buttons.
Astro Integration:

There's an astro app in src/pages/index.astro and src/components/Game.astro

All interactivity (dialogue, avatar movement, etc.) should occur within the Babylon.js scene.

Since the audio can't start before the user has interacted with the scene, I need a title screen with the game name and a 'start my journey' button; preferrably designed giving the same pensive melancholic mystical vibe as the world and dialog itdelf. 
