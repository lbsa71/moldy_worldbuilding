"""First matched-camera living scene study; original geometry and portable maps.

blender --background --factory-startup --python scripts/blender/living_scene_build.py -- --render
GLB includes the authored camera and role roots, never preview water/lights/fog.
"""
import argparse, hashlib, importlib.util, json, math, random, struct, sys, types
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
RNG=random.Random(105)

def args():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,default=PROJECT/'art/blender/living-scene-proof/pass01')
    p.add_argument('--render',action='store_true')
    p.add_argument('--samples',type=int,default=48)
    p.add_argument('--environment',type=Path,default=PROJECT/'public/scene-study/overcast.hdr')
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    a.output=a.output.resolve()
    a.environment=a.environment.resolve()
    if (a.output/'living-scene.glb').exists():p.error('Use a new output directory; prior passes are preserved.')
    return a

def empty(name,parent=None,location=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o)
    o.parent=parent;o.location=location;o.empty_display_size=.04;return o

def finish(obj,name,parent,material):
    obj.name=name;obj.parent=parent
    obj.data.materials.append(material)
    return obj

def bevel(o,width=.004,segments=3):
    mod=o.modifiers.new('AuthoredEdgeWear','BEVEL');mod.width=width;mod.segments=segments
    return o

def box(name,dimensions,location,parent,material,edge=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    o=finish(bpy.context.object,name,parent,material);o.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return bevel(o,edge) if edge else o

def mesh(name,verts,faces,parent,material,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o)
    finish(o,name,parent,material)
    for p in data.polygons:p.use_smooth=smooth
    return o

def revolve(name,profile,parent,material,segments=64):
    verts=[(r*math.cos(i/segments*math.tau),r*math.sin(i/segments*math.tau),z) for i in range(segments) for r,z in profile]
    n=len(profile);faces=[]
    for i in range(segments):
        for j in range(n-1):faces.append((i*n+j,((i+1)%segments)*n+j,((i+1)%segments)*n+j+1,i*n+j+1))
    return mesh(name,verts,faces,parent,material)

def tube(name,points,radius,parent,material,cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=1
    data.bevel_depth=radius;data.bevel_resolution=2;data.use_fill_caps=True
    spline=data.splines.new('POLY');spline.points.add(len(points)-1);spline.use_cyclic_u=cyclic
    for point,xyz in zip(spline.points,points):point.co=(*xyz,1)
    o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o);o.parent=parent;o.data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def cylinder(name,radius,depth,location,parent,material,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=location)
    o=finish(bpy.context.object,name,parent,material);bevel(o,.002)
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return o

def uv_planar(obj,scale=1):
    if obj.type!='MESH':return
    uv=obj.data.uv_layers.new(name='PortableUV') if not obj.data.uv_layers else obj.data.uv_layers.active
    for p in obj.data.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]))
        axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]*scale,co[axes[1]]*scale)

def uv_revolve(obj):
    uv=obj.data.uv_layers.active if obj.data.uv_layers else obj.data.uv_layers.new(name='PortableUV')
    for p in obj.data.polygons:
        angles=[math.atan2(obj.data.vertices[obj.data.loops[li].vertex_index].co.y,obj.data.vertices[obj.data.loops[li].vertex_index].co.x)/math.tau for li in p.loop_indices]
        if max(angles)-min(angles)>.5:angles=[a+1 if a<0 else a for a in angles]
        for li,a in zip(p.loop_indices,angles):
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(a,v.z*2.5)

