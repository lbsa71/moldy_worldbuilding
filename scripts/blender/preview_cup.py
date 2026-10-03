"""Inspection preview of the reimported GLB, never included in game exports."""
import bpy, sys
from pathlib import Path
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(folder/'cup_lod0.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('InspectionWorld');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.09,0.12,0.14,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.6
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for name,location,power in [('Key',(0.1,0.15,0.25),4),('Fill',(-0.15,-0.05,0.2),2)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=0.15
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location;aim(obj,(0,0,0.04))
bpy.ops.object.camera_add(location=(0.19,0.23,0.28))
scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=0.16
aim(scene.camera,(0.009,0,0.049))
scene.render.filepath=str(folder/'cup_inspection.png');bpy.ops.render.render(write_still=True)
