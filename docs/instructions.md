"I’m building a demo for a narrative-driven web game using Astro, Babylon.js, and Ink (via inkjs). The goal is to load an Ink script, display its dialogues using Babylon.js's GUI system, and move an avatar to a specific position on the ground mesh for each Ink knot (where each knot corresponds to a unique 2D position). Here's what I need:

Requirements:
Integrate Ink Support:

Use inkjs to load a minimal Ink script (demo script provided below).
Parse and manage dialogue progression and choices using inkjs.
Babylon.js Integration:

Create a Babylon.js scene with:
A ground mesh representing a 2D plane.
A simple avatar (e.g., a sphere or sprite) that moves to specified positions based on the current Ink knot.
Use Babylon.js GUI for displaying dialogue text and rendering interactive choice buttons.
Astro Integration:

Build the app as an Astro project where Babylon.js is rendered as a canvas element.
All interactivity (dialogue, avatar movement, etc.) should occur within the Babylon.js scene.
Minimal Ink Script Example:

Each Ink knot should define:
Dialogue text.
Choices for progression.
A position tag indicating the avatar’s next location on the ground mesh (example script below).
Example Ink Script:
ink
Copy code
=== knot_1 ===
This is the first dialogue. Where do you want to go?

- Go to the north. -> knot_2
- Go to the east. -> knot_3
  -> END

# position: { "x": 0, "z": 0 }

=== knot_2 ===
You’ve arrived at the north.

- Back to start. -> knot_1
  -> END

# position: { "x": 0, "z": 5 }

=== knot_3 ===
You’ve reached the east.

- Back to start. -> knot_1
  -> END

# position: { "x": 5, "z": 0 }

Key Features to Implement:
Load the Ink script using inkjs and parse its contents.
Display dialogue and choices using Babylon.js GUI (text overlays and buttons).
On choice selection:
Progress to the next knot.
Read the position tag to determine the new 2D location.
Animate the avatar moving to the new position on the ground mesh.
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
Use placeholders for the avatar and ground mesh (e.g., a sphere for the avatar, a flat plane for the ground)."