def uv_wood_member(obj):
    uv=obj.data.uv_layers.active if obj.data.uv_layers else obj.data.uv_layers.new(name='PortableUV')
    extents=[max(v.co[i] for v in obj.data.vertices)-min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    grain=max(range(3),key=lambda i:extents[i])
    for polygon in obj.data.polygons:
        normal_axis=max(range(3),key=lambda i:abs(polygon.normal[i]))
        axes=[i for i in range(3) if i!=normal_axis]
        if grain in axes:axes=[next(i for i in axes if i!=grain),grain]
        for li in polygon.loop_indices:
            v=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(v[axes[0]]*1.2,v[axes[1]]*1.2)

def build_lamp(m):
    root=empty('Fading_StudyLamp',location=(1.17,-.12,.145));root['role']='lamp';root['anchor']='persistent warm center'
    foot=revolve('StudyLampFoot',[(0,0),(.115,0),(.16,.013),(.16,.026),(.12,.038),(.063,.070),(0,.070)],root,m['brass'])
    cylinder('StudyLampStem',.012,1.34,(0,0,.73),root,m['brass'])
    for z,r in [(.095,.027),(.14,.022),(.38,.020),(1.32,.029),(1.38,.036)]:
        revolve('StudyLampTurnedCollar',[(.012,z-.017),(r,z-.011),(r,z+.007),(.014,z+.025)],root,m['brass'])
    pivot=empty('StudyShadePivot',root,(0,0,1.42));pivot.rotation_euler=(.015,-.025,0)
    shade=revolve('StudyLampShade',[(.255,0),(.21,.20),(.135,.40),(.130,.40),(.205,.20),(.250,0),(.255,0)],pivot,m['linen'],96)
    for z,r in [(0,.253),(.399,.133)]:
        tube('StudyShadeHem',[(r*math.cos(i/96*math.tau),r*math.sin(i/96*math.tau),z) for i in range(96)],.0023,pivot,m['brass'],True)
    for i in range(8):
        a=i/8*math.tau
        tube('StudyShadeSeam',[(r*math.cos(a),r*math.sin(a),z) for r,z in [(.255,0),(.21,.20),(.135,.40)]],.001,pivot,m['linen'])
    filament=bpy.data.materials.new('StudyWarmFilament');filament.use_nodes=True
    bs=filament.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.8,.4,.1,1)
    bs.inputs['Emission Color'].default_value=(1,.55,.15,1);bs.inputs['Emission Strength'].default_value=1
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.027,location=(0,0,1.52))
    finish(bpy.context.object,'StudyLampFilament',root,filament)
    empty('Fading_StudyLampLight',root,(0,-.015,1.49))
    tube('StudyLampPullChain',[(.06,0,1.47),(.06,0,1.10)],.0014,root,m['brass'])
    for o in root.children_recursive:
        if o.type=='MESH':uv_planar(o,8) if 'Shade' not in o.name else uv_planar(o,5)
    uv_revolve(shade)
    return root

def build_chair(m):
    root=empty('Fading_StudyChair',location=(1.52,-1.60,.145));root['role']='chair';root['pivot']='ground footprint center';root.rotation_euler.z=-.04
    for x in [-.29,.29]:
        for y in [-.25,.25]:
            leg=box('StudyChairLeg',(.045,.052,.55),(x,y,.275),root,m['wood'],.005)
            leg.rotation_euler.y=(-.035 if x<0 else .035)
    for i in range(5):
        box('StudySeatSlat',(.127,.60,.035),(-.27+i*.135,0,.566+RNG.uniform(-.002,.002)),root,m['wood'])
    for x in [-.29,.29]:
        box('StudyBackPost',(.052,.06,.51),(x,.25,.80),root,m['wood'],.005)
    box('StudyBroadWornTopRail',(.64,.065,.145),(0,.25,.99),root,m['wood'],.008)
    box('StudyLowerBackRail',(.59,.045,.046),(0,.25,.67),root,m['wood'],.004)
    for x in [-.17,0,.17]:
        box('StudyVerticalBackSlat',(.062,.034,.30),(x,.252,.815),root,m['wood'],.003)
    for x in [-.29,.29]:box('StudyChairStretcher',(.025,.53,.030),(x,0,.24),root,m['wood'],.003)
    box('StudyFrontWear',(.50,.012,.005),(0,-.297,.585),root,m['wood'],.002)
    # Short front tail stays above the seat; the long tail falls behind the back.
    # The rounded path wraps the evaluated top rail with 4--9 mm clearance.
    path=[]
    for i in range(15):path.append((.205,.755+i/14*(1.052-.755),'front'))
    for i in range(1,13):
        a=math.pi-i/12*math.pi/2
        path.append((.224+.019*math.cos(a),1.052+.019*math.sin(a),'wrap'))
    for i in range(1,9):path.append((.224+i/8*.052,1.071,'wrap'))
    for i in range(1,13):
        a=math.pi/2-i/12*math.pi/2
        path.append((.276+.019*math.cos(a),1.052+.019*math.sin(a),'wrap'))
    for i in range(1,45):
        drop=i/44
        path.append((.295+.047*(1-math.exp(-drop*5)),1.052-drop*.900,'rear'))
    vertices=[];faces=[];nx,nr=33,len(path)
    for row in range(nr):
        t=row/(nr-1)
        for col in range(nx):
            u=col/(nx-1);y,z,region=path[row]
            x=-.065+u*.278+.006*math.sin(t*3.2)+.004*math.sin(u*9+t*2)
            fold=math.sin(u*math.tau*3.2+t*.9)+.32*math.sin(u*17+t*3)
            if region=='wrap':
                z+=.0018*fold
            else:
                end_weight=min(1,abs(z-1.052)/.30)
                y+=.009*fold*end_weight
                z+=.020*math.sin(u*5+.7)*end_weight
            vertices.append((x,y,z))
    for row in range(nr-1):
        for col in range(nx-1):
            a=row*nx+col;faces.append((a,a+1,a+nx+1,a+nx))
    cloth=mesh('StudyDrapedCloth',vertices,faces,root,m['cloth'])
    sol=cloth.modifiers.new('ClothThickness','SOLIDIFY');sol.thickness=.0015
    cloth['drape']='short front tail above seat; long rear tail outside back; rail clearance verified on evaluated triangles'
    for end,label in [(0,'Front'),(nr-1,'Rear')]:
        endpoints=[Vector(vertices[end*nx+i]) for i in range(nx)]
        tube('StudyCloth'+label+'Hem',[tuple(p) for p in endpoints],.0018,root,m['cloth'])
        for i in range(19):
            u=i/18*(nx-1);left=int(u);frac=u-left
            start=endpoints[left].lerp(endpoints[min(left+1,nx-1)],frac)
            length=.018+.005*math.sin(i*2.3)
            mid=start+Vector((.0015*math.sin(i),.001,-length*.50))
            tip=start+Vector((.003*math.sin(i),.002,-length))
            tube('StudyCloth'+label+'Fringe',[tuple(start),tuple(mid),tuple(tip)],.0008,root,m['cloth'])
    for o in root.children_recursive:
        if o.type=='MESH':
            if o.data.materials[0]==m['wood']:uv_wood_member(o)
            else:uv_planar(o,3)
    return root

