"""Pass04 fixed-view inlet, connected masonry bridge, books and raw cloud dome.

All terrain, roofs, bridge spans, books and fracture pieces are portable geometry.
The cloud dome uses a licensed sky-only HDR adapted to raw unlit RGB, independent
of the scene's illumination HDR. No foreground image is baked into the sky.
"""
import hashlib,json,math,random
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

R=random.Random(404)

def frame_point(camera,u,v,depth):
    rotation=camera.matrix_world.to_quaternion()
    ray=rotation @ Vector(((u*2-1)*math.tan(camera.data.angle_x/2),
                          (1-v*2)*math.tan(camera.data.angle_y/2),-1))
    return camera.matrix_world.translation+ray*depth

def interpolate(points,u):
    for (a,y),(b,z) in zip(points,points[1:]):
        if a<=u<=b:return y+(z-y)*(u-a)/(b-a)
    return points[0][1] if u<points[0][0] else points[-1][1]

def terrain(B,name,parent,material,camera,profile,depth,thickness,back_rise=0,columns=129,rows=25):
    """A volumetric eroded cliff with a measured in-frame front profile."""
    vertices=[];faces=[];start,end=profile[0][0],profile[-1][0]
    tops=[]
    for i in range(columns):
        u=start+(end-start)*i/(columns-1)
        ridge=interpolate(profile,u)+.0024*math.sin(i*1.71)+.0018*math.sin(i*.48)
        top=frame_point(camera,u,ridge,depth);top.z=max(.035,top.z)
        top.y+=.28*math.sin(i*.57)+.10*math.sin(i*2.1)
        tops.append(top)
    for side in range(2):
        for row in range(rows):
            t=row/(rows-1)
            for col,top in enumerate(tops):
                flank=.015*math.sin(col*1.39+t*6)+.010*math.sin(col*.38-t*12)
                x=top.x+flank*math.sin(t*math.pi)
                y=top.y+side*thickness-(1-side)*(.30*(1-t)+.15*math.sin(t*11+col*.7))
                z=-.35+t*(top.z+.35+side*back_rise)
                if 0<t<1:z+=.045*math.sin(col*1.6+t*15)*math.sin(t*math.pi)
                vertices.append((x,y,z))
    count=columns*rows
    for side in range(2):
        offset=side*count
        for row in range(rows-1):
            for col in range(columns-1):
                a=offset+row*columns+col
                face=(a,a+1,a+columns+1,a+columns)
                faces.append(face if side==0 else tuple(reversed(face)))
    for col in range(columns-1):
        faces.append((col,col+count,col+1+count,col+1))
        a=(rows-1)*columns+col;faces.append((a,a+1,a+1+count,a+count))
    for row in range(rows-1):
        a=row*columns;faces.append((a,a+columns,a+columns+count,a+count))
        a=row*columns+columns-1;faces.append((a,a+count,a+columns+count,a+columns))
    triangles=[]
    for face in faces:triangles.extend([(face[0],face[1],face[2]),(face[0],face[2],face[3])])
    obj=B.mesh(name,vertices,triangles,parent,material,False);B.uv_planar(obj,.5)
    obj['depth_layer_m']=depth;obj['surface']='eroded vertical mineral faces and broken shelves'
    return obj,tops

def surface_height(obj,x,y):
    dg=bpy.context.evaluated_depsgraph_get();evaluated=obj.evaluated_get(dg);data=evaluated.to_mesh()
    try:
        data.calc_loop_triangles();verts=[evaluated.matrix_world@v.co for v in data.vertices]
        bvh=BVHTree.FromPolygons(verts,[tuple(t.vertices) for t in data.loop_triangles],all_triangles=True)
        hit,_,_,_=bvh.ray_cast(Vector((x,y,100)),Vector((0,0,-1)),150)
        if hit is None:raise RuntimeError(f'No terrain support at {obj.name}: {x},{y}')
        return hit.z
    finally:evaluated.to_mesh_clear()

def plain_material(name,color,roughness):
    material=bpy.data.materials.new(name);material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=roughness
    return material

