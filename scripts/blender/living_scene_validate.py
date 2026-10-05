"""Audit the actual living-scene GLB and reimport it into an empty Blender scene.

blender --background --factory-startup --python-exit-code 1 --python \
  scripts/blender/living_scene_validate.py -- scene.glb report.json [manifest.json]

The optional manifest can supply camera.aspect_ratio, camera.yfov_radians,
camera.position_gltf, camera.target_gltf, camera.up_gltf and
landmarks: [{name, node, position_gltf?, uv?, tolerance?}]. Projection uses
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
from bpy_extras.object_utils import world_to_camera_view


ROLE_ROOTS = ("Fading_StudyLamp", "Fading_StudyChair", "Fading_StudyShore")
CUP = "Fading_StudyCup"
CAMERA = "Fading_StudyCamera"
SOCKET = "Fading_StudyLampLight"
OPTIONAL_ROOTS = ("Fading_StudyBackdrop", "Fading_StudyCurtain")
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
                                     for name in (*ROLE_ROOTS, CUP, CAMERA, SOCKET, *OPTIONAL_ROOTS)
                                     if (index := named_index(name)) is not None}
    all_points, primitive_report = [], []
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
            return {"uv": uv, "depth": depth, "in_frame": depth > 0 and all(0 <= value <= 1 for value in uv)}

        landmarks = manifest.get("landmarks", [])
        if isinstance(landmarks, dict):
            landmarks = [{"name": name, **spec} for name, spec in landmarks.items()]
        if not landmarks:
            landmarks = [{"name": name, "node": name} for name in (*ROLE_ROOTS, CUP, *OPTIONAL_ROOTS) if name in named]
        for landmark in landmarks:
            name, node_name = landmark.get("name", landmark.get("node")), landmark.get("node", landmark.get("name"))
            index = named_index(node_name)
            point = landmark.get("position_gltf")
            if point is None and index is not None:
                selected = [item["bounds_gltf_Y_up"] for item in primitive_report if named_index(item["node"]) in descendants(index)]
                role_bounds = bounds([corner for item in selected if item for corner in (item["min"], item["max"])])
                point = role_bounds["center"] if role_bounds else values(world[index].translation)
            item = {"name": name, "node": node_name, "position_gltf": point,
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
    imported_camera = imported.get(CAMERA)
    checks["reimport_named_camera_is_CAMERA"] = imported_camera is not None and imported_camera.type == "CAMERA"
    checks["reimport_lamp_light_is_EMPTY"] = imported.get(SOCKET) is not None and imported.get(SOCKET).type == "EMPTY"
    checks["reimport_has_no_actual_lights"] = not any(obj.type == "LIGHT" for obj in imported)
    checks["reimport_required_roles_preserved"] = all(imported.get(name) is not None for name in (*ROLE_ROOTS, CUP))
    checks["reimport_cup_parent_is_chair"] = imported.get(CUP) is not None and imported.get(CUP).parent is not None and imported.get(CUP).parent.name == "Fading_StudyChair"
    checks["reimport_instantiated_triangle_count_matches"] = sum(item["triangles"] for item in topology) == report["geometry"]["instantiated_triangles"]
    checks["no_inward_closed_bodies"] = not any(component["inward_closed_body"] for item in topology for component in item["components"])
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