def build_cup(m,chair):
    root=empty('Fading_StudyCup',chair,(-.23,-.15,.585));root['role']='independently removable cup';root['presence_group']='cup'
    body=revolve('StudyCupBody',[(0,0),(.032,0),(.039,.008),(.052,.088),(.049,.098),(.043,.098),(.035,.014),(0,.014)],root,m['porcelain'],64)
    # A small chipped mouth is geometry rather than painted damage.
    for v in body.data.vertices:
        a=math.atan2(v.co.y,v.co.x)
        distance=abs(math.atan2(math.sin(a+.8),math.cos(a+.8)))
        if v.co.z>.08:v.co.z-=max(0,1-distance/.16)*.006
    body.data.update();uv_revolve(body)
    for coordinate in body.data.uv_layers.active.data:coordinate.uv.y/=(2.5*.098)
    pts=[(.043+.034*math.sin(i/32*math.pi),0,.021+i/32*.055) for i in range(33)]
    handle=tube('StudyCupHandle',pts,.0045,root,m['porcelain']);uv_planar(handle,2)
    empty('StudyCupRim',root,(0,0,.098))
    return root

def coastline(y):
    return -.50+.90*max(0,-y)+.70*max(0,y)+.045*math.sin(y*3.1)+.025*math.sin(y*7.3)

def sand_coastline(y):
    # Retain the support footprint; break the exposed mineral shoreline into inlets.
    return coastline(y)-.38*math.exp(-((y+1.60)/.65)**4)+.025*math.sin(y*17)+.040*math.sin(y*4.3)

def sand_height(x,y):
    distance=max(0,x-sand_coastline(y))
    q=min(1,distance/.85)
    height=-.006+.151*q*q*(3-2*q)
    # Broad rough stone flats retain the validated furniture contact datum.
    for cx,cy,inner,outer in [(1.52,-1.60,.48,.83),(1.17,-.12,.29,.60),(1.98,-1.35,.32,.50)]:
        radius=math.hypot(x-cx,y-cy)
        t=max(0,min(1,(radius-inner)/(outer-inner)))
        weight=1-t*t*(3-2*t)
        height=height*(1-weight)+.145*weight
    contact=min(math.hypot(x-1.52,y+1.60)-.48,math.hypot(x-1.17,y+.12)-.29,math.hypot(x-1.98,y+1.35)-.32)
    ripple=.004*math.sin(y*22+x*7+.9*math.sin(x*4))+.002*math.sin(x*37-y*19)
    return height+(ripple-.024)*min(1,max(0,contact/.20))*min(1,distance/.30)