def roof(B,name,center,width,length,height,parent,material,hip=False):
    x,y,z=center
    vertices=[(x-width/2,y-length/2,z),(x+width/2,y-length/2,z),
              (x+width/2,y+length/2,z),(x-width/2,y+length/2,z),
              (x,y-length/2+(length*.20 if hip else 0),z+height),
              (x,y+length/2-(length*.20 if hip else 0),z+height)]
    faces=[(0,3,2,1),(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4)]
    obj=B.mesh(name,vertices,faces,parent,material,False);B.uv_planar(obj,.5)
    return obj

def settlement(B,parent,terrain_obj,profile,camera,depth,m):
    roof_material=plain_material('StudySettlementRoof',(.028,.035,.040),.94)
    masonry=m['cliff'].copy();masonry.name='StudySettlementMasonry'
    # Existing cool mineral maps; roofs and recesses are neutral, never emissive.
    for i in range(58):
        u=.518+i/57*.49+R.uniform(-.003,.003)
        projected_v=interpolate(profile,u)
        point=frame_point(camera,u,projected_v,depth);point.y+=R.uniform(.65,2.2)
        base=surface_height(terrain_obj,point.x,point.y)-.035
        width=R.uniform(.30,.63);length=R.uniform(.45,.85)
        height=R.uniform(.46,.91)*(1.3 if i%11==0 else 1)
        obj=B.box('StudySettlementWall', (width,length,height),(point.x,point.y,base+height/2),parent,masonry,.012)
        B.uv_planar(obj,.5)
        roof(B,'StudySettlementRoof', (point.x,point.y,base+height),width*1.10,length*1.08,R.uniform(.17,.38),parent,roof_material,i%4==0)
        if i%9==2:
            tower=B.box('StudySmallStoneTower',(.26,.32,height+.45),(point.x+width*.30,point.y+.18,base+(height+.45)/2),parent,masonry,.008)
            B.uv_planar(tower,.5)
            roof(B,'StudySmallTowerRoof',(point.x+width*.30,point.y+.18,base+height+.45),.31,.37,.22,parent,roof_material,True)
        if i%3==0:
            # A recessed, unlit slit is geometry and remains subordinate in haze.
            recess=B.box('StudySettlementRecess',(.035,.014,.095),(point.x-width*.15,point.y-length/2-.01,base+height*.64),parent,roof_material,.001)
            B.uv_planar(recess,.5)
    return masonry,roof_material

