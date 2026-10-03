"""Compare prior and consolidated GLB surface samples and reference PNGs."""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector, kdtree
import numpy as np

args=sys.argv[sys.argv.index('--')+1:]
before,after=map(lambda p:Path(p).resolve(),args[:2])
report={'surface_position_tolerance_m':1e-6,'corner_normal_dot_minimum':0.999999,'assets':[],'images':[]}

def samples(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    groups={};nodes={}
    for obj in bpy.context.scene.objects:
        nodes[obj.name]={'type':obj.type,'parent':obj.parent.name if obj.parent else None,
                         'matrix_world':[list(r) for r in obj.matrix_world]}
        if obj.type!='MESH':continue
        data=obj.data;data.calc_loop_triangles()
        normals=data.corner_normals
        transform=obj.matrix_world;nt=transform.to_3x3().inverted().transposed()
        for tri in data.loop_triangles:
            name=data.materials[tri.material_index].name
            entry=groups.setdefault(name,{'triangles':0,'corners':[]})
            entry['triangles']+=1
            for vi,li in zip(tri.vertices,tri.loops):
                entry['corners'].append((transform @ data.vertices[vi].co,(nt @ normals[li].vector).normalized()))
    return groups,nodes

def match(reference,query):
    tree=kdtree.KDTree(len(reference))
    for i,(position,normal) in enumerate(reference):tree.insert(position,i)
    tree.balance();missing=0;worst_dist=0;worst_dot=1
    for position,normal in query:
        matches=tree.find_range(position,1e-6)
        if not matches:missing+=1;continue
        best=max(matches,key=lambda row:reference[row[1]][1].dot(normal))
        dot=reference[best[1]][1].dot(normal)
        worst_dist=max(worst_dist,best[2]);worst_dot=min(worst_dot,dot)
        if dot<0.999999:missing+=1
    return {'missing_or_changed_corners':missing,'max_position_difference_m':worst_dist,'minimum_matching_normal_dot':worst_dot}

required=['Fading_Lamp','lampShadePivot','lampShade_LOD0','lampFilament','lampWarmthSocket',
          'Fading_Chair','chairSeatSocket','chairFacingSocket','Fading_Cup','cupHandle','cupRimChip','cupRimSocket',
          'Fading_Bedside','bedRail','curtainFrame','partialCurtain','railTapSocket']
for filename in ['lamp_lod0.glb','chair_lod0.glb','cup_lod0.glb','bedside_lod0.glb']:
    old,oldnodes=samples(before/filename);new,newnodes=samples(after/filename)
    item={'file':filename,'material_names_unchanged':set(old)==set(new),'materials':[],'semantic_world_transforms_unchanged':True}
    for name in old:
        result={'material':name,'triangles_before':old[name]['triangles'],'triangles_after':new[name]['triangles'],
                'old_to_new':match(new[name]['corners'],old[name]['corners']),
                'new_to_old':match(old[name]['corners'],new[name]['corners'])}
        result['passed']=result['triangles_before']==result['triangles_after'] and all(result[k]['missing_or_changed_corners']==0 for k in ['old_to_new','new_to_old'])
        item['materials'].append(result)
    for name in required:
        if name not in oldnodes:continue
        if name not in newnodes or any(abs(oldnodes[name]['matrix_world'][i][j]-newnodes[name]['matrix_world'][i][j])>1e-6 for i in range(4) for j in range(4)):
            item['semantic_world_transforms_unchanged']=False
    item['passed']=item['material_names_unchanged'] and item['semantic_world_transforms_unchanged'] and all(m['passed'] for m in item['materials'])
    report['assets'].append(item)

for filename in ['bedside_reference.png','cup_inspection.png']:
    pixels=[]
    for folder in [before,after]:
        im=bpy.data.images.load(str(folder/filename));a=np.array(im.pixels[:],dtype=np.float32).reshape(-1,4)[:,:3];pixels.append(a)
        bpy.data.images.remove(im)
    diff=np.abs(pixels[1]-pixels[0])
    report['images'].append({'file':filename,'mean_absolute_channel_difference':float(diff.mean()),
                             'root_mean_square_channel_difference':float(np.sqrt((diff**2).mean())),
                             'max_channel_difference':float(diff.max()),'fraction_pixels_changed_more_than_0_02':float((diff.max(axis=1)>0.02).mean())})
report['surface_comparison_passed']=all(a['passed'] for a in report['assets'])
(after/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
if not report['surface_comparison_passed']:raise RuntimeError('Surface or semantic frame comparison failed')