def build_shore(m):
    root=empty('Fading_StudyShore');root['role']='permanent wet foreground';root['water_level_blender_Z']=0.0
    root['surface']='rough charcoal coastal rock; broken paving, granular seams and selective wet edges'
    verts=[];faces=[];nx,ny=113,161
    for row in range(ny):
        y=-2.7+row/(ny-1)*12
        coast=sand_coastline(y)
        for col in range(nx):
            t=col/(nx-1);x=coast+t*(6.8-coast)
            verts.append((x,y,sand_height(x,y)))
    for row in range(ny-1):
        for col in range(nx-1):
            a=row*nx+col;faces.append((a,a+1,a+nx+1,a+nx))
    shore=mesh('StudyWetShore',verts,faces,root,m['shore_rock']);uv_planar(shore,.5)
    shore.data.materials.append(m['shore_wet_rock'])
    for polygon in shore.data.polygons:
        center=polygon.center
        edge=center.x-sand_coastline(center.y)
        band=.055+.020*math.sin(center.y*2.9)+.020*math.sin(center.y*7)
        puddle=math.sin(center.x*7+center.y*2)*math.sin(center.y*9-center.x*3)
        polygon.material_index=1 if edge<band or (edge<.25 and puddle>.80) else 0
    locations=[]
    for i in range(62):
        y=RNG.uniform(-1.9,5.5)
        coast=coastline(y)
        x=coast+RNG.uniform(-.06,.35)
        locations.append((x,y,RNG.uniform(.015,.035),RNG.uniform(.045,.17)))
    locations.extend([(-1.80,-2.55,.015,.17),(-1.65,-2.58,.012,.08),(-1.35,-2.70,.005,.05),(-.32,-.1,.025,.17),(.75,-.69,.028,.14)])
    # Consume the same random sequence as pass02 so background geometry stays exact.
    for i,(x,y,z,r) in enumerate(locations):
        scale=(RNG.uniform(1,1.8),RNG.uniform(.8,1.4),RNG.uniform(.40,.8))
        rotation=(RNG.uniform(-.2,.2),RNG.uniform(-.2,.2),RNG.random()*math.tau)
        if i<62 and i%6:continue
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,location=(x,y,z))
        o=finish(bpy.context.object,'StudyWetRock',root,m['rock']);o.scale=scale
        for v in o.data.vertices:
            v.co*=1+.19*math.sin(v.co.x*30+v.co.z*12)*math.sin(v.co.y*35-v.co.x*20)
        for p in o.data.polygons:p.use_smooth=False
        o.rotation_euler=rotation
        uv_planar(o,.5)
    return root

def build_backdrop(m):
    root=empty('Fading_StudyBackdrop');root['role']='unchanging distant depth geometry';root['no_baked_foreground_effects']=True
    for i,(x,y,height,width) in enumerate([(8,9,12,4),(7,15,10,3),(5.5,21,8,3),(3.7,28,6,2.7),(1.2,39,4,3)]):
        for layer in range(4):
            cx=x+RNG.uniform(-.7,.7);cy=y+layer*.8
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(cx,cy,height*.30))
            rock=finish(bpy.context.object,'StudyDistantCliff',root,m['cliff']);rock.scale=(width,RNG.uniform(1.7,2.8),height*.75)
            for v in rock.data.vertices:v.co*=RNG.uniform(.86,1.1)
            for polygon in rock.data.polygons:polygon.use_smooth=True
            uv_planar(rock,1)
        for tower in range(3):
            obj=box('StudyDistantArchitecture',(RNG.uniform(.55,.8),.65,RNG.uniform(.5,1.4)),(x+(tower-1)*.75,y,height*.83),root,m['cliff'],.015)
            uv_planar(obj,.6)
    # Fixed-view depth proxy: subdued bridge, calibrated to the reference rectangle.
    for x in [-1.00,-.56,-.12,.32]:
        o=box('StudyBridgePier',(.06,.12,1.25),(x,8,.625),root,m['cliff'],.008);uv_planar(o,.6)
    for center in [-.78,-.34,.10]:
        points=[(center+.19*math.cos(math.pi-i/32*math.pi),8,.95+.21*math.sin(math.pi-i/32*math.pi)) for i in range(33)]
        o=tube('StudyBridgeArch',points,.025,root,m['cliff']);uv_planar(o,.6)
    top=box('StudyBridgeDeck',(1.40,.15,.055),(-.34,8,1.27),root,m['cliff'],.005);uv_planar(top,.6)
    return root

