import type { NarrativeObjectType } from "./worldDesign";

export type SceneObjectColor = {
  r: number;
  g: number;
  b: number;
};

export type SceneObjectMaterialProfile = {
  diffuse: SceneObjectColor;
  emissive: SceneObjectColor;
  ambient: SceneObjectColor;
  specular: SceneObjectColor;
  secondary: SceneObjectColor;
  accent: SceneObjectColor;
  alpha: number;
  glow: number;
};

export type SceneObjectMaterialProfileOptions = {
  offMapIntensity: number;
  role: "primary" | "echo";
  state: {
    trust?: number;
    hospitalClarity?: boolean;
  };
  type: NarrativeObjectType;
  variant: number;
};

const BLACK: SceneObjectColor = { r: 0.02, g: 0.02, b: 0.025 };
const OFF_MAP_HAZE: SceneObjectColor = { r: 0.58, g: 0.66, b: 0.94 };

const GEOMETRIC_PALETTE: SceneObjectMaterialProfile[] = [
  createProfile({
    accent: { r: 0.86, g: 0.72, b: 0.42 },
    alpha: 0.52,
    ambient: { r: 0.08, g: 0.16, b: 0.18 },
    diffuse: { r: 0.34, g: 0.7, b: 0.76 },
    emissive: { r: 0.06, g: 0.18, b: 0.22 },
    glow: 0.28,
    secondary: { r: 0.54, g: 0.82, b: 0.72 },
    specular: { r: 0.08, g: 0.1, b: 0.12 },
  }),
  createProfile({
    accent: { r: 0.72, g: 0.54, b: 0.9 },
    alpha: 0.56,
    ambient: { r: 0.13, g: 0.1, b: 0.2 },
    diffuse: { r: 0.66, g: 0.5, b: 0.86 },
    emissive: { r: 0.14, g: 0.08, b: 0.2 },
    glow: 0.32,
    secondary: { r: 0.42, g: 0.72, b: 0.86 },
    specular: { r: 0.1, g: 0.08, b: 0.14 },
  }),
  createProfile({
    accent: { r: 0.9, g: 0.64, b: 0.42 },
    alpha: 0.58,
    ambient: { r: 0.16, g: 0.13, b: 0.08 },
    diffuse: { r: 0.82, g: 0.62, b: 0.36 },
    emissive: { r: 0.2, g: 0.14, b: 0.07 },
    glow: 0.3,
    secondary: { r: 0.34, g: 0.68, b: 0.76 },
    specular: { r: 0.14, g: 0.11, b: 0.07 },
  }),
  createProfile({
    accent: { r: 0.48, g: 0.86, b: 0.76 },
    alpha: 0.54,
    ambient: { r: 0.1, g: 0.14, b: 0.18 },
    diffuse: { r: 0.42, g: 0.62, b: 0.88 },
    emissive: { r: 0.08, g: 0.15, b: 0.24 },
    glow: 0.34,
    secondary: { r: 0.74, g: 0.58, b: 0.86 },
    specular: { r: 0.08, g: 0.1, b: 0.16 },
  }),
];

export function createSceneObjectMaterialProfile({
  offMapIntensity,
  role,
  state,
  type,
  variant,
}: SceneObjectMaterialProfileOptions): SceneObjectMaterialProfile {
  const base = getBaseMaterialProfile(type, state, variant);
  const offMap = clamp(offMapIntensity, 0, 1);
  const echo = role === "echo";

  return createProfile({
    accent: applyOffMapTint(base.accent, offMap, 0.1),
    alpha: clamp(base.alpha + offMap * 0.1 - (echo ? 0.08 : 0), 0.18, 0.92),
    ambient: applyOffMapTint(base.ambient, offMap, 0.14),
    diffuse: applyOffMapTint(base.diffuse, offMap, 0.12),
    emissive: addColors(base.emissive, scaleColor(OFF_MAP_HAZE, offMap * 0.16)),
    glow: clamp(base.glow + offMap * 0.18 - (echo ? 0.06 : 0), 0.08, 0.85),
    secondary: applyOffMapTint(base.secondary, offMap, 0.12),
    specular: applyOffMapTint(base.specular, offMap, 0.06),
  });
}

