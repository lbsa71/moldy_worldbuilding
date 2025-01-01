import {
  Scene,
  Vector3,
  MeshBuilder,
  Mesh,
  Animation,
  StandardMaterial,
  Color3,
  DirectionalLight,
  TransformNode,
  PointLight,
} from "@babylonjs/core";

export class HospitalElement {
  private mainNode: TransformNode;
  private meshes: Mesh[] = [];
  private materials: StandardMaterial[] = [];
  private animation: Animation;
  private isVisible: boolean = false;
  private directionalLight: DirectionalLight;
  private pointLight: PointLight;

  constructor(scene: Scene, position: Vector3, rotation: Vector3 = new Vector3(0, 0, 0)) {
    this.mainNode = new TransformNode("hospitalElement", scene);
    this.mainNode.position = position;
    this.mainNode.rotation = rotation;

    // Main building material
    const buildingMaterial = new StandardMaterial("hospitalBuildingMaterial", scene);
    buildingMaterial.diffuseColor = new Color3(0.95, 0.95, 0.95);
    buildingMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
    buildingMaterial.alpha = 0.5;
    this.materials.push(buildingMaterial);

    // Main building
    const building = MeshBuilder.CreateBox("hospitalBuilding", { width: 2, height: 1.5, depth: 1.2 }, scene);
    building.material = buildingMaterial;
    building.parent = this.mainNode;
    this.meshes.push(building);

    // Roof material
    const roofMaterial = new StandardMaterial("hospitalRoofMaterial", scene);
    roofMaterial.diffuseColor = new Color3(0.7, 0.8, 0.9);
    roofMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    roofMaterial.alpha = 0.5;
    this.materials.push(roofMaterial);

    // Roof
    const roof = MeshBuilder.CreateCylinder("hospitalRoof", { 
      height: 0.3,
      diameter: 2.2,
      tessellation: 4,
    }, scene);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.9;
    roof.material = roofMaterial;
    roof.parent = this.mainNode;
    this.meshes.push(roof);

    // Cross material
    const crossMaterial = new StandardMaterial("hospitalCrossMaterial", scene);
    crossMaterial.diffuseColor = new Color3(1, 0, 0);
    crossMaterial.emissiveColor = new Color3(0.5, 0, 0);
    crossMaterial.alpha = 0.2;
    this.materials.push(crossMaterial);

    // Hospital cross
    const crossVertical = MeshBuilder.CreateBox("crossVertical", { height: 0.6, width: 0.15, depth: 0.1 }, scene);
    const crossHorizontal = MeshBuilder.CreateBox("crossHorizontal", { height: 0.15, width: 0.4, depth: 0.1 }, scene);
    crossVertical.material = crossMaterial;
    crossHorizontal.material = crossMaterial;
    crossVertical.position.y = 0.4;
    crossVertical.position.z = 0.65;
    crossHorizontal.position.y = 0.4;
    crossHorizontal.position.z = 0.65;
    crossVertical.parent = this.mainNode;
    crossHorizontal.parent = this.mainNode;
    this.meshes.push(crossVertical, crossHorizontal);

    // Windows material
    const windowMaterial = new StandardMaterial("hospitalWindowMaterial", scene);
    windowMaterial.diffuseColor = new Color3(0.4, 0.7, 1);
    windowMaterial.emissiveColor = new Color3(0.2, 0.3, 0.5);
    windowMaterial.alpha = 0.5;
    this.materials.push(windowMaterial);

    // Windows
    const windowPositions = [
      new Vector3(-0.5, 0.2, 0.61),
      new Vector3(0.5, 0.2, 0.61),
      new Vector3(-0.5, -0.2, 0.61),
      new Vector3(0.5, -0.2, 0.61),
    ];

    windowPositions.forEach((pos, index) => {
      const window = MeshBuilder.CreateBox(`window${index}`, { height: 0.3, width: 0.3, depth: 0.01 }, scene);
      window.position = pos;
      window.material = windowMaterial;
      window.parent = this.mainNode;
      this.meshes.push(window);
    });

    // Animation setup
    this.animation = new Animation(
      "hospitalElementPulse",
      "scaling",
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    keys.push({ 
      frame: 0, 
      value: new Vector3(1, 1, 1)
    });
    keys.push({ 
      frame: 60, 
      value: new Vector3(1.05, 1.05, 1.05)
    });
    keys.push({ 
      frame: 120, 
      value: new Vector3(1, 1, 1)
    });

    this.animation.setKeys(keys);

    scene.beginDirectAnimation(this.mainNode, [this.animation], 0, 120, true);

    // Lighting
    this.directionalLight = new DirectionalLight("hospitalElementDirectionalLight", new Vector3(0, -1, 0), scene);
    this.directionalLight.intensity = 0.5;
    this.directionalLight.diffuse = new Color3(1, 1, 1);
    this.directionalLight.position = this.mainNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mainNode.position);

    // Add point light for more dramatic effect
    this.pointLight = new PointLight("hospitalPointLight", this.mainNode.position.add(new Vector3(0, 1, 0)), scene);
    this.pointLight.intensity = 0.3;
    this.pointLight.diffuse = new Color3(0.9, 0.95, 1);
    this.pointLight.specular = new Color3(0.9, 0.95, 1);
  }

  setVisibility(value: number): void {
    this.materials.forEach(material => {
      material.alpha = value;
    });
    this.isVisible = value > 0;
    this.meshes.forEach(mesh => {
      mesh.isVisible = this.isVisible;
    });
    this.directionalLight.intensity = this.isVisible ? 0.5 : 0;
    this.pointLight.intensity = this.isVisible ? 0.3 : 0;
  }

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.materials.forEach(material => material.dispose());
    this.directionalLight.dispose();
    this.pointLight.dispose();
    this.mainNode.dispose();
  }

  updatePosition(position: Vector3): void {
    this.mainNode.position = position;
    this.directionalLight.position = this.mainNode.position.add(new Vector3(2, 2, 0));
    this.directionalLight.setDirectionToTarget(this.mainNode.position);
    this.pointLight.position = this.mainNode.position.add(new Vector3(0, 1, 0));
  }
}