def build_curtain(m):
    root=empty('Fading_StudyCurtain',location=(2.95,.85,.14));root['role']='partial bedside curtain and rail'
    metal=m['brass']
    tube('StudyCurtainFrame',[(-.45,0,0),(-.45,0,2.45),(.60,0,2.45)],.013,root,metal)
    verts=[];faces=[];nx,nz=33,49
    for row in range(nz):
        for col in range(nx):
            u=col/(nx-1);v=row/(nz-1)
            verts.append((-.40+u*.90,.02+.038*math.sin(u*math.tau*7),.26+v*2.13))
    for row in range(nz-1):
        for col in range(nx-1):a=row*nx+col;faces.append((a,a+1,a+nx+1,a+nx))
    fabric=mesh('StudyPartialCurtain',verts,faces,root,m['cloth']);uv_planar(fabric,1.8)
    sol=fabric.modifiers.new('CurtainThickness','SOLIDIFY');sol.thickness=.001
    tube('StudyBedRail',[(-.5,-.10,.08),(-.5,-.10,.82),(.6,-.10,.82),(.6,-.10,.08)],.012,root,metal)
    for x in [-.24,.08,.4]:tube('StudyRailUpright',[(x,-.1,.25),(x,-.1,.82)],.009,root,metal)
    for o in root.children_recursive:
        if o.type=='MESH' and not o.data.uv_layers:uv_planar(o,3)
    return root

def join_role_materials(root):
    # Preserve articulation parent groups; cup is its own descendant role root.
    role_descendants=[o for o in root.children_recursive if o.type=='MESH' and not any(p.name.startswith('Fading_Study') and p!=root for p in lineage(o.parent))]
    groups={}
    for obj in role_descendants:groups.setdefault((obj.parent,obj.data.materials[0]),[]).append(obj)
    for (parent,material),objects in groups.items():
        for o in objects:
            bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
            for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()

def lineage(obj):
    while obj:
        yield obj;obj=obj.parent

def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def yup(point):return [point[0],point[2],-point[1]]

def camera_setup():
    scene=bpy.context.scene;scene.render.resolution_x=1536;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
    bpy.ops.object.camera_add(location=(0,-8.2,1.0));camera=bpy.context.object;camera.name='Fading_StudyCamera'
    camera.data.lens=55;camera.data.sensor_width=36;camera.data.clip_end=200;camera.data.clip_start=.05
    target=(0,0,.70);aim(camera,target);scene.camera=camera
    return camera,target

def preview(roots,m,samples,environment):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=samples;scene.cycles.use_denoising=True
    preferences=bpy.context.preferences.addons['cycles'].preferences
    try:
        preferences.compute_device_type='OPTIX';preferences.refresh_devices()
        for device in preferences.devices:device.use=device.type=='OPTIX'
        scene.cycles.device='GPU'
    except Exception:scene.cycles.device='CPU'
    scene.world=bpy.data.worlds.new('PreviewCoolSky');scene.world.use_nodes=True
    nodes=scene.world.node_tree.nodes;links=scene.world.node_tree.links
    nodes['Background'].inputs['Color'].default_value=(.19,.27,.35,1);nodes['Background'].inputs['Strength'].default_value=.20
    if environment.exists():
        tex=nodes.new('ShaderNodeTexEnvironment');tex.image=bpy.data.images.load(str(environment))
        tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.50,.62,.76,1)
        links.new(tex.outputs['Color'],tint.inputs[1]);links.new(tint.outputs['Color'],nodes['Background'].inputs['Color'])
        nodes['Background'].inputs['Strength'].default_value=.23
    for name,kind,loc,power,color,size,target in [
        ('PreviewBulb','POINT',(1.17,-.135,1.635),120,(1,.56,.24),.035,(1.17,0,0)),
        ('PreviewWarmDown','AREA',(1.17,-.12,1.60),60,(1,.56,.24),.18,(1.17,-.12,.1)),
        ('PreviewCoolSky','AREA',(-3,-3,7),100,(.55,.68,.82),8,(0,0,0)),
        ('PreviewCloudOpening','AREA',(-2,6,8),180,(.68,.76,.86),10,(0,0,0))]:
        data=bpy.data.lights.new(name,kind);data.energy=power;data.color=color
        if kind=='AREA':data.shape='DISK';data.size=size
        else:data.shadow_soft_size=size
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,target)
    bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,0))
    water=bpy.context.object;water.name='PreviewWater_RUNTIME_ONLY'
    mat=bpy.data.materials.new('PreviewWater');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(.018,.033,.043,1);bs.inputs['Roughness'].default_value=.075;bs.inputs['IOR'].default_value=1.333
    bs.inputs['Metallic'].default_value=.0
    tex=mat.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=25;tex.inputs['Detail'].default_value=2
    coords=mat.node_tree.nodes.new('ShaderNodeTexCoord');mat.node_tree.links.new(coords.outputs['Object'],tex.inputs['Vector'])
    bump=mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.03
    mat.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal']);water.data.materials.append(mat)
    # Preview volume is not exported; runtime receives density/color guidance.
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,65,1.6));fog=bpy.context.object;fog.name='PreviewAtmosphere_RUNTIME_ONLY';fog.dimensions=(300,160,5.2)
    mat=bpy.data.materials.new('PreviewAtmosphere');mat.use_nodes=True;mat.node_tree.nodes.clear()
    out=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');vol=mat.node_tree.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value=.010;vol.inputs['Color'].default_value=(.24,.34,.44,1);vol.inputs['Anisotropy'].default_value=.1
    mat.node_tree.links.new(vol.outputs['Volume'],out.inputs['Volume']);fog.data.materials.append(mat)
    scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.0
    scene.render.image_settings.file_format='PNG'

