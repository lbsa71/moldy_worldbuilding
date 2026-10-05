import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Plane } from '@babylonjs/core/Maths/math.plane';
import { Constants } from '@babylonjs/core/Engines/constants';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { MirrorTexture } from '@babylonjs/core/Materials/Textures/mirrorTexture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { ImageProcessingPostProcess } from '@babylonjs/core/PostProcesses/imageProcessingPostProcess';
import { CubeMapToSphericalPolynomialTools } from '@babylonjs/core/Misc/HighDynamicRange/cubemapToSphericalPolynomial';
import '@babylonjs/core/Materials/Textures/baseTexture.polynomial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Node } from '@babylonjs/core/node';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { Light } from '@babylonjs/core/Lights/light';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Scene } from '@babylonjs/core/scene';
import type { StudyAssets, StudyManifest } from './SceneStudyAssets';

export function isStudySkyMesh(mesh: AbstractMesh): boolean {
  for (let node: Node | null = mesh; node; node = node.parent) {
    if (node.name === 'Fading_StudySky') return true;
  }
  return false;
}

/** The authored sky remains visible to the main view and mirror, with no local haze or shadows. */
export function configureStudySkyMeshes(meshes: readonly AbstractMesh[]): void {
  meshes.filter(isStudySkyMesh).forEach(mesh => {
    mesh.applyFog = false;
    mesh.receiveShadows = false;
    mesh.isPickable = false;
  });
}

/** Emissive shade geometry represents light leaving the fixture, not an opaque blocker. */
export function getStudyShadowCasters(meshes: AbstractMesh[], lamp: StudyAssets['lamp']): AbstractMesh[] {
  return meshes.filter(mesh => {
    if (mesh.metadata?.livingSceneTrace) return false;
    if (isStudySkyMesh(mesh)) return false;
    if (!mesh.isDescendantOf(lamp)) return true;
    const emission = mesh.material instanceof PBRMaterial ? mesh.material.emissiveColor : undefined;
    const luminousMaterial = emission && (emission.r > 0 || emission.g > 0 || emission.b > 0);
    return !(luminousMaterial || /shade|filament/i.test(mesh.name));
  });
}

export function getStudyLampPosition(assets: StudyAssets): Vector3 {
  if (assets.lampLight) {
    assets.lampLight.computeWorldMatrix(true);
    return assets.lampLight.getAbsolutePosition().clone();
  }
  if (assets.manifest.lampLight?.position?.length === 3) return Vector3.FromArray(assets.manifest.lampLight.position);
  assets.lamp.computeWorldMatrix(true);
  const lampMeshes = assets.lamp.getChildMeshes().filter(mesh => mesh.getTotalVertices() > 0);
  lampMeshes.forEach(mesh => mesh.computeWorldMatrix(true));
  const maxY = Math.max(...lampMeshes.map(mesh => mesh.getBoundingInfo().boundingBox.maximumWorld.y));
  const rootPosition = assets.lamp.getAbsolutePosition();
  return rootPosition.add(new Vector3(0, Number.isFinite(maxY) ? maxY - rootPosition.y - 0.25 : 1.4, 0));
}