def extrude_xz(B,name,outline,y,thickness,parent,material):
    n=len(outline);vertices=[(x,y+s*thickness,z) for s in range(2) for x,z in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
    obj=B.mesh(name,vertices,faces,parent,material,False);B.uv_planar(obj,.5);return obj

def bridge(B,parent,left,right,camera,m):
    root=B.empty('StudyInletBridge',parent);root['role']='distant connected masonry crossing'
    a=frame_point(camera,.406,.335,56);b=frame_point(camera,.535,.335,56)
    a.z=surface_height(left,a.x,a.y)-.02;b.z=surface_height(right,b.x,b.y)-.02
    height=lambda x:a.z+(b.z-a.z)*(x-a.x)/(b.x-a.x)
    y=a.y-.24;thickness=.50
    material=m['cliff'];width=b.x-a.x
    extrude_xz(B,'StudyBridgeDeck',[(a.x,height(a.x)),(b.x,height(b.x)),(b.x,height(b.x)+.14),(a.x,height(a.x)+.14)],y,thickness,root,material)
    for side in [y-.045,y+thickness]:
        extrude_xz(B,'StudyBridgeParapet',[(a.x,height(a.x)+.14),(b.x,height(b.x)+.14),
                    (b.x,height(b.x)+.32),(a.x,height(a.x)+.32)],side,.065,root,material)
    spans=3;step=width/spans
    for i in range(spans+1):
        x=a.x+i*step;top=height(x)
        obj=B.box('StudyBridgePier',(.23,.64,top+.35),(x,y+thickness/2,(top-.35)/2),root,material,.018);B.uv_planar(obj,.5)
    for i in range(spans):
        l=a.x+i*step+.105;r=a.x+(i+1)*step-.105;center=(l+r)/2
        opening=[]
        for j in range(25):
            angle=math.pi-j/24*math.pi;x=center+(r-l)/2*math.cos(angle)
            opening.append((x,.65+.94*math.sin(angle)))
        outline=opening+[(r,height(r)),(l,height(l))]
        extrude_xz(B,'StudyBridgeArchSpandrel',outline,y,thickness,root,material)
    for name,point,obj in [('StudyBridgeAnchorLeft',a,left),('StudyBridgeAnchorRight',b,right)]:
        anchor=B.empty(name,root,tuple(point));anchor['terrain']=obj.name
    return root,[{'name':'left abutment overlap','anchor':'StudyBridgeAnchorLeft','terrain':left.name,'tolerance_m':.04},
                 {'name':'right abutment overlap','anchor':'StudyBridgeAnchorRight','terrain':right.name,'tolerance_m':.04}]

def create_books(B,m):
    ground=B.sand_height(1.98,-1.35)
    root=B.empty('Fading_StudyBooks',location=(1.98,-1.35,ground));root['role']='quiet worn book stack';root['static']=True
    cover=plain_material('StudyBookCover',(.045,.032,.025),.91)
    paper=plain_material('StudyBookPaper',(.27,.247,.211),.93)
    z=0
    for i,(w,d,h,angle) in enumerate([(.37,.245,.033,.14),(.32,.23,.026,-.11),(.34,.25,.022,.05)]):
        book=B.empty('StudyBook_'+str(i+1),root,(i*.008,0,z));book.rotation_euler.z=angle
        book['role']='individual worn book';book['pivot']='bottom cover footprint center';book['static']=True
        for face in [0,h-.003]:B.box('StudyBookCover_'+str(i+1),(w,d,.003),(0,0,face+.0015),book,cover,.0005)
        B.box('StudyBookPages_'+str(i+1),(w-.011,d-.010,h-.006),(0,.002,h/2),book,paper,.001)
        B.box('StudyBookSpine_'+str(i+1),(.007,d,h),(-w/2+.0035,0,h/2),book,cover,.002)
        for j in range(6):
            # Fine page seams, geometry rather than invented text or decoration.
            B.box('StudyBookPageEdge', (w-.014,.0013,.00035),(0,-d/2+.004,h*.17+j*h*.11),book,cover,0)
        z+=h+.0006
    for obj in root.children_recursive:
        if obj.type=='MESH':B.uv_planar(obj,1)
    return root

def create_paving(B,shore,m):
    root=B.empty('Fading_StudyPaving',shore);root['role']='separate fractured charcoal mineral slabs';root['static']=True
    positions=[(.73,-.62,.30,.18),(.84,-.92,.37,.21),(1.00,-1.26,.35,.20),
               (1.19,-2.05,.40,.20),(1.58,-2.30,.45,.22),(1.95,-2.35,.39,.22),
               (2.38,-2.19,.41,.24),(2.64,-1.85,.42,.26),(2.59,-1.27,.47,.28),
               (2.34,-.68,.48,.30),(1.80,-.68,.41,.27),(1.62,-.30,.30,.25),
               (.56,.14,.28,.19),(.85,.52,.33,.20),(1.28,.76,.45,.25)]
    for i,(x,y,w,d) in enumerate(positions):
        if min(math.hypot(x-1.52,y+1.60)-.49,math.hypot(x-1.17,y+.12)-.28)<.08:continue
        w*=1.65;d*=1.65
        angle=R.uniform(-.65,.65);cos,sin=math.cos(angle),math.sin(angle)
        outline=[(-.50,-.35),(-.36,-.51),(.25,-.49),(.48,-.30),(.51,.20),(.27,.48),(-.24,.50),(-.51,.22)]
        center_z=B.sand_height(x,y);vertices=[]
        for side in range(2):
            for j,(a,b) in enumerate(outline):
                a*=w*(1+R.uniform(-.11,.11));b*=d*(1+R.uniform(-.11,.11))
                dx=a*cos-b*sin;dy=a*sin+b*cos
                z=B.sand_height(x+dx,y+dy)+(.030+.007*math.sin(j*2+i) if side else -.030)
                vertices.append((dx,dy,z-center_z))
        n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
        for j in range(n):faces.append((j,(j+1)%n,(j+1)%n+n,j+n))
        obj=B.mesh('StudyPavingSlab_'+str(i+1).zfill(3),vertices,faces,root,m['shore_rock'],False)
        obj.location=(x,y,center_z);obj['future_role']='fractured paving piece';obj['pivot']='ground contact center';obj['preserve_semantics']=True
        B.uv_planar(obj,.5)
    return root

def create_sky(B,camera,output):
    source_dir=Path(__file__).resolve().parents[2]/'art/blender/living-scene-proof/pass04/source-assets/sky'
    provenance=json.loads((source_dir/'provenance.json').read_text())
    source=source_dir/'kloofendal_overcast_puresky_4k.hdr'
    if hashlib.sha256(source.read_bytes()).hexdigest()!=provenance['sha256']:raise RuntimeError('Sky source checksum differs')
    image=bpy.data.images.load(str(source),check_existing=False);w,h=image.size[:]
    pixels=np.empty(w*h*4,dtype=np.float32);image.pixels.foreach_get(pixels);pixels=pixels.reshape(h,w,4)
    # Raw albedo is a restrained scene-linear adaptation, NOT an AgX/ACES beauty.
    rgb=pixels[:,:,:3];luma=rgb.mean(axis=2)
    reference=max(float(np.percentile(luma[h//2:],55)),1e-6)
    scalar=np.clip(luma/reference,.025,3.0)**1.35
    rgb=np.clip(scalar[:,:,None]*np.asarray((.085,.124,.173),dtype=np.float32),0,.8)
    # Low horizon is a calm cool veil; cloud structure remains above it.
    latitude=np.linspace(-math.pi/2,math.pi/2,h)[:,None]
    veil=np.clip((.11-latitude)/.20,0,1)[:,:,None]
    rgb=rgb*(1-veil)+np.asarray((.093,.133,.178),dtype=np.float32)*veil
    encoded=np.where(rgb<=.0031308,rgb*12.92,1.055*rgb**(1/2.4)-.055)
    B.write_png(output/'sky-clouds.png',encoded[::-1])
    texture=bpy.data.images.load(str(output/'sky-clouds.png'));texture.colorspace_settings.name='sRGB'
    material=bpy.data.materials.new('StudyRawUnlitCloudSky');material.use_nodes=True;material.use_backface_culling=False
    nodes=material.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');tex=nodes.new('ShaderNodeTexImage');tex.image=texture
    # Blender implicitly converts Color to unlit emission; exporter recognizes
    # this exact colour-to-Surface path as KHR_materials_unlit + baseColorTexture.
    material.node_tree.links.new(tex.outputs['Color'],out.inputs['Surface'])
    root=B.empty('Fading_StudySky');root['role']='raw unlit sky-only dome';root['fog']=False;root['castShadows']=False;root['receiveShadows']=False
    radius=155;vertices=[];faces=[];columns=97;rows=49
    for row in range(rows):
        lat=-math.pi/2+.0001+(math.pi-.0002)*row/(rows-1)
        for col in range(columns):
            angle=col/(columns-1)*math.tau-2.42
            vertices.append((radius*math.cos(lat)*math.cos(angle),radius*math.cos(lat)*math.sin(angle),radius*math.sin(lat)))
    for row in range(rows-1):
        for col in range(columns-1):
            a=row*columns+col;faces.append((a,a+columns,a+columns+1,a+1))
    obj=B.mesh('StudySkyDome',vertices,faces,root,material,True)
    if sum(p.normal.dot(p.center) for p in obj.data.polygons)>0:
        import bmesh
        bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
    uv=obj.data.uv_layers.new(name='RawCloudUV')
    for polygon in obj.data.polygons:
        values=[]
        for li in polygon.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            u=((math.atan2(co.y,co.x)+2.42)/math.tau)%1
            v=max(.001,min(.999,.62+math.asin(max(-1,min(1,co.z/radius)))/math.pi*2.2))
            values.append((li,u,v))
        seam=max(p[1] for p in values)-min(p[1] for p in values)>.5
        for li,u,v in values:uv.data[li].uv=(u+1 if seam and u<.5 else u,v)
    obj.visible_shadow=False;obj.visible_diffuse=False;obj.visible_transmission=False;obj.visible_volume_scatter=False
    obj['fog']=False;obj['castShadows']=False;obj['receiveShadows']=False
    bpy.data.images.remove(image)
    provenance['adaptation']={'raw_linear_palette':[.085,.124,.173],'cloud_contrast_power':1.35,'horizon_veil':True,'dome_radius_m':155,'longitude_rotation_rad':-2.42,'latitude_scale':2.2,'latitude_offset':.12,'color_pipeline':'Scene-linear adapted raw albedo explicitly sRGB-encoded; no display transform or full-scene bake'}
    provenance['texture_sha256']=hashlib.sha256((output/'sky-clouds.png').read_bytes()).hexdigest()
    (output/'sky-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8',newline='\n')
    return root,provenance

def create_environment(B,m,camera,output):
    root=B.empty('Fading_StudyBackdrop');root['role']='layered inhabited mountainous inlet';root['no_baked_foreground_effects']=True
    layers=[]
    far=B.empty('StudyFarLeftLayer',root)
    left_far,_=terrain(B,'StudyFarLeftTerrain',far,m['cliff'],camera,[(-.18,.43),(0,.405),(.08,.395),(.16,.425),(.24,.435),(.31,.42),(.39,.45),(.43,.46)],108,12,columns=105)
    layers.append({'name':'far left irregular land','node':far.name,'static_depth_layer':108,'require_in_frame':True})
    left_bank_root=B.empty('StudyLeftBankLayer',root)
    left,_=terrain(B,'StudyLeftLand',left_bank_root,m['cliff'],camera,[(-.12,.47),(.05,.45),(.17,.435),(.25,.425),(.33,.408),(.39,.375),(.423,.34)],45,18,.55)
    layers.append({'name':'bridge left bank','node':left_bank_root.name,'static_depth_layer':45,'require_in_frame':True})
    right_bank_root=B.empty('StudyRightBankLayer',root)
    right,_=terrain(B,'StudyRightLand',right_bank_root,m['cliff'],camera,[(.505,.39),(.55,.33),(.62,.245),(.72,.17),(1.12,.10)],49,18,.25)
    layers.append({'name':'bridge right bank','node':right_bank_root.name,'static_depth_layer':49,'require_in_frame':True})
    city_root=B.empty('StudySettlementLayer',root)
    profile=[(.501,.43),(.54,.39),(.58,.34),(.62,.285),(.66,.225),(.70,.145),(.74,.095),(.80,.045),(1.14,-.08)]
    cliff,_=terrain(B,'StudySettlementCliff',city_root,m['cliff'],camera,profile,29,7,.16,columns=153,rows=33)
    settlement(B,city_root,cliff,profile,camera,29,m)
    layers.append({'name':'right cliff and quiet settlement','node':city_root.name,'static_depth_layer':29,'require_in_frame':True})
    near_root=B.empty('StudyNearOutcropLayer',root)
    terrain(B,'StudyNearOutcrop',near_root,m['cliff'],camera,[(.52,.515),(.555,.455),(.59,.468),(.625,.428),(.67,.445),(.735,.40),(.84,.39),(1.1,.33)],17,6,.05,columns=97,rows=21)
    layers.append({'name':'nearer right outcrop','node':near_root.name,'static_depth_layer':17,'require_in_frame':True})
    bpy.context.view_layer.update()
    bridge_root,connections=bridge(B,root,left,right,camera,m)
    layers.append({'name':'connected distant bridge','node':bridge_root.name,'static_depth_layer':56,'require_in_frame':True})
    sky,sky_provenance=create_sky(B,camera,output)
    books=create_books(B,m)
    return root,sky,books,{'environment_roles':layers,'terrain_connections':connections,'sky_provenance':sky_provenance}