def inspection_renders(output,chair,camera):
    scene=bpy.context.scene
    width,height=scene.render.resolution_x,scene.render.resolution_y
    scene.render.resolution_x=1024;scene.render.resolution_y=1024
    data=bpy.data.cameras.new('InspectionCamera');data.type='ORTHO';data.ortho_scale=1.52
    debug=bpy.data.objects.new('InspectionCamera',data);scene.collection.objects.link(debug)
    scene.camera=debug
    target=chair.matrix_world.translation+Vector((0,0,.57))
    old_angle=chair.rotation_euler.z
    for name,offset,turn in [('inspection-front', (1.20,-1.95,.95),0),
                              ('inspection-rear', (1.00,1.70,.95),0),
                              ('inspection-turned20', (1.20,-1.95,.95),math.radians(-20))]:
        chair.rotation_euler.z=old_angle+turn;bpy.context.view_layer.update()
        debug.location=chair.matrix_world.translation+Vector(offset);aim(debug,target)
        scene.render.filepath=str(output/(name+'.png'));bpy.ops.render.render(write_still=True)
    chair.rotation_euler.z=old_angle;scene.camera=camera
    scene.render.resolution_x=width;scene.render.resolution_y=height
    bpy.data.objects.remove(debug,do_unlink=True)
    bpy.data.cameras.remove(data)

