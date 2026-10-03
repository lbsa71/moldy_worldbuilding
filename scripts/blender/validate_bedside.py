"""Reimport every GLB in a fresh scene and audit geometry and transport data."""
import bpy, bmesh, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Vector
import numpy as np

folder = Path(sys.argv[sys.argv.index('--') + 1])
expectations = {
    'lamp': ('Fading_Lamp', ['lampFilament', 'lampWarmthSocket', 'lampShadePivot'], 6000, 3),
    'chair': ('Fading_Chair', ['chairSeatSocket', 'chairFacingSocket'], 4000, 2),
    'cup': ('Fading_Cup', ['cupRimSocket', 'cupHandle', 'cupRimChip'], 2000, 2),
    'bedside': ('Fading_Bedside', ['railTapSocket', 'bedRail', 'curtainFrame', 'partialCurtain'], 10000, 2),
}
report = {'blender': bpy.app.version_string, 'assets': [], 'checks': {}}

for asset, (root_name, required, budget, matcount) in expectations.items():
    path = folder / (asset + '_lod0.glb')
    raw = path.read_bytes()
    magic, version, size = struct.unpack_from('<III', raw)
    jsize, jkind = struct.unpack_from('<II', raw, 12)
    doc = json.loads(raw[20:20+jsize])
    binstart = 20 + jsize + 8
    binary = raw[binstart:]
    def accessor(index):
        a = doc['accessors'][index]; v = doc['bufferViews'][a['bufferView']]
        dtype = {5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
        width = {'VEC3':3,'SCALAR':1,'VEC2':2,'VEC4':4}[a['type']]
        offset = v.get('byteOffset',0) + a.get('byteOffset',0)
        return np.ndarray((a['count'],width), dtype=dtype, buffer=binary, offset=offset,
                          strides=(v.get('byteStride',np.dtype(dtype).itemsize*width),np.dtype(dtype).itemsize))
    exported_triangles = 0; raw_degenerate = 0
    for m in doc.get('meshes',[]):
        for p in m['primitives']:
            xyz = accessor(p['attributes']['POSITION'])
            idx = accessor(p['indices']).reshape(-1,3)
            exported_triangles += len(idx)
            areas = np.linalg.norm(np.cross(xyz[idx[:,1]]-xyz[idx[:,0]],xyz[idx[:,2]]-xyz[idx[:,0]]),axis=1)
            raw_degenerate += int(np.count_nonzero(areas < 1e-12))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    names = {o.name for o in bpy.context.scene.objects}
    root = bpy.data.objects.get(root_name)
    mesh_report = []; corners = []; triangles = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH': continue
        data = obj.data; data.calc_loop_triangles(); triangles += len(data.loop_triangles)
        corners.extend(obj.matrix_world @ v.co for v in data.vertices)
        bm = bmesh.new(); bm.from_mesh(data)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
        bm.normal_update()
        boundaries = sum(e.is_boundary for e in bm.edges)
        nonmanifold = sum(not e.is_manifold for e in bm.edges)
        inconsistent = sum(e.is_manifold and not e.is_contiguous for e in bm.edges)
        vol = bm.calc_volume(signed=True)
        mesh_report.append({'name':obj.name,'triangles':len(data.loop_triangles),
                            'boundary_edges_after_weld':boundaries,'nonmanifold_edges_after_weld':nonmanifold,
                            'inconsistent_winding_edges':inconsistent,
                            'signed_volume_m3':vol,'closed_outward':nonmanifold==0 and inconsistent==0 and vol>0})
        bm.free()
    low = [min(c[i] for c in corners) for i in range(3)]
    high = [max(c[i] for c in corners) for i in range(3)]
    orientation_socket = {'lamp':('lampWarmthSocket',[0,1.42,0]),'chair':('chairFacingSocket',[0,0.47,0.35]),
                          'cup':('cupRimSocket',[0,0.09,0]),'bedside':('railTapSocket',[0.25,0.85,0])}[asset]
    transport_node = next(n for n in doc['nodes'] if n['name']==orientation_socket[0])
    expected_dimensions = {'lamp':[0.4812,0.4820,1.7092],'chair':[0.429,0.43,0.9],
                           'cup':[0.113,0.086,0.0911],'bedside':[1.925,0.278,2.112]}[asset]
    checks = {
        'single_expected_root':len(roots)==1 and roots[0].name==root_name,
        'root_at_origin_identity':root is not None and all(abs(root.matrix_world[i][j]-(1 if i==j else 0))<1e-6 for i in range(4) for j in range(4)),
        'semantic_names_present':all(n in names for n in required),
        'no_cameras_lights_animations_skins':not any(k in doc for k in ['cameras','animations','skins']) and not any(o.type in ['CAMERA','LIGHT'] for o in bpy.context.scene.objects),
        'no_textures_images':not any(k in doc for k in ['textures','images']),
        'material_count':len(doc.get('materials',[]))==matcount,
        'triangle_budget':triangles<=budget,
        'no_degenerate_triangles':raw_degenerate==0,
        'reimport_triangle_count_matches':triangles==exported_triangles,
        'closed_consistent_outward_meshes':all(m['closed_outward'] for m in mesh_report),
        'contact_plane':abs(low[2])<1e-6,
        'expected_dimensions':all(abs(high[i]-low[i]-expected_dimensions[i])<0.002 for i in range(3)),
        'Y_up_once_socket_translation':all(abs(transport_node.get('translation',[0,0,0])[i]-orientation_socket[1][i])<1e-6 for i in range(3)),
        'core_metal_rough_materials_only':not doc.get('extensionsUsed') and all('pbrMetallicRoughness' in m for m in doc['materials']),
        'no_physics':all(o.rigid_body is None for o in bpy.context.scene.objects) and not doc.get('extensionsUsed'),
    }
    item={'file':path.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
          'triangles':triangles,'budget':budget,'bounds_blender_Z_up':{'min':low,'max':high,'dimensions':[high[i]-low[i] for i in range(3)]},
          'required_names':required,'all_names':sorted(names),'gltf_root_nodes':[doc['nodes'][i] for i in doc['scenes'][doc.get('scene',0)]['nodes']],
          'materials':doc.get('materials',[]),'extensions_used':doc.get('extensionsUsed',[]),'checks':checks,'meshes':mesh_report}
    if asset=='cup':
        body=bpy.data.objects['cupBody_LOD0'].data
        outer=[];inner=[];bottom=[];floor=[]
        for p in body.polygons:
            c=p.center;n=p.normal;r=(c.x*c.x+c.y*c.y)**0.5
            if 0.025<c.z<0.075:
                outer_r=0.036+(c.z-0.006)/0.080*0.007
                inner_r=0.033+(c.z-0.012)/0.078*0.004
                (outer if r>(outer_r+inner_r)/2 else inner).append(n.x*c.x+n.y*c.y)
            if abs(c.z)<1e-6: bottom.append(n.z)
            if abs(c.z-0.012)<1e-6 and r<0.03: floor.append(n.z)
        item['cup_surface_normals']={'outer_radial_min':min(outer),'inner_radial_max':max(inner),
                                     'underside_max_Z':max(bottom),'interior_floor_min_Z':min(floor)}
        rim=[v.co.z for v in body.vertices if any(abs((v.co.x*v.co.x+v.co.y*v.co.y)**0.5-r)<1e-6 for r in [0.037,0.041]) and v.co.z>0.075]
        item['cup_rim_height_m']={'min':min(rim),'max':max(rim),'chip_depth':max(rim)-min(rim)}
        checks['cup_normals_outward']=min(outer)>0 and max(inner)<0 and max(bottom)<0 and min(floor)>0
    report['assets'].append(item)

report['combined_triangles']=sum(a['triangles'] for a in report['assets'])
report['combined_glb_bytes']=sum(a['bytes'] for a in report['assets'])
report['checks']['combined_triangle_budget']=report['combined_triangles']<25000
report['checks']['combined_download_budget']=report['combined_glb_bytes']<4*1024*1024
(folder/'validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({a['file']:{'triangles':a['triangles'],'checks':a['checks'],'open_or_inverted':[m for m in a['meshes'] if not m['closed_outward']]} for a in report['assets']},indent=2))