function getBaseMaterialProfile(
  type: NarrativeObjectType,
  state: SceneObjectMaterialProfileOptions["state"],
  variant: number
): SceneObjectMaterialProfile {
  if (type === "lamp") {
    return createProfile({
      accent: { r: 0.98, g: 0.78, b: 0.36 },
      alpha: 0.82,
      ambient: { r: 0.28, g: 0.19, b: 0.1 },
      diffuse: { r: 0.9, g: 0.66, b: 0.34 },
      emissive: { r: 0.42, g: 0.25, b: 0.1 },
      glow: 0.64,
      secondary: { r: 0.16, g: 0.13, b: 0.1 },
      specular: { r: 0.16, g: 0.12, b: 0.08 },
    });
  }

  if (type === "hand") {
    const trust = clamp((state.trust ?? 0) / 4, 0, 1);

    return createProfile({
      accent: mixColors(
        { r: 0.42, g: 0.7, b: 0.7 },
        { r: 0.68, g: 0.92, b: 0.88 },
        trust
      ),
      alpha: 0.48 + trust * 0.24,
      ambient: mixColors(
        { r: 0.06, g: 0.13, b: 0.15 },
        { r: 0.1, g: 0.2, b: 0.22 },
        trust
      ),
      diffuse: mixColors(
        { r: 0.24, g: 0.56, b: 0.62 },
        { r: 0.34, g: 0.74, b: 0.78 },
        trust
      ),
      emissive: mixColors(
        { r: 0.06, g: 0.2, b: 0.26 },
        { r: 0.12, g: 0.34, b: 0.38 },
        trust
      ),
      glow: 0.24 + trust * 0.24,
      secondary: mixColors(
        { r: 0.28, g: 0.62, b: 0.66 },
        { r: 0.52, g: 0.84, b: 0.82 },
        trust
      ),
      specular: BLACK,
    });
  }

  if (type === "hospital") {
    const clarity = state.hospitalClarity ? 1 : 0;

    return createProfile({
      accent: mixColors(
        { r: 0.9, g: 0.24, b: 0.18 },
        { r: 0.66, g: 0.56, b: 0.5 },
        clarity
      ),
      alpha: 0.44 + clarity * 0.3,
      ambient: mixColors(
        { r: 0.08, g: 0.1, b: 0.13 },
        { r: 0.14, g: 0.18, b: 0.2 },
        clarity
      ),
      diffuse: mixColors(
        { r: 0.46, g: 0.54, b: 0.64 },
        { r: 0.72, g: 0.8, b: 0.88 },
        clarity
      ),
      emissive: mixColors(
        { r: 0.06, g: 0.08, b: 0.1 },
        { r: 0.12, g: 0.18, b: 0.24 },
        clarity
      ),
      glow: 0.18 + clarity * 0.16,
      secondary: mixColors(
        { r: 0.24, g: 0.38, b: 0.5 },
        { r: 0.44, g: 0.66, b: 0.84 },
        clarity
      ),
      specular: { r: 0.1, g: 0.12, b: 0.14 },
    });
  }

  return GEOMETRIC_PALETTE[Math.abs(variant) % GEOMETRIC_PALETTE.length];
}

function createProfile(
  profile: SceneObjectMaterialProfile
): SceneObjectMaterialProfile {
  return {
    accent: clampColor(profile.accent),
    alpha: clamp(profile.alpha, 0, 1),
    ambient: clampColor(profile.ambient),
    diffuse: clampColor(profile.diffuse),
    emissive: clampColor(profile.emissive),
    glow: clamp(profile.glow, 0, 1),
    secondary: clampColor(profile.secondary),
    specular: clampColor(profile.specular),
  };
}

function applyOffMapTint(
  color: SceneObjectColor,
  offMapIntensity: number,
  amount: number
): SceneObjectColor {
  return mixColors(color, OFF_MAP_HAZE, offMapIntensity * amount);
}

function addColors(
  a: SceneObjectColor,
  b: SceneObjectColor
): SceneObjectColor {
  return clampColor({
    b: a.b + b.b,
    g: a.g + b.g,
    r: a.r + b.r,
  });
}

function scaleColor(
  color: SceneObjectColor,
  scale: number
): SceneObjectColor {
  return {
    b: color.b * scale,
    g: color.g * scale,
    r: color.r * scale,
  };
}

function mixColors(
  a: SceneObjectColor,
  b: SceneObjectColor,
  amount: number
): SceneObjectColor {
  const t = clamp(amount, 0, 1);

  return clampColor({
    b: a.b + (b.b - a.b) * t,
    g: a.g + (b.g - a.g) * t,
    r: a.r + (b.r - a.r) * t,
  });
}

function clampColor(color: SceneObjectColor): SceneObjectColor {
  return {
    b: clamp(color.b, 0, 0.98),
    g: clamp(color.g, 0, 0.98),
    r: clamp(color.r, 0, 0.98),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