def main():
    a=args();a.output.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.unit_settings.system='METRIC'
    spec=importlib.util.spec_from_file_location('living_scene_materials',Path(__file__).with_name('living_scene_materials.py'))
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    m=helper.create_materials(a.output/'textures')
    lamp=build_lamp(m);chair=build_chair(m);cup=build_cup(m,chair);shore=build_shore(m)
    camera,target=camera_setup();bpy.context.view_layer.update()
    spec=importlib.util.spec_from_file_location('living_scene_environment',Path(__file__).with_name('living_scene_environment.py'))
    environment_helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(environment_helper)
    api=types.SimpleNamespace(empty=empty,mesh=mesh,box=box,tube=tube,uv_planar=uv_planar,sand_height=sand_height,write_png=helper._png)
    backdrop,sky,books,environment_contract=environment_helper.create_environment(api,m,camera,a.output)
    paving=environment_helper.create_paving(api,shore,m);curtain=build_curtain(m)
    roots=[lamp,chair,cup,shore,backdrop,curtain,books,sky]
    bpy.context.view_layer.update()
    spec=importlib.util.spec_from_file_location('living_scene_validate',Path(__file__).with_name('living_scene_validate.py'))
    validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
    contacts=validator.audit_blender_contacts(chair,shore,lamp,a.output/'contacts.json')
    connections=validator.audit_environment_connections(environment_contract['terrain_connections'])
    (a.output/'terrain-connections.json').write_text(json.dumps(connections,indent=2)+'\n',encoding='utf-8',newline='\n')
    if not connections['valid']:raise RuntimeError('Bridge terrain connections failed')
    for root in roots:join_role_materials(root)
    bpy.ops.object.select_all(action='DESELECT')
    for root in roots:
        root.select_set(True)
        for o in root.children_recursive:o.select_set(True)
    camera.select_set(True);bpy.context.view_layer.objects.active=lamp
    glb=a.output/'living-scene.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,
                              export_extras=True,export_cameras=True,export_lights=False,export_animations=False)
    raw=glb.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length])
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for n in doc['nodes'] if 'mesh' in n for p in doc['meshes'][n['mesh']]['primitives'])
    manifest={'status':'pass04 fractured rock and inhabited inlet checkpoint; browser art review required','blender':bpy.app.version_string,
        'generator':'scripts/blender/living_scene_build.py','generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'file':'living-scene.glb','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'triangles':triangles,
        'mesh_primitives':sum(len(doc['meshes'][n['mesh']]['primitives']) for n in doc['nodes'] if 'mesh' in n),
        'materials':len(doc.get('materials',[])),'embedded_images':len(doc.get('images',[])),
        'units':'meters','coordinates':'glTF Y-up, right-handed; Blender (x,y,z) -> (x,z,-y)',
        'camera':{'name':camera.name,'position':yup(camera.location),'target':yup(target),'fov':camera.data.angle_y,'aspect':1.5,'near':.05,'far':200},
        'lampLight':{'socket':'Fading_StudyLampLight','position':yup(bpy.data.objects['Fading_StudyLampLight'].matrix_world.translation),
                     'intensity':10,'color':[1,.64,.31],'range':6,'note':'Babylon intensity is an initial calibration suggestion, not Cycles watts'},
        'environment':{'cool_color':[.19,.27,.35],'fog_color':[.24,.34,.44],'fog_density':.013,'fog_density_suggestion':.010,
                       'fog_note':'Runtime EXP2 coefficient per scene meter; offline low-altitude volume has separate density, not a universal fog floor',
                       'background':'real layered terrain/bridge/settlement; separate raw unlit photographic cloud dome'},
        'water':{'runtime_only':True,'level':0,'roughness_suggestion':.075,'IOR':1.333,'reflection_membership':'all visible foreground roles; no furniture baked into permanent reflection'},
        'roles':[{'name':r.name,'parent':r.parent.name if r.parent else None,'position':yup(r.matrix_world.translation)} for r in roots],
        'texture_provenance':getattr(helper,'TEXTURE_PROVENANCE','Original procedural authored maps; no acquired assets'),
        'contacts':{'report':'contacts.json','passed':contacts.get('passed',False),'chair_turn_test_degrees':-20},
        'shore':{'physical_tile_width_m':2,'family':'scanned charcoal coastal mineral rock; predominantly rough, selectively damp edges','paving_root':paving.name,
                 'separate_pieces':[o.name for o in paving.children if o.type=='MESH']},
        'books':{'root':books.name,'individual_roots':[o.name for o in books.children],'static':True,'no_readable_titles':True},
        'sky':{'root':sky.name,'unlit':True,'fog':False,'castShadows':False,'receiveShadows':False,'reflection_membership':True,
               'source':environment_contract['sky_provenance'],'texture':'sky-clouds.png'},
        'environment_roles':environment_contract['environment_roles'],'terrain_connections':environment_contract['terrain_connections'],
        'known_limits':['Offline AgX and low-altitude volumetric haze require browser calibration','Buildings and hidden bridge banks are reconstruction choices, not a recovered city plan','Portrait camera not approved','Cup follows chair and remains independently removable']}
    if a.environment.exists():
        manifest['environment']['ibl']={'asset':'Overcast Soil (Pure Sky)','source':'https://polyhaven.com/a/overcast_soil_puresky','license':'CC0',
            'authors':['Jarod Guest','Sergej Majboroda'],'sha256':hashlib.sha256(a.environment.read_bytes()).hexdigest(),'offline_strength':.23,'offline_tint':[.50,.62,.76]}
    (a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8',newline='\n')
    preview(roots,m,a.samples,a.environment)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(a.output/'living-scene.blend'))
    if a.render:
        bpy.context.scene.render.filepath=str(a.output/'reference.png');bpy.ops.render.render(write_still=True)
        inspection_renders(a.output,chair,camera)
    print('LIVING_SCENE_READY '+str(a.output))

if __name__=='__main__':main()