export function configureStudyFog(scene: Scene, manifest: StudyManifest): void {
  const swatch = manifest.environment?.fog_color;
  const displayColor = swatch?.length === 3 ? Color3.FromArray(swatch) : new Color3(0.34, 0.44, 0.52);
  // PBR's BindFogParameters converts scene.fogColor to linear itself. A clear
  // buffer enters the final postprocess directly, so only that needs conversion.
  scene.fogColor = displayColor;
  const linearColor = displayColor.toLinearSpace(scene.getEngine().useExactSrgbConversions);
  scene.clearColor = new Color4(linearColor.r, linearColor.g, linearColor.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  // Browser fog is an authored coefficient, independent of Cycles volume units.
  // PBR additionally linearizes transmittance; a forced 0.035 floor erased distant
  // city silhouettes. Preserve explicit low/zero density and use a modest fallback.
  const density = manifest.environment?.fog_density;
  scene.fogDensity = typeof density === 'number' && Number.isFinite(density) && density >= 0 ? density : 0.018;
}

export function createStudyBulbSource(scene: Scene, downwardLight: SpotLight) {
  const light = new PointLight('shade local warmth', downwardLight.position.clone(), scene);
  light.diffuse = downwardLight.diffuse.clone();
  // The bulb is the fixture's broad emitter. A hardcoded 0.35 made it negligible
  // against the authored downlight and removed the wet-shore/specular response.
  light.intensity = downwardLight.intensity;
  light.intensityMode = Light.INTENSITYMODE_LUMINOUSINTENSITY;
  light.range = downwardLight.range;
  light.falloffType = Light.FALLOFF_GLTF;
  light.shadowMinZ = 0.04;
  light.shadowMaxZ = light.range;
  const shadows = new ShadowGenerator(256, light);
  // Babylon 7.34's unfiltered WGSL cube branch omits the texture argument.
  // Its supported Poisson cube branch passes texture + sampler correctly.
  shadows.usePoissonSampling = true;
  shadows.bias = 0.001;
  shadows.normalBias = 0.01;
  shadows.setDarkness(0.12);
  return { light, shadows };
}

async function loadAuthoredEnvironment(scene: Scene, url: string, signal?: AbortSignal): Promise<HDRCubeTexture> {
  if (!url.startsWith('/scene-study/')) throw new Error('The study environment must be a local /scene-study/ asset.');
  // Babylon 7.34's EffectWrapper awaits its async initialization function without
  // invoking it. Register these tree-shaken shaders before HDRFiltering creates
  // its effect, so prefilter readiness never depends on that broken callback.
  if (scene.getEngine().isWebGPU) {
    await Promise.all([
      import('@babylonjs/core/ShadersWGSL/hdrFiltering.vertex'),
      import('@babylonjs/core/ShadersWGSL/hdrFiltering.fragment'),
    ]);
  } else {
    await Promise.all([
      import('@babylonjs/core/Shaders/hdrFiltering.vertex'),
      import('@babylonjs/core/Shaders/hdrFiltering.fragment'),
    ]);
  }
  return new Promise((resolve, reject) => {
    let texture: HDRCubeTexture | undefined;
    let settled = false;
    const cancelled = () => finish(new DOMException('Scene study initialization was cancelled.', 'AbortError'));
    const sceneObserver = scene.onDisposeObservable.addOnce(cancelled);
    const timer = setTimeout(() => finish(new Error('HDR environment loading or prefiltering exceeded 45 seconds.')), 45_000);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelled);
      scene.onDisposeObservable.remove(sceneObserver);
      if (error) { texture?.dispose(); reject(error); }
      else if (texture) resolve(texture);
      else reject(new Error('HDR environment completed without a texture.'));
    };
    signal?.addEventListener('abort', cancelled, { once: true });
    if (signal?.aborted || scene.isDisposed) { cancelled(); return; }
    try {
      // Babylon calls onLoad after GPU roughness prefiltering, not just file fetch.
      texture = new HDRCubeTexture(url, scene, 512, false, true, false, true,
        () => queueMicrotask(() => finish()),
        message => queueMicrotask(() => finish(new Error(message || 'HDR environment failed to load.'))));
      texture.name = `authored overcast HDR IBL: ${url}`;
    } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
  });
}

