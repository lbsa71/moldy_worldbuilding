import { Color3, StandardMaterial } from "@babylonjs/core";
import type {
  SceneObjectColor,
  SceneObjectMaterialProfile,
} from "../../game/content/sceneObjectMaterial";

export type SceneObjectMaterialColorSlot =
  | "accent"
  | "diffuse"
  | "secondary";

export function applySceneObjectMaterial(
  material: StandardMaterial,
  profile: SceneObjectMaterialProfile,
  colorSlot: SceneObjectMaterialColorSlot = "diffuse",
  options: { alpha?: number; emissiveScale?: number } = {}
): void {
  material.diffuseColor = toColor3(profile[colorSlot]);
  material.ambientColor = toColor3(profile.ambient);
  material.emissiveColor = scaleColor3(
    profile.emissive,
    options.emissiveScale ?? 1
  );
  material.specularColor = toColor3(profile.specular);
  material.alpha = options.alpha ?? profile.alpha;
}

export function setProfileVisibilityAlpha(
  material: StandardMaterial,
  baseAlpha: number,
  visibility: number
): void {
  material.alpha = clamp(baseAlpha * visibility, 0, 1);
}

export function scaleColor3(
  color: SceneObjectColor,
  scale: number
): Color3 {
  return new Color3(
    clamp(color.r * scale, 0, 1),
    clamp(color.g * scale, 0, 1),
    clamp(color.b * scale, 0, 1)
  );
}

export function toColor3(color: SceneObjectColor): Color3 {
  return new Color3(color.r, color.g, color.b);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
