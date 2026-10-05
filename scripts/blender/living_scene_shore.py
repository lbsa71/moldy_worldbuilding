"""Pass05 fractured block shore; no changes to furniture or environment assets."""
import math
import random


def area(poly):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))/2


def halfplane(poly,axis,limit,greater):
    result=[]
    if not poly:return result
    for a,b in zip(poly,poly[1:]+poly[:1]):
        da=(a[axis]-limit)*(1 if greater else -1)
        db=(b[axis]-limit)*(1 if greater else -1)
        if da>=0:result.append(a)
        if (da<0)!=(db<0):
            t=da/(da-db)
            result.append(tuple(a[i]+t*(b[i]-a[i]) for i in range(2)))
    return result


def subtract_rectangle(poly,rect):
    # Emit disjoint convex pieces outside the contact reservation.
    xmin,xmax,ymin,ymax=rect;inside=poly;outside=[]
    for axis,limit,greater in [(0,xmin,True),(0,xmax,False),(1,ymin,True),(1,ymax,False)]:
        piece=halfplane(inside,axis,limit,not greater)
        if len(piece)>=3 and area(piece)>.025:outside.append(piece)
        inside=halfplane(inside,axis,limit,greater)
        if len(inside)<3:break
    return outside


def outline(x,y,w,d,angle,rng,chipping=.08):
    # Long mineral planes with unequal clipped corners, rather than rounded stones.
    cuts=[rng.uniform(.035,chipping) for _ in range(4)]
    a,b,c,e=cuts
    points=[(-w/2+a,-d/2),(w/2-b,-d/2),(w/2,-d/2+b),
            (w/2,d/2-c),(w/2-c,d/2),(-w/2+e,d/2),
            (-w/2,d/2-e),(-w/2,-d/2+a)]
    co,si=math.cos(angle),math.sin(angle)
    return [(x+u*co-v*si,y+u*si+v*co) for u,v in points]


def block(B,parent,m,name,poly,top,bottom,flat=False):
    x=sum(p[0] for p in poly)/len(poly);y=sum(p[1] for p in poly)/len(poly)
    tilt=(0,0) if flat else (.012*math.sin(x*7+y*3),.018*math.cos(y*4-x))
    verts=[]
    for z in [bottom,top]:
        for px,py in poly:
            verts.append((px-x,py-y,z-top+(tilt[0]*(px-x)+tilt[1]*(py-y) if z==top else 0)))
    n=len(poly)
    # Convex polygons are triangulated explicitly, retaining a closed rock solid.
    faces=[]
    for i in range(1,n-1):faces.extend([(0,i+1,i),(n,n+i,n+i+1)])
    for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
    obj=B.mesh(name,verts,faces,parent,m,False);obj.location=(x,y,top)
    obj['future_role']='individual fractured mineral block';obj['pivot']='top footprint center at support datum'
    obj['preserve_semantics']=True;obj['static']=True;obj['contact_surface']=True
    obj['submerged_bottom_m']=bottom;obj['top_datum_m']=top
    B.uv_planar(obj,.5)
    return obj