export async function createStudySurfaces(scene: Scene, assets: StudyAssets, options: {
  environment?: StudyManifest['environment']; signal?: AbortSignal; onStatus?: (message: string) => void;
} = {}) {
  const config = scene.imageProcessingConfiguration;
  config.toneMappingEnabled = true;
  config.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  config.exposure = 1.05;
  config.contrast = 1.05;
  // Keep all geometry and the mirror in linear space; tone-map the composed view once.
  const hdrType = scene.getEngine().getCaps().textureHalfFloatRender ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE;
  new ImageProcessingPostProcess('single display transform', 1, scene.activeCamera, Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false, hdrType, config);
  configureStudyFog(scene, assets.manifest);

  // Local IBL with deterministic CPU irradiance; no CDN/network image dependency.
  // This is a lighting study, pending an authored production HDR environment.
  const size = 32;
  const faceColors = [[0.22, 0.29, 0.37], [0.16, 0.22, 0.29], [0.36, 0.43, 0.51], [0.035, 0.05, 0.065], [0.22, 0.28, 0.35], [0.18, 0.24, 0.31]];
  const faces = faceColors.map(color => {
    const data = new Uint8Array(size * size * 3);
    for (let index = 0; index < size * size; index++) {
      const lift = 0.85 + (1 - Math.floor(index / size) / size) * 0.15;
      color.forEach((channel, offset) => { data[index * 3 + offset] = Math.round(channel * lift * 255); });
    }
    return data;
  });
  const environment = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGB, Constants.TEXTURETYPE_UNSIGNED_BYTE, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  environment.name = 'generated cool overcast IBL — production HDR pending';
  environment.gammaSpace = false;
  environment.sphericalPolynomial = CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({
    right: faces[0], left: faces[1], up: faces[2], down: faces[3], front: faces[4], back: faces[5],
    size, format: Constants.TEXTUREFORMAT_RGB, type: Constants.TEXTURETYPE_UNSIGNED_BYTE, gammaSpace: false,
  });
  scene.environmentTexture = environment;
  scene.environmentIntensity = 0.85;
  let environmentMode: 'hdr' | 'generated' = 'generated';
  let environmentUrl: string | null = null;
  const warnings: string[] = [];
  const environmentHint = options.environment ?? assets.manifest.environment;
  if (environmentHint?.url) {
    options.onStatus?.('Loading and prefiltering the authored overcast environment…');
    try {
      const hdr = await loadAuthoredEnvironment(scene, environmentHint.url, options.signal);
      if (scene.isDisposed || options.signal?.aborted) {
        hdr.dispose();
        throw new DOMException('Scene study initialization was cancelled.', 'AbortError');
      }
      scene.environmentTexture = hdr;
      scene.environmentIntensity = typeof environmentHint.intensity === 'number' && Number.isFinite(environmentHint.intensity)
        ? Math.max(0, environmentHint.intensity) : 0.55;
      environment.dispose();
      environmentMode = 'hdr';
      environmentUrl = environmentHint.url;
    } catch (error) {
      if (scene.isDisposed || options.signal?.aborted) throw error;
      warnings.push(`Authored HDR environment unavailable; using generated IBL. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (environmentMode === 'generated') warnings.push('Generated overcast IBL is provisional; production environment lighting remains pending.');

  const moon = new DirectionalLight('cool cloud opening', new Vector3(-0.4, -0.75, -0.3), scene);
  moon.diffuse = new Color3(0.6, 0.72, 0.88);
  moon.intensity = 0.7;
  const position = getStudyLampPosition(assets);
  const lamp = new SpotLight('warm light beneath shade', position, new Vector3(0, -1, 0), 2.65, 1.1, scene);
  const warmColor = assets.manifest.lampLight?.color;
  lamp.diffuse = warmColor?.length === 3 ? Color3.FromArray(warmColor) : new Color3(1, 0.65, 0.29);
  lamp.intensity = assets.manifest.lampLight?.intensity ?? 5;
  lamp.range = assets.manifest.lampLight?.range ?? 5;
  lamp.falloffType = Light.FALLOFF_GLTF;
  lamp.intensityMode = Light.INTENSITYMODE_LUMINOUSINTENSITY;
  lamp.shadowMinZ = 0.04;
  lamp.shadowMaxZ = lamp.range;
  const bulb = createStudyBulbSource(scene, lamp);
  const shadows = new ShadowGenerator(1024, lamp);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0005;
  shadows.normalBias = 0.015;
  shadows.setDarkness(0.12);

  const mirror = new MirrorTexture('live water reflection', 1024, scene, true, hdrType);
  mirror.mirrorPlane = new Plane(0, -1, 0, 0);
  mirror.clearColor = scene.clearColor.clone();
  mirror.level = 0.88;
  // Restrained separable blur softens distant arch edges without baking or
  // removing any object from the live reflection. Keep full reflection resolution.
  mirror.blurKernel = 6;
  // The water plane is always runtime geometry and never appears in its own pass.
  const water = MeshBuilder.CreateGround('living water at y=0', { width: 300, height: 300, subdivisions: 1 }, scene);
  water.position.y = 0;
  water.isPickable = false;
  const waterMaterial = new PBRMaterial('still cool water', scene);
  waterMaterial.albedoColor = new Color3(0.026, 0.052, 0.075);
  waterMaterial.metallic = 0;
  waterMaterial.roughness = assets.manifest.water?.roughness_suggestion ?? 0.15;
  waterMaterial.indexOfRefraction = assets.manifest.water?.IOR ?? 1.333;
  waterMaterial.reflectionTexture = mirror;
  const normalSize = 128;
  const normals = new Uint8Array(normalSize * normalSize * 4);
  for (let y = 0; y < normalSize; y++) for (let x = 0; x < normalSize; x++) {
    const offset = (y * normalSize + x) * 4;
    normals[offset] = Math.round(128 + 9 * Math.sin(x / normalSize * Math.PI * 8 + Math.sin(y / normalSize * Math.PI * 4)));
    normals[offset + 1] = Math.round(128 + 5 * Math.cos(y / normalSize * Math.PI * 12));
    normals[offset + 2] = 255;
    normals[offset + 3] = 255;
  }
  const ripple = RawTexture.CreateRGBATexture(normals, normalSize, normalSize, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  ripple.name = 'subtle authored water normal';
  ripple.uScale = ripple.vScale = 36;
  ripple.wrapU = ripple.wrapV = Texture.WRAP_ADDRESSMODE;
  ripple.level = 0.3;
  waterMaterial.bumpTexture = ripple;
  water.material = waterMaterial;
  water.receiveShadows = true;
  assets.meshes.forEach(mesh => { mesh.receiveShadows = true; mesh.isPickable = false; });
  configureStudySkyMeshes(assets.meshes);

  const applyRenderLists = (meshes: AbstractMesh[]) => {
    mirror.renderList = [...meshes];
    const casters = getStudyShadowCasters(meshes, assets.lamp);
    shadows.getShadowMap()!.renderList = [...casters];
    bulb.shadows.getShadowMap()!.renderList = [...casters];
  };
  warnings.push('The bulb uses six 256px cube shadow faces in addition to the downlight and mirror; browser performance remains under review.');
  const steadyDownlight = lamp.intensity;
  const steadyBulb = bulb.light.intensity;
  const setLampRest = (rest: boolean) => {
    // A small fixture change, independent of exposure, weather and story outcome.
    lamp.intensity = steadyDownlight * (rest ? 0.9 : 1);
    bulb.light.intensity = steadyBulb * (rest ? 0.9 : 1);
  };
  return { mirror, shadows, applyRenderLists, environmentMode, environmentUrl, warnings, setLampRest };
}
