"""Audit the actual living-scene GLB and reimport it into an empty Blender scene.

blender --background --factory-startup --python-exit-code 1 --python \
  scripts/blender/living_scene_validate.py -- scene.glb report.json [manifest.json]

The optional manifest can supply camera.aspect_ratio, camera.yfov_radians,
camera.position_gltf, camera.target_gltf, camera.up_gltf and
landmarks / environment_landmarks: [{name, node, position_gltf?, uv?, tolerance?}].
Optional environment_roles: [node_name | {name, node | nodes}] supplies projected
actual mesh bounds. terrain_connections: [{name, anchor, terrain, tolerance_m}]
checks named anchor heights against actual evaluated terrain after reimport.
Projection uses
top-left normalized image coordinates. Expectations are checked only when
explicitly supplied. This certifies transport and geometry, not visual fidelity.
"""

import hashlib
import json
import math
import struct
import sys
import traceback
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view


ROLE_ROOTS = ("Fading_StudyLamp", "Fading_StudyChair", "Fading_StudyShore")
CUP = "Fading_StudyCup"
CAMERA = "Fading_StudyCamera"
SOCKET = "Fading_StudyLampLight"
OPTIONAL_ROOTS = ("Fading_StudyBackdrop", "Fading_StudyCurtain", "Fading_StudyBooks")
OPTIONAL_CHILD_ROLES = ("Fading_StudySky", "Fading_StudyPaving")
COMPONENTS = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2",
              5125: "<u4", 5126: "<f4"}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4,
          "MAT2": 4, "MAT3": 9, "MAT4": 16}


def values(value):
    return [float(x) for x in value]


def bounds(points):
    if not points:
        return None
    data = np.asarray(points, dtype=np.float64)
    low, high = data.min(axis=0), data.max(axis=0)
    return {"min": low.tolist(), "max": high.tolist(),
            "dimensions": (high - low).tolist(), "center": ((high + low) / 2).tolist()}


def image_dimensions(payload, mime):
    if payload.startswith(b"\x89PNG\r\n\x1a\n") and len(payload) >= 24:
        return list(struct.unpack_from(">II", payload, 16))
    if payload.startswith(b"\xff\xd8"):
        offset = 2
        while offset + 4 <= len(payload):
            if payload[offset] != 255:
                offset += 1
                continue
            while offset < len(payload) and payload[offset] == 255:
                offset += 1
            if offset >= len(payload):
                break
            marker = payload[offset]
            offset += 1
            if marker in (0xD8, 0xD9, 0x01) or 0xD0 <= marker <= 0xD7:
                continue
            if offset + 2 > len(payload):
                break
            length = struct.unpack_from(">H", payload, offset)[0]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                          0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                height, width = struct.unpack_from(">HH", payload, offset + 3)
                return [width, height]
            if length < 2:
                break
            offset += length
    if payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        kind = payload[12:16]
        if kind == b"VP8X" and len(payload) >= 30:
            return [1 + int.from_bytes(payload[24:27], "little"),
                    1 + int.from_bytes(payload[27:30], "little")]
        if kind == b"VP8L" and len(payload) >= 25 and payload[20] == 0x2F:
            packed = int.from_bytes(payload[21:25], "little")
            return [(packed & 0x3FFF) + 1, ((packed >> 14) & 0x3FFF) + 1]
        if kind == b"VP8 " and len(payload) >= 30 and payload[23:26] == b"\x9d\x01\x2a":
            width, height = struct.unpack_from("<HH", payload, 26)
            return [width & 0x3FFF, height & 0x3FFF]
    return None


class GLB:
    def __init__(self, path):
        self.raw = path.read_bytes()
        if len(self.raw) < 20:
            raise ValueError("GLB is too short")
        magic, version, length = struct.unpack_from("<III", self.raw)
        if magic != 0x46546C67 or version != 2 or length != len(self.raw):
            raise ValueError("GLB header magic/version/declared byte length is invalid")
        self.chunks, self.binary = [], None
        offset = 12
        while offset < length:
            size, kind = struct.unpack_from("<II", self.raw, offset)
            end = offset + 8 + size
            if size % 4 or end > length:
                raise ValueError("GLB chunk alignment or length is invalid")
            payload = self.raw[offset + 8:end]
            self.chunks.append({"type": kind, "bytes": size})
            if kind == 0x4E4F534A:
                if hasattr(self, "doc") or offset != 12:
                    raise ValueError("GLB must have exactly one first JSON chunk")
                self.doc = json.loads(payload.decode("utf-8").rstrip(" \x00"))
            elif kind == 0x004E4942:
                if self.binary is not None:
                    raise ValueError("GLB has multiple BIN chunks")
                self.binary = payload
            offset = end
        if not hasattr(self, "doc"):
            raise ValueError("GLB has no JSON chunk")
        self.binary = self.binary or b""
        for buffer in self.doc.get("buffers", []):
            if buffer.get("uri"):
                raise ValueError("External or data-URI buffers are not portable embedded GLB buffers")
            if buffer["byteLength"] > len(self.binary):
                raise ValueError("Declared buffer exceeds BIN chunk")

    def view(self, index):
        view = self.doc["bufferViews"][index]
        if view.get("buffer", 0) != 0:
            raise ValueError("Only the embedded GLB buffer is supported")
        start = view.get("byteOffset", 0)
        end = start + view["byteLength"]
        if start < 0 or end > len(self.binary):
            raise ValueError("Buffer view exceeds BIN chunk")
        return view, self.binary[start:end]

    def accessor(self, index):
        accessor = self.doc["accessors"][index]
        dtype = np.dtype(COMPONENTS[accessor["componentType"]])
        width, count = WIDTHS[accessor["type"]], accessor["count"]
        data = np.zeros((count, width), dtype=dtype)
        if "bufferView" in accessor:
            view, payload = self.view(accessor["bufferView"])
            offset = accessor.get("byteOffset", 0)
            stride = view.get("byteStride", dtype.itemsize * width)
            if stride < dtype.itemsize * width:
                raise ValueError("Invalid accessor byte stride")
            data = np.ndarray((count, width), dtype=dtype, buffer=payload,
                              offset=offset, strides=(stride, dtype.itemsize)).copy()
        sparse = accessor.get("sparse")
        if sparse:
            indices, payload = self.view(sparse["indices"]["bufferView"])
            sparse_indices = np.frombuffer(payload, dtype=COMPONENTS[sparse["indices"]["componentType"]],
                                          count=sparse["count"], offset=sparse["indices"].get("byteOffset", 0))
            _, payload = self.view(sparse["values"]["bufferView"])
            sparse_values = np.frombuffer(payload, dtype=dtype, count=sparse["count"] * width,
                                         offset=sparse["values"].get("byteOffset", 0)).reshape(-1, width)
            data[sparse_indices] = sparse_values
        if accessor.get("normalized") and dtype.kind in "iu":
            limits = np.iinfo(dtype)
            data = data.astype(np.float64) / limits.max
            if dtype.kind == "i":
                data = np.maximum(data, -1)
        return data


def node_matrix(node):
    if "matrix" in node:
        return Matrix(np.asarray(node["matrix"]).reshape(4, 4).T.tolist())
    translation = Matrix.Translation(Vector(node.get("translation", [0, 0, 0])))
    rotation = node.get("rotation", [0, 0, 0, 1])
    quaternion = Quaternion((rotation[3], rotation[0], rotation[1], rotation[2]))
    return translation @ quaternion.to_matrix().to_4x4() @ Matrix.Diagonal((*node.get("scale", [1, 1, 1]), 1))