def create_shore(B,m):
    rng=random.Random(505)
    root=B.empty('Fading_StudyShore');root['role']='permanent fractured block shore'
    root['water_level_blender_Z']=0.0
    root['surface']='chunky charcoal cuboidal rock; real deep fractures and submerged foundation'
    pieces=B.empty('Fading_StudyPaving',root)
    pieces['role']='separate substantial fractured charcoal mineral blocks';pieces['static']=True
    # Continuous CLOSED foundation is entirely underwater. Cracks reveal dark
    # mineral sides/bed, never empty space or a broad exposed beach shell.
    points=[]
    for row in range(65):
        y=-3.5+row/64*13
        points.append((B.sand_coastline(y)-.32,y))
    points.extend([(7.2,9.5),(7.2,-3.5)])
    # This outline is concave. A strip grid provides explicit valid triangles.
    verts=[];faces=[];nx,ny=9,65
    for layer,z in enumerate([-.92,-.30]):
        for row in range(ny):
            y=-3.5+row/(ny-1)*13;coast=B.sand_coastline(y)-.32
            for col in range(nx):verts.append((coast+col/(nx-1)*(7.2-coast),y,z))
    count=nx*ny
    for row in range(ny-1):
        for col in range(nx-1):
            a=row*nx+col
            faces.extend([(a,a+nx+1,a+1),(a,a+nx,a+nx+1),
                          (a+count,a+1+count,a+nx+1+count),(a+count,a+nx+1+count,a+nx+count)])
    boundary=list(range(nx))+[row*nx+nx-1 for row in range(1,ny)]+list(range(count-2,count-nx-1,-1))+[row*nx for row in range(ny-2,0,-1)]
    for a,b in zip(boundary,boundary[1:]+boundary[:1]):faces.append((a,b,b+count,a+count))
    foundation=B.mesh('StudyWetShore',verts,faces,root,m['shore_rock'],False);B.uv_planar(foundation,.5)
    foundation['surface']='closed submerged rock foundation; exposed blocks own contact support'

    # Four separate chunky quadrants retain the complete swept chair footprint.
    # The rear-right block extends beneath the unchanged book stack.
    pads=[(1.005,1.517,-2.115,-1.603),(1.523,2.035,-2.115,-1.603),
          (1.005,1.517,-1.597,-1.085),(1.523,2.280,-1.597,-1.060),
          (.815,1.525,-.475,.235)]
    index=0
    for rect in pads:
        xmin,xmax,ymin,ymax=rect;index+=1
        poly=outline((xmin+xmax)/2,(ymin+ymax)/2,xmax-xmin,ymax-ymin,0,rng,.055)
        obj=block(B,pieces,m['shore_rock'],f'StudyPavingSlab_{index:03}',poly,.145,-.64,True)
        obj['support_role']='chair/books' if index<5 else 'lamp'
    reservations=[(a-.009,b+.009,c-.009,d+.009) for a,b,c,d in pads]
    # Unaligned widths, irregular row lengths and oblique planes avoid a cube grid.
    candidates=[]
    for strip in range(9):
        y=-3.16+rng.uniform(-.10,.12)
        while y<5.6:
            width=rng.uniform(.32,.53)
            depth=width*rng.uniform(.48,.78)
            cy=y+depth/2
            coast=B.sand_coastline(cy)
            distance=-.69+strip*.41
            x=coast+distance+rng.uniform(-.045,.045)
            # Closely fitted inland floor dissolves progressively into the sea.
            seaward=max(0,min(1,(.75-distance)/1.40))
            top=rng.uniform(.10,.22)*(1-.58*seaward)-.008*seaward
            if math.hypot(x-1.52,cy+1.60)>1.25 and strip>3:top+=rng.uniform(0,.085)
            if math.hypot(x-1.52,cy+1.60)<.82:top=min(top,.112)
            if math.hypot(x-1.17,cy+.12)<.60:top=min(top,.12)
            if math.hypot(x-1.98,cy+1.35)<.54:top=min(top,.12)
            width*=1-.29*seaward
            poly=outline(x,cy,width,depth,rng.uniform(-.07-.20*seaward,.07+.20*seaward),rng,.07)
            # Missing-piece frequency and inter-piece water gaps grow seaward.
            if rng.random()>.64*seaward**1.5:
                candidates.append((poly,top,rng.uniform(-.72,-.48)))
            y+=depth+rng.uniform(.009+.10*seaward,.025+.19*seaward)
    # Quiet continuation inland and a few detached cuboidal shore stones.
    for x,y,w,d,top in [(-1.80,-2.55,.36,.29,.14),(-1.40,-2.72,.19,.17,.055),
                       (-.42,-.10,.38,.33,.17),(.72,-.71,.31,.28,.14)]:
        candidates.append((outline(x,y,w,d,rng.uniform(-.45,.45),rng,.06),top,-.53))
    for poly,top,bottom in candidates:
        polys=[poly]
        for rect in reservations:polys=[part for source in polys for part in subtract_rectangle(source,rect)]
        for poly in polys:
            if area(poly)<.050:continue
            index+=1
            # Damp lower edge stones retain the existing wet scan material.
            wet=top<.09 and index%3==0
            block(B,pieces,m['shore_wet_rock'] if wet else m['shore_rock'],f'StudyPavingSlab_{index:03}',poly,top,bottom)
    root['block_count']=index
    return root
