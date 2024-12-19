# Object Implementation Requirements for Story Scenes

Please implement the following objects for our Babylon.js scene. Each object should be defined in its own class file.

## Required Objects and Their Locations

### 1. Lamp (Lamp.ts)

Locations:

- (0, 0): Primary lamp in starting crossroads
- Referenced as "distant memory" at (90, 20)
  Properties:
- Emits soft light
- Glows through fog
- Should be visible at a distance

### 2. Guiding Hands (HandMotif.ts)

Locations:

- (10, 2): First appearance as "subtle silhouettes of hands"
- (40, 8): "faint hand motifs emerge and recede"
- (60, 12): Clearer hand motifs "almost like companions"
- (100, 22): Final appearance where they "slowly fade" in ending_warm
  Properties:
- Fade in/out capability
- Gentle floating animation
- Should be visible through fog
- Varying levels of transparency based on scene

### 3. Geometric Shapes (GeometricShape.ts)

Locations:

- (20, 4): First appearance as "vague geometric shapes hovering in the distance"
- (30, 6): "outlines of shifting pathways"
- Throughout later scenes as background elements
  Properties:
- Various basic geometric forms
- Subtle rotation/hover movement
- Semi-transparent
- Should become more defined as fog decreases

### 4. Hospital Elements (HospitalElement.ts)

Locations:

- (70, 14): When hospital_clarity is true, "faint murmurs and gentle beeps"
- (40, 8): References to "beeping machines"
- (100, 22): In ending_reflective, "hints of hospital memory"
  Properties:
- Semi-transparent/ethereal appearance
- Basic hospital equipment shapes (IV stands, monitors, etc.)
- Only visible when hospital_clarity is true
- Intensity varies based on scene context

### 5. Environmental Light Elements

Locations:

- (30, 6): "pathways, each lit differently"
- (60, 12): Where "fog forms gentle patterns"
- (80, 16): "gentle upward lift" effect
  Properties:
- Different types of lighting effects
- Should interact with fog
- Varying intensities and colors

Each class should have a standard interface:

```typescript
class ObjectName {
  constructor(scene: Scene, position: Vector3);
  setVisibility(value: number): void;
  dispose(): void;
  updatePosition(position: Vector3): void;
}
```

Note: Objects should be able to fade in/out smoothly based on scene transitions and fog density. Some objects appear in multiple scenes with varying levels of clarity/visibility.