def triangles(indices, mode):
    if mode == 4:
        if len(indices) % 3:
            raise ValueError("Triangle index count is not divisible by three")
        return indices.reshape(-1, 3)
    if mode == 5:
        return np.asarray([(indices[i + (i % 2)], indices[i + (1 - i % 2)], indices[i + 2])
                           for i in range(len(indices) - 2)], dtype=np.int64).reshape(-1, 3)
    if mode == 6:
        return np.asarray([(indices[0], indices[i], indices[i + 1])
                           for i in range(1, len(indices) - 1)], dtype=np.int64).reshape(-1, 3)
    return np.empty((0, 3), dtype=np.int64)


def mesh_topology(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
    bm.normal_update()
    boundary = sum(edge.is_boundary for edge in bm.edges)
    nonmanifold = sum(not edge.is_manifold for edge in bm.edges)
    inconsistent = sum(edge.is_manifold and not edge.is_contiguous for edge in bm.edges)
    remaining, components = set(bm.faces), []
    while remaining:
        seed = remaining.pop()
        faces, pending = {seed}, [seed]
        while pending:
            for edge in pending.pop().edges:
                for neighbor in edge.link_faces:
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        faces.add(neighbor)
                        pending.append(neighbor)
        edges = {edge for face in faces for edge in face.edges}
        closed = all(len(edge.link_faces) == 2 for edge in edges)
        winding = sum(edge.is_manifold and not edge.is_contiguous for edge in edges)
        volume = 0.0
        for face in faces:
            verts = [vert.co for vert in face.verts]
            for i in range(1, len(verts) - 1):
                volume += verts[0].dot(verts[i].cross(verts[i + 1])) / 6
        components.append({"faces": len(faces), "closed": closed,
                           "inconsistent_winding_edges": winding, "signed_volume_m3": volume,
                           "inward_closed_body": closed and volume < -1e-12})
    result = {"name": obj.name, "triangles": len(mesh.loop_triangles),
              "boundary_edges_after_weld": boundary, "nonmanifold_edges_after_weld": nonmanifold,
              "inconsistent_winding_edges": inconsistent,
              "open_surface": boundary > 0, "components": components,
              "bounds_blender_Z_up": bounds([values(obj.matrix_world @ vert.co) for vert in mesh.vertices])}
    bm.free()
    return result


def _evaluated_parts(root):
    """Copy evaluated world-space triangles with material and source identifiers."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    parts = []
    for obj in [root, *root.children_recursive]:
        if obj.type not in {"MESH", "CURVE", "SURFACE", "FONT"}:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
            groups = {}
            for tri in mesh.loop_triangles:
                material = mesh.materials[tri.material_index] if tri.material_index < len(mesh.materials) else None
                material_name = material.name if material else ""
                token = (material_name + " " + obj.name).lower()
                category = "cloth" if "cloth" in token or "fringe" in token else "wood" if "wood" in material_name.lower() else "other"
                group = groups.setdefault((category, material_name), {"object": obj.name, "material": material_name,
                                          "category": category, "vertices": vertices, "triangles": [], "triangle_ids": []})
                group["triangles"].append(tuple(tri.vertices))
                group["triangle_ids"].append(tri.index)
            for group in groups.values():
                group["bvh"] = BVHTree.FromPolygons(vertices, group["triangles"], all_triangles=True, epsilon=0)
                parts.append(group)
        finally:
            evaluated.to_mesh_clear()
    return parts


def _combined_bvh(parts):
    vertices, triangles, owners = [], [], []
    for part in parts:
        offset = len(vertices)
        vertices.extend(part["vertices"])
        triangles.extend(tuple(index + offset for index in triangle) for triangle in part["triangles"])
        owners.extend((part["object"], triangle_id) for triangle_id in part["triangle_ids"])
    return BVHTree.FromPolygons(vertices, triangles, all_triangles=True, epsilon=0) if triangles else None, owners


def _edge_triangle_crossing(start, end, triangle, epsilon=1e-7):
    """Strict plane crossing, then actual triangle inclusion; tangency is allowed."""
    a, b, c = triangle
    normal = (b - a).cross(c - a)
    if normal.length < 1e-14:
        return None
    normal.normalize()
    d0, d1 = (start - a).dot(normal), (end - a).dot(normal)
    if not ((d0 < -epsilon and d1 > epsilon) or (d1 < -epsilon and d0 > epsilon)):
        return None
    point = start + (end - start) * (d0 / (d0 - d1))
    e0, e1, relative = b - a, c - a, point - a
    d00, d01, d11 = e0.dot(e0), e0.dot(e1), e1.dot(e1)
    denominator = d00 * d11 - d01 * d01
    if abs(denominator) < 1e-22:
        return None
    u = (d11 * relative.dot(e0) - d01 * relative.dot(e1)) / denominator
    v = (d00 * relative.dot(e1) - d01 * relative.dot(e0)) / denominator
    return point if u >= -1e-7 and v >= -1e-7 and u + v <= 1 + 1e-7 else None


def _closed_components(part):
    """Weld seams for topology only, and build a BVH for every closed wood shell."""
    vertices, lookup, indices = [], {}, {}
    for original in {i for tri in part["triangles"] for i in tri}:
        point = part["vertices"][original]
        key = tuple(round(value / 1e-7) for value in point)
        if key not in lookup:
            lookup[key] = len(vertices)
            vertices.append(point)
        indices[original] = lookup[key]
    triangles = [tuple(indices[index] for index in tri) for tri in part["triangles"]]
    edge_faces = {}
    for index, tri in enumerate(triangles):
        for i in range(3):
            edge_faces.setdefault(tuple(sorted((tri[i], tri[(i + 1) % 3]))), []).append(index)
    adjacency = [set() for _ in triangles]
    for faces in edge_faces.values():
        for face in faces:
            adjacency[face].update(faces)
    pending_faces, components, open_count = set(range(len(triangles))), [], 0
    while pending_faces:
        seed = pending_faces.pop()
        component, pending = {seed}, [seed]
        while pending:
            for neighbor in adjacency[pending.pop()]:
                if neighbor in pending_faces:
                    pending_faces.remove(neighbor)
                    component.add(neighbor)
                    pending.append(neighbor)
        edges = {tuple(sorted((triangles[index][i], triangles[index][(i + 1) % 3]))) for index in component for i in range(3)}
        if not all(len(edge_faces[edge]) == 2 for edge in edges):
            open_count += 1
            continue
        selected = [triangles[index] for index in sorted(component)]
        components.append({"object": part["object"], "component": len(components),
                           "bvh": BVHTree.FromPolygons(vertices, selected, all_triangles=True, epsilon=0)})
    return components, open_count


def _inside_ray_parity(tree, point):
    votes = []
    for direction in (Vector((1, .173, .317)), Vector((.231, 1, .413)), Vector((.193, .379, 1))):
        direction.normalize()
        origin, count = point.copy(), 0
        for _ in range(256):
            hit, _, _, _ = tree.ray_cast(origin, direction, 1000)
            if hit is None:
                break
            count += 1
            origin = hit + direction * 1e-6
        else:
            raise RuntimeError("Wood inside-test exceeded ray-intersection safety limit")
        votes.append(bool(count % 2))
    return sum(votes) >= 2


def _part_samples(part):
    """Actual triangle vertices, edge midpoints and face centroids, deduplicated."""
    samples = {}
    for tri_index, indices in enumerate(part["triangles"]):
        a, b, c = (part["vertices"][index] for index in indices)
        for point in (a, b, c, (a + b) / 2, (b + c) / 2, (c + a) / 2, (a + b + c) / 3):
            samples.setdefault(tuple(round(value / 1e-7) for value in point),
                               (point, part["triangle_ids"][tri_index]))
    return samples.values()


def _shore_support_parts(shore):
    """Visible exported support blocks; submerged foundation never masks a gap."""
    parts=_evaluated_parts(shore)
    visible=[part for part in parts if not bpy.data.objects[part['object']].hide_render and not bpy.data.objects[part['object']].hide_viewport]
    blocks=[part for part in visible if bpy.data.objects[part['object']].get('contact_surface',False)]
    return blocks if shore.get('block_count') else [part for part in visible if 'wetshore' in part['object'].lower()]


def audit_book_contacts(books,shore):
    """Bottom cover/spine underside samples against real visible support meshes."""
    bpy.context.view_layer.update()
    book=next(obj for obj in books.children if obj.name=='StudyBook_1')
    tree,owners=_combined_bvh(_shore_support_parts(shore))
    inverse=book.matrix_world.inverted();samples={}
    for part in _evaluated_parts(book):
        for tri_index,indices in enumerate(part['triangles']):
            points=[part['vertices'][i] for i in indices]
            normal=(points[1]-points[0]).cross(points[2]-points[0])
            if normal.length<1e-12 or normal.normalized().z>-.95:continue
            if not all((inverse@p).z<.002 for p in points):continue
            for point in [*points,sum(points,Vector())/3]:
                samples.setdefault(tuple(round(x,7) for x in point),(point,part['object'],part['triangle_ids'][tri_index]))
    records=[]
    for point,obj,triangle in samples.values():
        hit,_,i,_=tree.ray_cast(point+Vector((0,0,10)),Vector((0,0,-1)),20) if tree else (None,None,None,None)
        gap=point.z-hit.z if hit is not None else None
        records.append({'position_world':values(point),'book_object':obj,'book_triangle':triangle,
                        'support_hit_world':values(hit) if hit is not None else None,
                        'support_object':owners[i][0] if hit is not None else None,'support_triangle':owners[i][1] if hit is not None else None,
                        'gap_m':gap,'passed':gap is not None and -.002<=gap<=.003})
    gaps=[record['gap_m'] for record in records if record['gap_m'] is not None]
    return {'valid':bool(records) and all(record['passed'] for record in records),'samples':len(records),
            'min_gap_m':min(gaps,default=None),'max_gap_m':max(gaps,default=None),
            'method':'Actual evaluated bottom cover/spine vertices and triangle centroids raycast against visible exported rock support meshes, -2mm..+3mm tolerance',
            'records':records,'offenders':[record for record in records if not record['passed']]}


def _audit_contacts(chair, shore, lamp):
    """Shared source/reimport contact audit. No geometry or transform is changed."""
    bpy.context.view_layer.update()
    chair_parts, shore_parts, lamp_parts = (_evaluated_parts(root) for root in (chair, shore, lamp))
    wood = [part for part in chair_parts if part["category"] == "wood"]
    cloth = [part for part in chair_parts if part["category"] == "cloth"]
    # Pass05 contacts use actual visible blocks, excluding the submerged shell.
    sand = _shore_support_parts(shore)
    # Original identifiers are preserved in source; after joining/export, use
    # actual chair-local seat-band triangles, not a seat AABB as the surface.
    chair_inverse = chair.matrix_world.inverted()
    seat_parts = []
    for part in wood:
        selected = [i for i, tri in enumerate(part["triangles"])
                    if all(.52 <= (chair_inverse @ part["vertices"][index]).z <= .62 for index in tri)]
        if selected:
            seat_parts.append({**part, "triangles": [part["triangles"][i] for i in selected],
                               "triangle_ids": [part["triangle_ids"][i] for i in selected]})
    wood_tree, wood_owners = _combined_bvh(wood)
    seat_tree, seat_owners = _combined_bvh(seat_parts)
    sand_tree, sand_owners = _combined_bvh(sand)
    checks = {"evaluated_wood_present": bool(wood), "evaluated_cloth_present": bool(cloth),
              "actual_seat_surface_present": seat_tree is not None, "actual_sand_surface_present": sand_tree is not None}
    report = {"schema_version": 1, "coordinate_system": "Blender world Z up, metres",
              "evaluated_geometry": True, "checks": checks, "failed_checks": [], "valid": False,
              "tolerances_m": {"crossing_plane_epsilon": 1e-7, "inside_penetration": .0005,
                               "front_seat_clearance": .01, "rear_wood_clearance": .002,
                               "sand_gap_min": -.002, "sand_gap_max": .003},
              "classification_chair_local": {"front": "y < .2175 and z < 1.05",
                                               "rear": "y > .2825 and z < .92", "wrap": "excluded from clearance only"},
              "parts": [{"object": part["object"], "material": part["material"], "category": part["category"],
                         "evaluated_triangles": len(part["triangles"])} for part in chair_parts]}
    crossings, crossing_count, candidates = [], 0, 0
    for fabric in cloth:
        for solid in wood:
            overlaps = fabric["bvh"].overlap(solid["bvh"])
            candidates += len(overlaps)
            for cloth_index, wood_index in overlaps:
                first = [fabric["vertices"][i] for i in fabric["triangles"][cloth_index]]
                second = [solid["vertices"][i] for i in solid["triangles"][wood_index]]
                points = []
                for edge_triangle, target in ((first, second), (second, first)):
                    for i in range(3):
                        point = _edge_triangle_crossing(edge_triangle[i], edge_triangle[(i + 1) % 3], target)
                        if point is not None:
                            points.append(values(point))
                if points:
                    crossing_count += 1
                    if len(crossings) < 80:
                        crossings.append({"cloth_object": fabric["object"], "cloth_triangle": fabric["triangle_ids"][cloth_index],
                                          "wood_object": solid["object"], "wood_triangle": solid["triangle_ids"][wood_index],
                                          "positions_world": points})
    report["triangle_crossings"] = {"bvh_candidate_pairs": candidates, "confirmed_triangle_pairs": crossing_count,
                                    "offenders": crossings, "offender_records_truncated": crossing_count > len(crossings)}
    checks["zero_cloth_wood_triangle_crossings"] = crossing_count == 0
    components, open_wood_components = [], 0
    for part in wood:
        closed, open_count = _closed_components(part)
        components.extend(closed)
        open_wood_components += open_count
    checks["all_wood_components_closed_for_inside_test"] = bool(components) and open_wood_components == 0
    inside_count, inside = 0, []
    for fabric in cloth:
        for vertex_index in sorted({index for tri in fabric["triangles"] for index in tri}):
            point = fabric["vertices"][vertex_index]
            for component in components:
                nearest, normal, _, distance = component["bvh"].find_nearest(point)
                if nearest is None or distance <= .0005:
                    continue
                signed = (point - nearest).dot(normal)
                if signed < -.0005 and _inside_ray_parity(component["bvh"], point):
                    inside_count += 1
                    if len(inside) < 80:
                        inside.append({"cloth_object": fabric["object"], "evaluated_vertex": vertex_index,
                                       "wood_object": component["object"], "wood_component": component["component"],
                                       "position_world": values(point), "penetration_m": distance,
                                       "nearest_normal_signed_m": signed})
                    break
    report["cloth_vertices_inside_wood"] = {"count": inside_count, "closed_wood_components": len(components),
                                             "open_wood_components": open_wood_components, "offenders": inside,
                                             "offender_records_truncated": inside_count > len(inside)}
    checks["zero_cloth_vertices_inside_wood_beyond_half_mm"] = inside_count == 0
    distances = {name: {"minimum_m": None, "samples": 0, "offending_samples": 0, "offenders": []}
                 for name in ("all_cloth_to_wood", "front_to_seat", "rear_to_wood")}
    for fabric in cloth:
        for point, triangle_id in _part_samples(fabric):
            local = chair_inverse @ point
            front = local.y < .2175 and local.z < 1.05
            rear = local.y > .2825 and local.z < .92
            for name, tree, owners, required in (("all_cloth_to_wood", wood_tree, wood_owners, None),
                                                 ("front_to_seat", seat_tree if front else None, seat_owners, .01),
                                                 ("rear_to_wood", wood_tree if rear else None, wood_owners, .002)):
                if tree is None:
                    continue
                nearest, _, index, distance = tree.find_nearest(point)
                if nearest is None:
                    continue
                item = distances[name]
                item["samples"] += 1
                record = {"cloth_object": fabric["object"], "cloth_triangle": triangle_id,
                          "position_world": values(point), "position_chair_local": values(local),
                          "surface_object": owners[index][0], "surface_triangle": owners[index][1],
                          "nearest_surface_world": values(nearest), "distance_m": distance}
                if item["minimum_m"] is None or distance < item["minimum_m"]:
                    item["minimum_m"], item["minimum_location"] = distance, record
                if required is not None and distance < required - 1e-7:
                    item["offending_samples"] += 1
                    if len(item["offenders"]) < 80:
                        item["offenders"].append(record)
    report["surface_distances"] = distances
    report["surface_distance_sampling"] = "Evaluated triangle vertices, all edge midpoints, and all face centroids against actual surface BVHs. Crossings additionally tested for every overlapping triangle pair."
    for name, threshold in (("front_to_seat", .01), ("rear_to_wood", .002)):
        checks[name + "_clearance"] = distances[name]["samples"] > 0 and distances[name]["offending_samples"] == 0

    def footprint(parts, root, angle):
        inverse = root.matrix_world.inverted()
        rotation = Matrix.Translation(root.matrix_world.translation) @ Matrix.Rotation(math.radians(angle), 4, "Z") @ Matrix.Translation(-root.matrix_world.translation)
        sampled, failures, records, sample_count, min_gap, max_gap = {}, [], [], 0, None, None
        for part in parts:
            for tri_index, indices in enumerate(part["triangles"]):
                points = [part["vertices"][index] for index in indices]
                local = [inverse @ point for point in points]
                # True underside faces on the ground-contact geometry. Higher
                # curved bevel faces are not expected to touch a planar support.
                if not all(point.z < .012 for point in local):
                    continue
                normal = (points[1] - points[0]).cross(points[2] - points[0])
                if normal.length < 1e-14 or normal.normalized().z >= -.95:
                    continue
                for source in [*points, sum(points, Vector()) / 3]:
                    point = rotation @ source
                    key = (part["object"], *(round(value / 1e-7) for value in point))
                    sampled.setdefault(key, (part["object"], part["triangle_ids"][tri_index], point))
        for object_name, triangle_id, point in sampled.values():
            hit, _, sand_index, _ = sand_tree.ray_cast(point + Vector((0, 0, 10)), Vector((0, 0, -1)), 20) if sand_tree else (None, None, None, None)
            gap = point.z - hit.z if hit is not None else None
            sample_count += 1
            if gap is not None:
                min_gap = gap if min_gap is None else min(min_gap, gap)
                max_gap = gap if max_gap is None else max(max_gap, gap)
            record = {"object": object_name, "evaluated_triangle": triangle_id, "position_world": values(point),
                      "sand_hit_world": values(hit) if hit is not None else None, "gap_m": gap,
                      "sand_object": sand_owners[sand_index][0] if hit is not None else None,
                      "sand_triangle": sand_owners[sand_index][1] if hit is not None else None}
            records.append(record)
            if gap is None or gap < -.002 - 1e-7 or gap > .003 + 1e-7:
                failures.append(record)
        return {"additional_rotation_degrees": angle, "samples": sample_count, "min_gap_m": min_gap, "max_gap_m": max_gap,
                "offending_samples": len(failures), "offenders": failures[:80], "offender_records_truncated": len(failures) > 80, "support_records": records,
                "sampling": "Actual downward underside triangle vertices and face centroids, excluding higher curved bevel faces."}

    report["turn_degrees"] = -20
    report["footprints"] = {"chair": footprint(wood, chair, 0), "chair_minus_20_degrees": footprint(wood, chair, -20),
                             "chair_plus_20_degrees": footprint(wood, chair, 20),
                             "lamp": footprint(lamp_parts, lamp, 0)}
    for angle in range(-2,-20,-2):
        report['footprints'][f'chair_minus_{-angle}_degrees']=footprint(wood,chair,angle)
    report['support_surfaces']=[part['object'] for part in sand]
    report['support_method']='Actual exported visible rock support meshes; hidden objects and submerged foundation excluded for block shore'
    report['chair_turn_sweep_degrees']=list(range(0,-21,-2))
    for name, item in report["footprints"].items():
        checks[name + "_supported_by_actual_sand"] = item["samples"] > 0 and item["offending_samples"] == 0
    report["failed_checks"] = [name for name, passed in checks.items() if not passed]
    report["valid"] = not report["failed_checks"]
    report["passed"] = report["valid"]
    return report


def audit_blender_contacts(chair, shore, lamp, output_path):
    """Write evaluated contact proof before consolidation; raise on failed checks.

    Roots are bpy objects. Call after all modifiers/geometry are built, before
    join_role_materials. All coordinates and transforms remain unchanged.
    The returned dictionary includes detailed offenders and measured distances.
    """
    output = Path(output_path).resolve()
    try:
        report = _audit_contacts(chair, shore, lamp)
    except Exception as error:
        report = {"schema_version": 1, "valid": False, "passed": False,
                  "checks": {"contact_audit_completed": False}, "failed_checks": ["contact_audit_completed"],
                  "error": {"type": type(error).__name__, "message": str(error), "traceback": traceback.format_exc()}}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    if not report["valid"]:
        raise RuntimeError("Living-scene contact audit failed: " + ", ".join(report["failed_checks"]) + "; report: " + str(output))
    return report


def audit_environment_connections(connections, objects=None):
    """Check explicit bridge/terrain anchor contacts in source or imported scene.

    Each specification supplies name, anchor, terrain and optional tolerance_m.
    Anchor is an object name; terrain is a mesh/root object name. A world-Z ray
    hits the actual evaluated terrain. This measures authored connection points,
    not overall bridge structural or visual acceptance.
    """
    objects = bpy.context.scene.objects if objects is None else objects
    bpy.context.view_layer.update()
    items, checks = [], {}
    for spec in connections:
        name = spec.get("name", spec.get("anchor", "unnamed_connection"))
        anchor, terrain = objects.get(spec.get("anchor", "")), objects.get(spec.get("terrain", ""))
        tolerance = float(spec.get("tolerance_m", .02))
        item = {"name": name, "anchor": spec.get("anchor"), "terrain": spec.get("terrain"), "tolerance_m": tolerance,
                "anchor_position_blender_Z_up": values(anchor.matrix_world.translation) if anchor else None,
                "terrain_hit_blender_Z_up": None, "vertical_gap_m": None, "passed": False}
        if anchor is not None and terrain is not None:
            tree, owners = _combined_bvh(_evaluated_parts(terrain))
            if tree is not None:
                point = anchor.matrix_world.translation
                hit, normal, index, _ = tree.ray_cast(point + Vector((0, 0, 100)), Vector((0, 0, -1)), 200)
                if hit is not None:
                    gap = point.z - hit.z
                    item.update({"terrain_hit_blender_Z_up": values(hit), "terrain_normal_blender_Z_up": values(normal),
                                 "terrain_object": owners[index][0], "terrain_triangle": owners[index][1],
                                 "vertical_gap_m": gap, "passed": abs(gap) <= tolerance + 1e-7})
        items.append(item)
        checks["connection_" + str(name)] = item["passed"]
    return {"checks": checks, "valid": all(checks.values()), "connections": items,
            "method": "Named anchor downward raycast against actual evaluated named terrain geometry."}


def validate(path, manifest, report):
    glb = GLB(path)
    doc = glb.doc
    checks, warnings = report["checks"], report["warnings"]
    report.update({"file": str(path), "bytes": len(glb.raw),
                   "sha256": hashlib.sha256(glb.raw).hexdigest(), "chunks": glb.chunks,
                   "asset": doc.get("asset"), "extensions_used": doc.get("extensionsUsed", [])})
    nodes = doc.get("nodes", [])
    scenes = doc.get("scenes", [])
    if not scenes:
        raise ValueError("GLB has no scene")
    scene_index = doc.get("scene", 0)
    roots = scenes[scene_index].get("nodes", [])
    parents, world, active = {}, {}, []
    for parent, node in enumerate(nodes):
        for child in node.get("children", []):
            if child in parents:
                raise ValueError("Node has more than one parent")
            parents[child] = parent

    def visit(index, matrix, ancestry):
        if index in ancestry or index in world:
            raise ValueError("Scene contains a cycle or repeatedly instantiated node")
        world[index] = matrix @ node_matrix(nodes[index])
        active.append(index)
        for child in nodes[index].get("children", []):
            visit(child, world[index], ancestry | {index})

    for root in roots:
        if root in parents:
            raise ValueError("Scene root also has a parent")
        visit(root, Matrix.Identity(4), set())
    named = {}
    for index in active:
        named.setdefault(nodes[index].get("name", ""), []).append(index)

    def named_index(name):
        indices = named.get(name, [])
        return indices[0] if len(indices) == 1 else None

    def descendants(index):
        result, pending = set(), [index]
        while pending:
            current = pending.pop()
            result.add(current)
            pending.extend(nodes[current].get("children", []))
        return result

    checks["gltf_version_2"] = doc.get("asset", {}).get("version") == "2.0"
    checks["required_role_names_unique"] = all(named_index(name) is not None for name in (*ROLE_ROOTS, CUP, CAMERA, SOCKET))
    checks["role_roots_preserved"] = all(named_index(name) in roots for name in ROLE_ROOTS)
    checks["optional_roots_preserved"] = all(named_index(name) in roots for name in OPTIONAL_ROOTS if name in named)
    sky, paving, books = (named_index(name) for name in ("Fading_StudySky", "Fading_StudyPaving", "Fading_StudyBooks"))
    semantic_books = [i for i in active if nodes[i].get("name", "").startswith("StudyBook_")
                      and nodes[i]["name"][len("StudyBook_"):].isdigit()]
    semantic_slabs = [i for i in active if nodes[i].get("name", "").startswith("StudyPavingSlab_")
                      and nodes[i]["name"][len("StudyPavingSlab_"):].isdigit()]
    checks["optional_role_names_unique"] = all(len(named.get(name, [])) == 1 for name in (*OPTIONAL_ROOTS, *OPTIONAL_CHILD_ROLES) if name in named)
    if "Fading_StudyBooks" in named or semantic_books:
        book_mesh_sets = [{nodes[i]["mesh"] for i in descendants(book) if "mesh" in nodes[i]} for book in semantic_books]
        checks["books_named_hierarchies_preserved"] = books is not None and bool(semantic_books) and all(book in descendants(books) and named_index(nodes[book]["name"]) == book for book in semantic_books)
        checks["books_have_separate_mesh_hierarchies"] = all(book_mesh_sets) and len(set().union(*book_mesh_sets)) == sum(len(meshes) for meshes in book_mesh_sets) if book_mesh_sets else False
    if "Fading_StudyPaving" in named or semantic_slabs:
        checks["paving_parent_is_shore"] = paving is not None and parents.get(paving) == named_index("Fading_StudyShore")
        checks["paving_semantic_slab_meshes_preserved"] = paving is not None and bool(semantic_slabs) and all(index in descendants(paving) and "mesh" in nodes[index] and named_index(nodes[index]["name"]) == index for index in semantic_slabs)
        checks["paving_slabs_use_distinct_meshes"] = all("mesh" in nodes[index] for index in semantic_slabs) and len({nodes[index].get("mesh") for index in semantic_slabs}) == len(semantic_slabs) and bool(semantic_slabs)
    if "Fading_StudySky" in named:
        backdrop = named_index("Fading_StudyBackdrop")
        checks["sky_root_or_backdrop_child"] = sky is not None and (sky in roots or parents.get(sky) == backdrop and backdrop is not None)
    report["optional_semantic_roles"] = {"books": [nodes[i]["name"] for i in semantic_books],
                                         "paving_slabs": [nodes[i]["name"] for i in semantic_slabs],
                                         "sky": nodes[sky].get("name") if sky is not None else None}
    chair, cup, lamp = named_index("Fading_StudyChair"), named_index(CUP), named_index("Fading_StudyLamp")
    checks["cup_direct_parent_is_chair"] = cup is not None and chair is not None and parents.get(cup) == chair
    checks["cup_has_independent_mesh_descendants"] = cup is not None and any("mesh" in nodes[i] for i in descendants(cup))
    if cup is not None and chair is not None:
        cup_mesh_ids = {nodes[i]["mesh"] for i in descendants(cup) if "mesh" in nodes[i]}
        chair_mesh_ids = {nodes[i]["mesh"] for i in descendants(chair) - descendants(cup) if "mesh" in nodes[i]}
        checks["cup_meshes_separate_from_chair"] = bool(cup_mesh_ids) and bool(chair_mesh_ids) and not cup_mesh_ids.intersection(chair_mesh_ids)
    else:
        checks["cup_meshes_separate_from_chair"] = False
    socket = named_index(SOCKET)
    checks["lamp_light_socket_has_no_mesh_camera_light"] = socket is not None and not any(key in nodes[socket] for key in ("mesh", "camera")) and not nodes[socket].get("extensions", {}).get("KHR_lights_punctual")
    checks["lamp_light_socket_under_lamp"] = lamp is not None and socket in descendants(lamp)
    checks["no_exported_lights"] = "KHR_lights_punctual" not in json.dumps(doc) and not doc.get("lights")
    checks["no_animations_or_skins"] = not doc.get("animations") and not doc.get("skins") and not any("skin" in node for node in nodes)
    forbidden = [{"node": node.get("name"), "mesh": doc["meshes"][node["mesh"]].get("name")}
                 for node in nodes if "mesh" in node and any(word in (node.get("name", "") + " " + doc["meshes"][node["mesh"]].get("name", "")).lower()
                                                               for word in ("water", "preview"))]
    checks["no_water_or_preview_meshes"] = not forbidden
    report["forbidden_meshes"] = forbidden
    report["scene"] = {"index": scene_index, "roots": [nodes[i].get("name", str(i)) for i in roots],
                       "active_nodes": len(active), "all_node_names": [node.get("name") for node in nodes]}
    report["transforms_gltf_Y_up"] = {name: {"parent": nodes[parents[index]].get("name") if index in parents else None,
                                                "local_matrix_rows": [values(row) for row in node_matrix(nodes[index])],
                                                "world_matrix_rows": [values(row) for row in world[index]],
                                                "world_position": values(world[index].translation)}
                                     for name in (*ROLE_ROOTS, CUP, CAMERA, SOCKET, *OPTIONAL_ROOTS, *OPTIONAL_CHILD_ROLES)
                                     if (index := named_index(name)) is not None}
    all_points, primitive_report, node_points = [], [], {}
    for index in active:
        node = nodes[index]
        if "mesh" not in node:
            continue
        mesh = doc["meshes"][node["mesh"]]
        for primitive_index, primitive in enumerate(mesh["primitives"]):
            xyz = glb.accessor(primitive["attributes"]["POSITION"])
            if xyz.shape[1] != 3 or not np.isfinite(xyz).all():
                raise ValueError("Invalid POSITION accessor")
            indices = glb.accessor(primitive["indices"]).ravel().astype(np.int64) if "indices" in primitive else np.arange(len(xyz))
            if len(indices) and (indices.min() < 0 or indices.max() >= len(xyz)):
                raise ValueError("Primitive index is out of range")
            mode = primitive.get("mode", 4)
            tri = triangles(indices, mode)
            cross = np.cross(xyz[tri[:, 1]] - xyz[tri[:, 0]], xyz[tri[:, 2]] - xyz[tri[:, 0]])
            area2 = np.linalg.norm(cross, axis=1)
            degenerate = int(np.count_nonzero(area2 <= 1e-12))
            normal_mismatches = None
            if "NORMAL" in primitive["attributes"]:
                normal = glb.accessor(primitive["attributes"]["NORMAL"])
                if normal.shape != xyz.shape or not np.isfinite(normal).all():
                    raise ValueError("Invalid NORMAL accessor")
                mean_normal = normal[tri].mean(axis=1)
                denominator = area2 * np.linalg.norm(mean_normal, axis=1)
                valid = denominator > 1e-12
                dot = np.zeros(len(tri))
                dot[valid] = np.einsum("ij,ij->i", cross[valid], mean_normal[valid]) / denominator[valid]
                normal_mismatches = int(np.count_nonzero(valid & (dot < -0.05)))
            points = [values(world[index] @ Vector(point)) for point in xyz]
            all_points.extend(points)
            node_points.setdefault(index, []).extend(points)
            primitive_report.append({"node": node.get("name"), "mesh_index": node["mesh"], "primitive_index": primitive_index,
                                     "mode": mode, "vertices": len(xyz), "triangles": len(tri), "material_index": primitive.get("material"),
                                     "degenerate_triangles": degenerate, "normal_winding_opposed_triangles": normal_mismatches,
                                     "bounds_gltf_Y_up": bounds(points)})
    checks["only_triangle_geometry"] = all(item["mode"] in (4, 5, 6) for item in primitive_report)
    checks["no_degenerate_triangles"] = not any(item["degenerate_triangles"] for item in primitive_report)
    checks["exported_normals_present"] = all(item["normal_winding_opposed_triangles"] is not None for item in primitive_report)
    checks["vertex_normals_agree_with_winding"] = not any(item["normal_winding_opposed_triangles"] for item in primitive_report)
    report["geometry"] = {"instantiated_triangles": sum(item["triangles"] for item in primitive_report),
                          "instantiated_primitives": len(primitive_report), "unique_meshes": len(doc.get("meshes", [])),
                          "mesh_nodes": sum("mesh" in nodes[i] for i in active), "primitives": primitive_report,
                          "bounds_gltf_Y_up": bounds(all_points)}
    checks["scene_contains_mesh_geometry"] = report["geometry"]["instantiated_triangles"] > 0
    report["materials"] = [{"index": i, "name": material.get("name"), **material} for i, material in enumerate(doc.get("materials", []))]
    images = []
    for index, image in enumerate(doc.get("images", [])):
        embedded = "bufferView" in image and "uri" not in image
        payload = glb.view(image["bufferView"])[1] if embedded else b""
        images.append({"index": index, "name": image.get("name"), "mime_type": image.get("mimeType"),
                       "embedded": embedded, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest() if embedded else None,
                       "dimensions": image_dimensions(payload, image.get("mimeType")) if embedded else None,
                       "uri": image.get("uri")})
    report["textures"] = {"texture_count": len(doc.get("textures", [])), "image_count": len(images),
                          "embedded_image_bytes": sum(item["bytes"] for item in images), "images": images,
                          "texture_definitions": doc.get("textures", []), "samplers": doc.get("samplers", [])}
    checks["all_images_embedded"] = all(item["embedded"] and item["bytes"] > 0 for item in images)
    checks["embedded_image_dimensions_readable"] = all(item["dimensions"] and min(item["dimensions"]) > 0 for item in images)
    if sky is not None:
        sky_nodes = descendants(sky)
        sky_primitives = [item for item in primitive_report if named_index(item["node"]) in sky_nodes]
        sky_material_indices = sorted({item["material_index"] for item in sky_primitives if item["material_index"] is not None})
        sky_materials = [doc["materials"][index] for index in sky_material_indices]
        checks["sky_mesh_geometry_present"] = bool(sky_primitives)
        checks["sky_uses_unlit_material"] = bool(sky_materials) and all("KHR_materials_unlit" in material.get("extensions", {}) for material in sky_materials) and all(item["material_index"] is not None for item in sky_primitives)
        checks["sky_uses_core_embedded_base_color_texture"] = bool(sky_materials)
        for material in sky_materials:
            texture_info = material.get("pbrMetallicRoughness", {}).get("baseColorTexture")
            texture = doc.get("textures", [])[texture_info["index"]] if texture_info is not None else {}
            source = texture.get("source")
            checks["sky_uses_core_embedded_base_color_texture"] &= source is not None and source < len(images) and images[source]["embedded"]
        sky_extras = nodes[sky].get("extras", {})
        def disabled_hint(false_keys, true_keys=()):
            return any(sky_extras.get(key) is False for key in false_keys) or any(sky_extras.get(key) is True for key in true_keys)
        checks["sky_has_fog_exemption_hint"] = disabled_hint(("fog", "applyFog", "receivesFog", "receive_fog", "apply_fog"), ("disableFog", "fogExempt"))
        checks["sky_has_cast_shadow_exemption_hint"] = disabled_hint(("castShadows", "castShadow", "cast_shadows"))
        checks["sky_has_receive_shadow_exemption_hint"] = disabled_hint(("receiveShadows", "receiveShadow", "receive_shadows"))
        report["sky_transport"] = {"material_indices": sky_material_indices, "extras": sky_extras,
                                     "note": "Unlit texture and explicit runtime exemptions; browser appearance still requires visual review."}
    camera_index = named_index(CAMERA)
    camera_node = nodes[camera_index] if camera_index is not None else {}
    camera = doc.get("cameras", [])[camera_node["camera"]] if "camera" in camera_node else {}
    perspective = camera.get("perspective", {})
    aspect = perspective.get("aspectRatio", 1.5)
    yfov = perspective.get("yfov", 0)
    checks["named_camera_is_perspective"] = camera.get("type") == "perspective"
    checks["camera_perspective_valid"] = 0 < yfov < math.pi and aspect > 0 and perspective.get("znear", 0) > 0 and ("zfar" not in perspective or perspective["zfar"] > perspective["znear"])
    checks["camera_reference_aspect_3_to_2"] = abs(aspect - 1.5) < 1e-5
    if "aspectRatio" not in perspective:
        warnings.append("Camera has no GLB aspectRatio; normalized projection assumes the approved 3:2 reference aspect.")
    if camera_index is not None:
        matrix = world[camera_index]
        report["camera"] = {"name": CAMERA, "definition": camera, "projection_aspect": aspect,
                            "position_gltf": values(matrix.translation),
                            "forward_gltf": values((matrix.to_3x3() @ Vector((0, 0, -1))).normalized()),
                            "up_gltf": values((matrix.to_3x3() @ Vector((0, 1, 0))).normalized()), "landmarks": []}
        inverse = matrix.inverted()

        def project(point):
            local = inverse @ Vector(point)
            depth = -local.z
            if not checks["camera_perspective_valid"] or abs(depth) < 1e-12:
                return {"uv": None, "depth": depth, "in_frame": False}
            half_height = math.tan(yfov / 2) * depth
            uv = [0.5 + local.x / (2 * half_height * aspect), 0.5 - local.y / (2 * half_height)]
            return {"uv": uv, "depth": depth, "in_frame": perspective.get("znear", 0) <= depth <= perspective.get("zfar", float("inf")) and all(0 <= value <= 1 for value in uv)}

        def normalized_specs(specs):
            if isinstance(specs, dict):
                return [{"name": name, **spec} if isinstance(spec, dict) else {"name": name, "node": spec} for name, spec in specs.items()]
            return [{"name": spec, "node": spec} if isinstance(spec, str) else spec for spec in specs]

        # These bounds use actual transported vertices, rather than projecting
        # the corners of world AABBs. They do not account for occlusion.
        role_specs = [{"name": name, "node": name} for name in (*ROLE_ROOTS, CUP, *OPTIONAL_ROOTS, *OPTIONAL_CHILD_ROLES) if name in named]
        for label, prefix in (("bridge", "StudyBridge"), ("books", "StudyBook_"), ("paving", "StudyPavingSlab_")):
            matching = [nodes[index].get("name") for index in active if nodes[index].get("name", "").startswith(prefix)]
            if matching:
                role_specs.append({"name": label, "nodes": matching})
        role_specs.extend(normalized_specs(manifest.get("environment_roles", [])))
        role_specs = list({spec.get("name", spec.get("node", "unnamed")): spec for spec in role_specs}.values())
        report["projected_environment_roles"] = []
        for spec in role_specs:
            role_names = spec.get("nodes", [spec.get("node", spec.get("name"))])
            selected = set()
            for name in role_names:
                index = named_index(name)
                if index is not None:
                    selected.update(descendants(index))
            points = [point for index in selected for point in node_points.get(index, [])]
            projections = [project(point) for point in points]
            positive = [item for item in projections if item["uv"] is not None and item["depth"] > 0]
            rectangle = {"min": [min(item["uv"][axis] for item in positive) for axis in range(2)],
                         "max": [max(item["uv"][axis] for item in positive) for axis in range(2)]} if positive else None
            intersects = bool(rectangle and rectangle["max"][0] >= 0 and rectangle["min"][0] <= 1 and rectangle["max"][1] >= 0 and rectangle["min"][1] <= 1)
            role = {"name": spec.get("name", spec.get("node")), "nodes": role_names,
                    "bounds_gltf_Y_up": bounds(points), "projected_uv_bounds": rectangle,
                    "depth_min_m": min((item["depth"] for item in projections), default=None),
                    "depth_max_m": max((item["depth"] for item in projections), default=None),
                    "vertices": len(points), "vertices_in_frame": sum(item["in_frame"] for item in projections),
                    "projected_bounds_intersect_frame": intersects,
                    "semantic_node_positions_gltf": {nodes[index].get("name"): values(world[index].translation) for index in selected if "mesh" not in nodes[index]},
                    "semantic_node_extras": {nodes[index].get("name"): nodes[index].get("extras", {}) for index in selected if "mesh" not in nodes[index]},
                    "static_depth_layer": spec.get("static_depth_layer"),
                    "transport_depth_layers": {nodes[index].get("name"): nodes[index].get("extras", {}).get("static_depth_layer", nodes[index].get("extras", {}).get("staticDepthLayer", nodes[index].get("extras", {}).get("depth_layer")))
                                               for index in selected if any(key in nodes[index].get("extras", {}) for key in ("static_depth_layer", "staticDepthLayer", "depth_layer"))},
                    "note": "Actual vertex projection, before occlusion; approximate composition evidence."}
            if "expected_uv_bounds" in spec:
                role["expected_uv_bounds"] = spec["expected_uv_bounds"]
            if spec.get("require_in_frame") is True:
                checks["environment_role_" + str(role["name"]) + "_in_frame"] = intersects and any(perspective.get("znear", 0) <= item["depth"] <= perspective.get("zfar", float("inf")) for item in projections)
            report["projected_environment_roles"].append(role)
        if sky is not None:
            sky_points = [point for index in descendants(sky) for point in node_points.get(index, [])]
            depths = [project(point)["depth"] for point in sky_points]
            far = min(200.0, perspective.get("zfar", 200.0))
            checks["sky_geometry_inside_200m_far_plane"] = bool(depths) and max(depths) < far and any(depth > perspective.get("znear", 0) for depth in depths)
            report["sky_transport"].update({"camera_depth_min_m": min(depths, default=None), "camera_depth_max_m": max(depths, default=None),
                                             "camera_far_limit_m": far, "max_camera_radial_distance_m": max(((Vector(point) - matrix.translation).length for point in sky_points), default=None)})

        landmarks = normalized_specs(manifest.get("landmarks", []))
        if not landmarks:
            landmarks = [{"name": name, "node": name} for name in (*ROLE_ROOTS, CUP, *OPTIONAL_ROOTS, *OPTIONAL_CHILD_ROLES) if name in named]
        landmarks.extend(normalized_specs(manifest.get("environment_landmarks", [])))
        landmarks.extend({"name": spec.get("name", spec.get("anchor")), "node": spec.get("anchor")}
                         for spec in manifest.get("terrain_connections", []) if spec.get("anchor")
                         and not any(item.get("node") == spec["anchor"] for item in landmarks))
        for landmark in landmarks:
            name, node_name = landmark.get("name", landmark.get("node")), landmark.get("node", landmark.get("name"))
            index = named_index(node_name)
            point = landmark.get("position_gltf")
            if point is None and index is not None:
                selected = [item["bounds_gltf_Y_up"] for item in primitive_report if named_index(item["node"]) in descendants(index)]
                role_bounds = bounds([corner for item in selected if item for corner in (item["min"], item["max"])])
                point = role_bounds["center"] if role_bounds else values(world[index].translation)
            item = {"name": name, "node": node_name, "position_gltf": point,
                    "static_depth_layer": landmark.get("static_depth_layer", nodes[index].get("extras", {}).get("static_depth_layer", nodes[index].get("extras", {}).get("staticDepthLayer")) if index is not None else None),
                    **(project(point) if point is not None else {"uv": None, "depth": None, "in_frame": False})}
            if "uv" in landmark:
                tolerance = landmark.get("tolerance", 0.05)
                error = max(abs(item["uv"][i] - landmark["uv"][i]) for i in range(2)) if item["uv"] else None
                item.update({"expected_uv": landmark["uv"], "tolerance": tolerance, "max_error": error})
                checks["landmark_" + str(name)] = error is not None and item["depth"] > 0 and error <= tolerance
            report["camera"]["landmarks"].append(item)
        expected_camera = manifest.get("camera", {})
        for key, actual in (("aspect_ratio", aspect), ("yfov_radians", yfov)):
            if key in expected_camera:
                checks["manifest_camera_" + key] = abs(actual - expected_camera[key]) < 1e-5
        for key, actual_key in (("position_gltf", "position_gltf"), ("up_gltf", "up_gltf")):
            if key in expected_camera:
                checks["manifest_camera_" + key] = max(abs(a - b) for a, b in zip(report["camera"][actual_key], expected_camera[key])) < 1e-4
        if "target_gltf" in expected_camera:
            expected_forward = (Vector(expected_camera["target_gltf"]) - matrix.translation).normalized()
            checks["manifest_camera_target_direction"] = expected_forward.dot(Vector(report["camera"]["forward_gltf"])) > 0.9999

    # The import is deliberately destructive only inside this fresh background process.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = bpy.context.scene.objects
    meshes = [obj for obj in imported if obj.type == "MESH"]
    topology = [mesh_topology(obj) for obj in meshes]
    imported_sky = imported.get("Fading_StudySky")
    sky_mesh_names = {obj.name for obj in [imported_sky, *imported_sky.children_recursive] if obj.type == "MESH"} if imported_sky is not None else set()
    for item in topology:
        if item["name"] in sky_mesh_names:
            item["topology_role_exemption"] = "Unlit environment sky surface may intentionally face inward."
    imported_camera = imported.get(CAMERA)
    checks["reimport_named_camera_is_CAMERA"] = imported_camera is not None and imported_camera.type == "CAMERA"
    checks["reimport_lamp_light_is_EMPTY"] = imported.get(SOCKET) is not None and imported.get(SOCKET).type == "EMPTY"
    checks["reimport_has_no_actual_lights"] = not any(obj.type == "LIGHT" for obj in imported)
    checks["reimport_required_roles_preserved"] = all(imported.get(name) is not None for name in (*ROLE_ROOTS, CUP))
    checks["reimport_cup_parent_is_chair"] = imported.get(CUP) is not None and imported.get(CUP).parent is not None and imported.get(CUP).parent.name == "Fading_StudyChair"
    checks["reimport_instantiated_triangle_count_matches"] = sum(item["triangles"] for item in topology) == report["geometry"]["instantiated_triangles"]
    checks["no_inward_closed_bodies"] = not any(component["inward_closed_body"] for item in topology if item["name"] not in sky_mesh_names for component in item["components"])
    checks["closed_bodies_have_consistent_winding"] = not any(component["closed"] and component["inconsistent_winding_edges"] for item in topology for component in item["components"])
    for item in topology:
        if item["open_surface"]:
            warnings.append(item["name"] + ": open surface; watertight-volume certification does not apply.")
    imported_points = [values(obj.matrix_world @ vert.co) for obj in meshes for vert in obj.data.vertices]
    report["reimport"] = {"blender": bpy.app.version_string, "objects": len(imported),
                          "mesh_objects": len(meshes), "triangles": sum(item["triangles"] for item in topology),
                          "bounds_blender_Z_up": bounds(imported_points), "meshes": topology,
                          "role_transforms_blender_Z_up": {name: {"type": imported[name].type,
                                                                 "parent": imported[name].parent.name if imported[name].parent else None,
                                                                 "world_position": values(imported[name].matrix_world.translation),
                                                                 "world_matrix_rows": [values(row) for row in imported[name].matrix_world]}
                                                            for name in (*ROLE_ROOTS, CUP, CAMERA, SOCKET) if name in imported}}
    # Blender reimport converts standard glTF +Y to Blender +Z. Compare actual bounds
    # and camera vectors, which detects accidental second axis conversion.
    converted = bounds([[point[0], -point[2], point[1]] for point in all_points])
    imported_bounds = report["reimport"]["bounds_blender_Z_up"]
    checks["Y_up_reimport_bounds_match"] = converted is not None and imported_bounds is not None and all(abs(converted[key][i] - imported_bounds[key][i]) < 1e-4 for key in ("min", "max") for i in range(3))
    chair_obj = imported.get("Fading_StudyChair")
    shore_obj = imported.get("Fading_StudyShore")
    lamp_obj = imported.get("Fading_StudyLamp")
    if chair_obj is not None and shore_obj is not None and lamp_obj is not None:
        report["reimport_contacts"] = _audit_contacts(chair_obj, shore_obj, lamp_obj)
        for name, passed in report["reimport_contacts"]["checks"].items():
            checks["reimport_contact_" + name] = passed
    if books is not None:
        imported_books = imported.get("Fading_StudyBooks")
        checks["reimport_books_semantic_hierarchies_preserved"] = imported_books is not None and all(imported.get(nodes[i]["name"]) is not None for i in semantic_books)
        if imported_books is not None and shore_obj is not None:
            report['reimport_book_contacts']=audit_book_contacts(imported_books,shore_obj)
            checks['reimport_books_supported_by_actual_visible_shore']=report['reimport_book_contacts']['valid']
    if paving is not None:
        imported_paving = imported.get("Fading_StudyPaving")
        checks["reimport_paving_slab_meshes_distinct"] = imported_paving is not None and imported_paving.parent is not None and imported_paving.parent.name == "Fading_StudyShore" and all(imported.get(nodes[i]["name"]) is not None and imported[nodes[i]["name"]].type == "MESH" for i in semantic_slabs) and len({imported[nodes[i]["name"]].data.as_pointer() for i in semantic_slabs if imported.get(nodes[i]["name"]) is not None and imported[nodes[i]["name"]].type == "MESH"}) == len(semantic_slabs)
    if manifest.get("terrain_connections"):
        report["terrain_connections"] = audit_environment_connections(manifest["terrain_connections"], imported)
        for name, passed in report["terrain_connections"]["checks"].items():
            checks["reimport_terrain_" + name] = passed
    if chair_obj is not None:
        chair_objects = [chair_obj, *chair_obj.children_recursive]
        cup_obj = imported.get(CUP)
        cup_objects = {cup_obj, *cup_obj.children_recursive} if cup_obj is not None else set()
        chair_points = [values(obj.matrix_world @ vert.co) for obj in chair_objects if obj.type == "MESH" and obj not in cup_objects for vert in obj.data.vertices]
        chair_bounds = bounds(chair_points)
        pivot = values(chair_obj.matrix_world.translation)
        offset = pivot[2] - chair_bounds["min"][2] if chair_bounds else None
        report["chair_ground_pivot"] = {"position_blender_Z_up": pivot, "chair_bounds_blender_Z_up": chair_bounds,
                                        "pivot_height_above_chair_min_m": offset}
        checks["chair_pivot_at_contact_height"] = offset is not None and abs(offset) <= 0.02
    if checks["reimport_named_camera_is_CAMERA"] and "camera" in report:
        forward = imported_camera.matrix_world.to_3x3() @ Vector((0, 0, -1))
        expected = report["camera"]["forward_gltf"]
        expected = Vector((expected[0], -expected[2], expected[1]))
        checks["Y_up_camera_direction_matches"] = forward.normalized().dot(expected.normalized()) > 0.99999
        bpy.context.scene.camera = imported_camera
        bpy.context.scene.render.resolution_x = round(1000 * aspect)
        bpy.context.scene.render.resolution_y = 1000
        bpy.context.scene.render.pixel_aspect_x = 1
        bpy.context.scene.render.pixel_aspect_y = 1
        for landmark in report["camera"]["landmarks"]:
            if landmark["position_gltf"] is None:
                continue
            point = landmark["position_gltf"]
            projected = world_to_camera_view(bpy.context.scene, imported_camera, Vector((point[0], -point[2], point[1])))
            landmark["reimport_uv"] = [projected.x, 1 - projected.y]
        errors = [max(abs(item["uv"][i] - item["reimport_uv"][i]) for i in range(2)) for item in report["camera"]["landmarks"] if item.get("uv") and item.get("reimport_uv")]
        report["camera"]["reimport_projection_max_error"] = max(errors, default=0)
        checks["camera_reimport_projection_matches"] = max(errors, default=0) < 0.002


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) not in (2, 3):
        raise SystemExit("Usage: -- /absolute/scene.glb /absolute/report.json [/absolute/manifest.json]")
    path, output = (Path(arg).resolve() for arg in args[:2])
    if path == output:
        raise SystemExit("Report destination must differ from input GLB")
    report = {"schema_version": 1, "valid": False, "checks": {}, "failed_checks": [], "warnings": []}
    try:
        manifest = json.loads(Path(args[2]).read_text(encoding="utf-8-sig")) if len(args) == 3 else {}
        validate(path, manifest, report)
    except Exception as error:
        report["checks"]["validation_completed"] = False
        report["error"] = {"type": type(error).__name__, "message": str(error), "traceback": traceback.format_exc()}
    else:
        report["checks"]["validation_completed"] = True
    report["failed_checks"] = [name for name, passed in report["checks"].items() if not passed]
    report["valid"] = not report["failed_checks"]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"valid": report["valid"], "report": str(output), "bytes": report.get("bytes"),
                      "triangles": report.get("geometry", {}).get("instantiated_triangles"),
                      "primitives": report.get("geometry", {}).get("instantiated_primitives"),
                      "textures": report.get("textures", {}).get("texture_count"),
                      "failed_checks": report["failed_checks"], "warning_count": len(report["warnings"])}))
    if not report["valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
