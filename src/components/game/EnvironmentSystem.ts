import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreatePolyhedron } from "@babylonjs/core/Meshes/Builders/polyhedronBuilder";
import { Lamp } from "./Lamp";
import { HandMotif } from "./HandMotif";
import { GeometricShape } from "./GeometricShape";
import { HospitalElement } from "./HospitalElement";
import { EnvironmentalLightElement } from "./EnvironmentalLightElement";
import { MemoryProp } from "./MemoryProp";
import { HeroAssetLibrary } from "./HeroAssetLibrary";
import { ImportedMemorySymbol } from "./ImportedMemorySymbol";
import { bounded, FadingSymbol, material, palette, seededRandom } from "./VisualStyle";

type SymbolView = Pick<FadingSymbol, "setVisibility" | "setRotationY" | "setReducedMotion" | "updatePosition" | "dispose">;
type Memory = { object: SymbolView; kind: string; position: Vector3 };
export class EnvironmentSystem {
  private terrain: AbstractMesh | null = null;
  private lamp?: Lamp;
  private glow: GlowLayer;
  private memories = new Map<string, Memory>();
  private retiring: { object: SymbolView; remaining: number }[] = [];
  private assets?: HeroAssetLibrary;
  private scenery: Mesh[] = [];
  private sceneryMaterial: StandardMaterial;
  private observer: Observer<Scene> | null;
  private firstObjectPosition: Vector3 | null = null;
  private reducedMotion = false;
  private debug = false;
  private trust = 0;
  private hospitalClarity = false;
  private narrativeScene: string | null = null;
  constructor(private scene: Scene, options: { heroAssets?: boolean } = {}) {
    if (options.heroAssets) this.assets = new HeroAssetLibrary(scene);
    this.glow = new GlowLayer("lampGlow", scene, { mainTextureRatio: 0.25, blurKernelSize: 24 });
    this.glow.intensity = 0.32;
    // Keep an empty inclusion list before the lamp exists: no other surface glows.
    this.glow.customEmissiveColorSelector = (mesh, _subMesh, surface, result) => {
      const scale = mesh.metadata?.fadingLampGlow ?? (mesh.name === "lampFilament" ? 1 : mesh.name === "lampShade" ? 0.45 : 0);
      if (scale && surface && "emissiveColor" in surface) {
        const color = (surface as StandardMaterial).emissiveColor;
        result.set(color.r * scale, color.g * scale, color.b * scale, 1);
      } else result.set(0,0,0,0);
    };
    this.sceneryMaterial = material(scene,"distantStone",palette.stone,0.035);
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime()/1000 || 1/60,0.1);
      this.retiring = this.retiring.filter(entry => {
        entry.remaining -= dt;
        if (entry.remaining <= 0) { entry.object.dispose(); return false; } return true;
      });
    });
  }
  private grounded(x: number,z: number): Vector3 {
    const hit = this.scene.pickWithRay(new Ray(new Vector3(x,50,z),Vector3.Down(),100), mesh => mesh === this.terrain);
    return new Vector3(x,hit?.pickedPoint?.y ?? 0,z);
  }
  private ensureLamp(): void {
    if (this.lamp) return;
    this.lamp = new Lamp(this.scene,this.grounded(0,0),Vector3.Zero(),this.glow,this.assets);
    const shade = this.scene.getMeshByName("lampShade");
    if (shade?.material instanceof StandardMaterial) {
      shade.rotation.z = -0.075;
      shade.material.emissiveColor = palette.brass.scale(0.52);
      shade.material.alpha = 1;
      this.glow.addIncludedOnlyMesh(shade as Mesh);
    }
    this.lamp.setReducedMotion(this.reducedMotion);
  }
  populate(terrain: Mesh, _objectNames: string[]): void {
    this.terrain = terrain;
    this.ensureLamp();
    if (this.scenery.length) return;
    const random = seededRandom(1971);
    // A broken bedside floor suggests a room without enclosing the landscape.
    for (let i=0;i<22;i++) {
      const angle = i/22*Math.PI*2;
      const distance = 10+random()*3;
      const stone = CreateBox(`floorFragment${i}`, { width: 0.8+random()*1.6, height: 0.08, depth: 0.55+random() },this.scene);
      stone.position = this.grounded(Math.cos(angle)*distance,Math.sin(angle)*distance);
      stone.position.y += 0.02; stone.rotation.y = angle;
      stone.material = this.sceneryMaterial; stone.isPickable = false; this.scenery.push(stone);
    }
    // Low rock silhouettes sit behind the principal sightline, never random trees.
    for(let i=0;i<12;i++) {
      const x=(random()-0.5)*76,z=26+random()*20;
      const rock=CreatePolyhedron(`slateFold${i}`,{type:1,size:1},this.scene);
      rock.position=this.grounded(x,z); rock.scaling.set(2+random()*4,0.7+random()*1.7,1+random()*2);
      rock.rotation.y=random()*Math.PI; rock.material=this.sceneryMaterial; rock.isPickable=false; this.scenery.push(rock);
    }
  }
  createObjectsFromTag(names: string[], terrain: AbstractMesh, _position?: {x:number;z:number}): void {
    this.terrain=terrain;
    this.ensureLamp();
    const desired=new Set<string>();
    const counts=new Map<string,number>();
    const motifs=names.filter(name=>name !== "lamp");
    this.firstObjectPosition=null;
    motifs.forEach(kind=>{
      const count=counts.get(kind) ?? 0; counts.set(kind,count+1);
      // A remembered object has a place beside the lamp, independent of listener travel.
      const key=`${kind}:${count}`; desired.add(key);
      const existing = this.memories.get(key);
      if(existing) {
        if(!this.firstObjectPosition) this.firstObjectPosition=existing.position.clone();
        return;
      }
      const anchors: Record<string, [number, number]> = this.assets ? {
        chair:[1.2,0.4], cup:[0.7,0.9], rail:[-1.1,1.7], hand:[-1.1,1.8],
        hospital:[-1.1,1.7], geometric:[-3.3,3.3], light:[-1.65,2.3], environmentalLight:[-1.65,2.3],
      } : {
        chair:[2.2,0.7], cup:[1.4,1.2], rail:[-2,3], hand:[-2,3.1],
        hospital:[-3,4.2], geometric:[-6,6], light:[-3,4.2], environmentalLight:[-3,4.2],
      };
      const anchor=anchors[kind] ?? [0,4];
      const x=anchor[0]+count*1.7;
      const z=anchor[1]+count*0.65;
      const point=this.grounded(x,z);
      const rotation=new Vector3(0,Math.PI/12,0);
      let fallback:FadingSymbol;
      switch(kind) {
        case "hand": point.y+=this.assets ? 0.85 : 1.5; fallback=new HandMotif(this.scene,point,rotation); break;
        case "geometric": fallback=new GeometricShape(this.scene,point,rotation); break;
        case "hospital": fallback=new HospitalElement(this.scene,point,rotation,!this.assets); break;
        case "light": case "environmentalLight": fallback=new EnvironmentalLightElement(this.scene,point); break;
        case "chair": case "cup": case "rail": fallback=new MemoryProp(this.scene,kind,point,rotation); break;
        default: return;
      }
      if (this.assets) fallback.setScale(0.55);
      const object: SymbolView = this.assets && (kind === "chair" || kind === "cup" || kind === "rail" || kind === "hospital")
        ? new ImportedMemorySymbol(this.scene,kind,point,rotation,this.assets,fallback)
        : fallback;
      object.setReducedMotion(this.reducedMotion);
      this.memories.set(key,{object,kind,position:point.clone()});
      if(!this.firstObjectPosition) this.firstObjectPosition=point.clone();
    });
    for(const [key,entry] of this.memories) if(!desired.has(key)) {
      entry.object.setVisibility(0);
      if(this.reducedMotion) entry.object.dispose(); else this.retiring.push({object:entry.object,remaining:3});
      this.memories.delete(key);
    }
    this.updateObjectVisibilities(this.trust,this.hospitalClarity);
  }
  updateObjectVisibilities(trust:number,hospital_clarity:boolean): void {
    this.trust=Number.isFinite(trust) ? trust : 0; this.hospitalClarity=hospital_clarity;
    this.lamp?.setWarmth(this.trust);
    const connection=bounded(this.trust/5);
    for(const {object,kind} of this.memories.values()) {
      const amount=kind === "hospital" ? (hospital_clarity ? 0.78 : 0) : kind === "hand" ? 0.4+connection*0.45 : this.assets ? 0.94 : 0.72;
      object.setVisibility(this.debug ? 1 : amount);
    }
    this.applyNarrativeScene();
  }
  setNarrativeScene(scene: string | null): void {
    this.narrativeScene = scene;
    this.applyNarrativeScene();
  }
  private applyNarrativeScene(): void {
    const faceRail = ["contradiction", "boundary", "quiet", "recollection"].includes(this.narrativeScene || "");
    const chairAngle = this.narrativeScene === "preparation" ? 1.9 : faceRail ? Math.atan2(-4.2, 2.3) : Math.atan2(-2.2, -0.7);
    for (const {object, kind} of this.memories.values()) if (kind === "chair") object.setRotationY(chairAngle);
    const levels: Record<string, number> = { preparation: 1.0, keep: 1.75, carry: 1.1, rest: 0.35 };
    const level = levels[this.narrativeScene || ""];
    if (level !== undefined) this.lamp?.setIntensity(level);
    else this.lamp?.setWarmth(this.trust);
  }
  setReducedMotion(value:boolean): void {
    this.reducedMotion=value;
    this.lamp?.setReducedMotion(value);
    for(const entry of this.memories.values()) entry.object.setReducedMotion(value);
    this.retiring.forEach(entry=>entry.object.setReducedMotion(value));
    if(value) { this.retiring.forEach(entry=>entry.object.dispose()); this.retiring=[]; }
  }
  toggleDebug(): void { this.debug=!this.debug; this.updateObjectVisibilities(this.trust,this.hospitalClarity); }
  getFirstObjectPosition(): Vector3|null { return this.firstObjectPosition; }
  clearFirstObjectPosition(): void { this.firstObjectPosition=null; }
  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.observer);
    this.memories.forEach(({object})=>object.dispose()); this.memories.clear();
    this.retiring.forEach(({object})=>object.dispose()); this.retiring=[];
    this.scenery.forEach(mesh=>mesh.dispose()); this.scenery=[];
    this.lamp?.dispose(); this.lamp=undefined; this.assets?.dispose(); this.glow.dispose(); this.sceneryMaterial.dispose();
  }
}
