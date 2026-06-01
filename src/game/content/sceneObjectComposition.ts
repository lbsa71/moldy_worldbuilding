import type { NarrativeObjectType } from "./worldDesign";

export type SceneObjectSilhouette =
  | "beacon"
  | "reach"
  | "threshold"
  | "ward";

export type SceneObjectCompositionProfile = {
  detailOpacity: number;
  echoSpread: number;
  frameScale: number;
  lineWeight: number;
  silhouette: SceneObjectSilhouette;
  verticalStretch: number;
};

export type SceneObjectCompositionProfileOptions = {
  offMapIntensity: number;
  role: "primary" | "echo";
  state: {
    trust?: number;
    hospitalClarity?: boolean;
  };
  type: NarrativeObjectType;
  variant: number;
};

export function createSceneObjectCompositionProfile({
  offMapIntensity,
  role,
  state,
  type,
  variant,
}: SceneObjectCompositionProfileOptions): SceneObjectCompositionProfile {
  const offMap = clamp(offMapIntensity, 0, 1);
  const echo = role === "echo";
  const base = getBaseCompositionProfile(type, state, variant);

  return {
    detailOpacity: clamp(
      base.detailOpacity + offMap * 0.1 - (echo ? 0.12 : 0),
      0.12,
      0.95
    ),
    echoSpread: clamp(base.echoSpread + offMap * 0.28 + (echo ? 0.22 : 0), 0, 1.4),
    frameScale: clamp(base.frameScale + offMap * 0.22, 0.7, 1.85),
    lineWeight: clamp(base.lineWeight + offMap * 0.02, 0.02, 0.22),
    silhouette: base.silhouette,
    verticalStretch: clamp(base.verticalStretch + offMap * 0.2, 0.85, 1.55),
  };
}

function getBaseCompositionProfile(
  type: NarrativeObjectType,
  state: SceneObjectCompositionProfileOptions["state"],
  variant: number
): SceneObjectCompositionProfile {
  if (type === "lamp") {
    return {
      detailOpacity: 0.82,
      echoSpread: 0.18,
      frameScale: 1,
      lineWeight: 0.12,
      silhouette: "beacon",
      verticalStretch: 1,
    };
  }

  if (type === "hand") {
    const trust = clamp((state.trust ?? 0) / 4, 0, 1);

    return {
      detailOpacity: 0.42 + trust * 0.32,
      echoSpread: 0.42 + trust * 0.32,
      frameScale: 1.04 + trust * 0.18,
      lineWeight: 0.035 + trust * 0.01,
      silhouette: "reach",
      verticalStretch: 1,
    };
  }

  if (type === "hospital") {
    const clarity = state.hospitalClarity ? 1 : 0;

    return {
      detailOpacity: 0.3 + clarity * 0.45,
      echoSpread: 0.24 + clarity * 0.08,
      frameScale: 0.96 + clarity * 0.16,
      lineWeight: 0.065 + clarity * 0.025,
      silhouette: "ward",
      verticalStretch: 1,
    };
  }

  const variantOffset = Math.abs(variant) % 5;

  return {
    detailOpacity: 0.62,
    echoSpread: 0.36 + variantOffset * 0.06,
    frameScale: 1.14 + (Math.abs(variant) % 4) * 0.06,
    lineWeight: 0.04,
    silhouette: "threshold",
    verticalStretch: 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
