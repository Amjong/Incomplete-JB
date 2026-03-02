import bpy
import os

OUT_DIR = "/Users/gaamza/dev/Incomplete-JB/public/models/library"


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)


def get_mat(name, base, metallic=0.0, roughness=0.6, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base, 1.0)
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if emission is not None and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_cube(name, size=(1, 1, 1), loc=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] * 0.5, size[1] * 0.5, size[2] * 0.5)
    if mat:
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
    return obj


def add_cylinder(name, radius=0.1, depth=1.0, loc=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def parent_all_to_empty(empty_name):
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = empty_name
    for obj in [o for o in bpy.context.scene.objects if o != root]:
        obj.parent = root
    return root


def export_glb(filename):
    filepath = os.path.join(OUT_DIR, filename)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.context.scene.objects[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    print(f"Exported {filepath}")


def make_floor():
    clear_scene()
    floor_mat = get_mat("floor_mat", (0.12, 0.16, 0.24), metallic=0.1, roughness=0.35)
    seam_mat = get_mat("seam_mat", (0.2, 0.24, 0.28), metallic=0.15, roughness=0.45)

    add_cube("floor_base", size=(36, 0.16, 82), loc=(0, -0.08, 0), mat=floor_mat)

    for x in range(-16, 17, 4):
        add_cube(f"seam_x_{x}", size=(0.04, 0.17, 82), loc=(x, -0.079, 0), mat=seam_mat)
    for z in range(-40, 41, 4):
        add_cube(f"seam_z_{z}", size=(36, 0.17, 0.04), loc=(0, -0.079, z), mat=seam_mat)

    parent_all_to_empty("library_floor")
    export_glb("library-floor.glb")


def make_mezzanine():
    clear_scene()
    deck_mat = get_mat("deck_mat", (0.28, 0.33, 0.38), metallic=0.25, roughness=0.5)
    rail_mat = get_mat("rail_mat", (0.46, 0.52, 0.58), metallic=0.45, roughness=0.35)
    post_mat = get_mat("post_mat", (0.36, 0.42, 0.48), metallic=0.35, roughness=0.45)

    add_cube("deck", size=(1.0, 0.25, 1.0), loc=(0, -0.125, 0), mat=deck_mat)

    # side beams
    add_cube("beam_l", size=(1.0, 0.2, 0.06), loc=(0, 0.1, -0.47), mat=post_mat)
    add_cube("beam_r", size=(1.0, 0.2, 0.06), loc=(0, 0.1, 0.47), mat=post_mat)

    # rails
    for sign in (-1, 1):
        add_cube(f"rail_top_{sign}", size=(1.0, 0.05, 0.03), loc=(0, 0.72, 0.47 * sign), mat=rail_mat)
        for i in range(9):
            x = -0.45 + i * 0.1125
            add_cylinder(f"rail_post_{sign}_{i}", radius=0.012, depth=0.66, loc=(x, 0.39, 0.47 * sign), mat=rail_mat)

    # vertical supports
    for sx in (-0.42, 0.42):
        for sz in (-0.42, 0.42):
            add_cube(f"support_{sx}_{sz}", size=(0.05, 0.9, 0.05), loc=(sx, -0.55, sz), mat=post_mat)

    parent_all_to_empty("library_mezzanine")
    export_glb("library-mezzanine.glb")


def make_tower():
    clear_scene()
    frame = get_mat("tower_frame", (0.34, 0.40, 0.46), metallic=0.45, roughness=0.35)
    shelf = get_mat("tower_shelf", (0.25, 0.31, 0.36), metallic=0.25, roughness=0.48)

    # posts and braces
    post_coords = [(-1.05, -0.72), (1.05, -0.72), (-1.05, 0.72), (1.05, 0.72)]
    for i, (px, pz) in enumerate(post_coords):
        add_cube(f"post_{i}", size=(0.12, 8.0, 0.12), loc=(px, 4.0, pz), mat=frame)

    for y in (0.4, 2.0, 3.6, 5.2, 6.8):
        add_cube(f"brace_x_{y}", size=(2.2, 0.08, 0.08), loc=(0, y, -0.72), mat=frame)
        add_cube(f"brace_x2_{y}", size=(2.2, 0.08, 0.08), loc=(0, y, 0.72), mat=frame)

    levels = (0.2, 1.8, 3.4, 5.0, 6.6)
    colors = [
        (0.84, 0.78, 0.72),
        (0.60, 0.72, 0.84),
        (0.78, 0.62, 0.66),
        (0.67, 0.76, 0.66),
        (0.58, 0.56, 0.74),
        (0.80, 0.69, 0.52),
    ]

    for li, y in enumerate(levels):
        add_cube(f"deck_{li}", size=(2.2, 0.1, 1.5), loc=(0, y, 0), mat=shelf)
        for bi in range(10):
            h = 0.24 + ((li * 17 + bi * 11) % 100) / 100 * 0.38
            x = -0.92 + bi * 0.205
            z = -0.08 + (((li * 19 + bi * 7) % 5) - 2) * 0.045
            c = colors[(li + bi) % len(colors)]
            book_mat = get_mat(f"book_{li}_{bi}", c, metallic=0.0, roughness=0.75)
            add_cube(f"book_{li}_{bi}", size=(0.16, h, 0.2), loc=(x, y + 0.05 + h * 0.5, z), mat=book_mat)

    parent_all_to_empty("library_tower")
    export_glb("library-tower.glb")


def make_bridge():
    clear_scene()
    deck = get_mat("bridge_deck", (0.34, 0.40, 0.46), metallic=0.45, roughness=0.4)
    rail = get_mat("bridge_rail", (0.46, 0.53, 0.59), metallic=0.5, roughness=0.35)

    add_cube("deck", size=(16, 0.22, 1.4), loc=(0, -0.11, 0), mat=deck)
    for sign in (-1, 1):
        add_cube(f"rail_top_{sign}", size=(16, 0.05, 0.03), loc=(0, 0.65, sign * 0.62), mat=rail)
        for i in range(33):
            x = -7.8 + i * 0.49
            add_cylinder(f"rail_post_{sign}_{i}", radius=0.01, depth=0.62, loc=(x, 0.33, sign * 0.62), mat=rail)

    parent_all_to_empty("library_bridge")
    export_glb("library-bridge.glb")


def make_stair_step():
    clear_scene()
    stair = get_mat("stair_mat", (0.38, 0.42, 0.50), metallic=0.2, roughness=0.62)
    edge = get_mat("stair_edge", (0.58, 0.64, 0.72), metallic=0.35, roughness=0.45)

    add_cube("step", size=(6.4, 0.24, 0.84), loc=(0, -0.12, 0), mat=stair)
    add_cube("edge", size=(6.4, 0.05, 0.06), loc=(0, 0.03, -0.39), mat=edge)

    parent_all_to_empty("library_stair_step")
    export_glb("library-stair-step.glb")


def make_railing():
    clear_scene()
    rail = get_mat("railing_mat", (0.45, 0.52, 0.58), metallic=0.5, roughness=0.32)

    add_cube("rail_top", size=(0.08, 0.06, 46), loc=(0, 0.8, 0), mat=rail)
    for i in range(38):
        z = -22.5 + i * 1.22
        add_cylinder(f"post_{i}", radius=0.014, depth=1.62, loc=(0, -0.01, z), mat=rail)

    parent_all_to_empty("library_railing")
    export_glb("library-railing.glb")


def make_back_wall():
    clear_scene()
    wall = get_mat("back_wall", (0.26, 0.31, 0.39), metallic=0.18, roughness=0.5)
    beam = get_mat("back_beam", (0.38, 0.46, 0.56), metallic=0.35, roughness=0.4)

    add_cube("wall", size=(35.2, 11, 0.5), loc=(0, 0, 0), mat=wall)
    for y in (-4, -1.2, 1.6, 4.4):
        add_cube(f"beam_{y}", size=(35.2, 0.12, 0.56), loc=(0, y, 0), mat=beam)

    parent_all_to_empty("library_back_wall")
    export_glb("library-back-wall.glb")


def make_entry_wall():
    clear_scene()
    wall = get_mat("entry_wall", (0.44, 0.51, 0.57), metallic=0.3, roughness=0.45)

    add_cube("wall", size=(12, 1.8, 0.1), loc=(0, 0, 0), mat=wall)

    parent_all_to_empty("library_entry_wall")
    export_glb("library-entry-wall.glb")


def make_window_wall():
    clear_scene()
    frame = get_mat("window_frame", (0.38, 0.46, 0.56), metallic=0.35, roughness=0.4)
    glass = get_mat("window_glass", (0.86, 0.92, 1.0), metallic=0.0, roughness=0.05, emission=(0.55, 0.72, 1.0), emission_strength=0.8)

    add_cube("frame_outer", size=(12, 9, 0.2), loc=(0, 0, 0), mat=frame)
    add_cube("glass_panel", size=(11.4, 8.4, 0.08), loc=(0, 0, 0.04), mat=glass)
    for x in (-4, 0, 4):
        add_cube(f"mullion_v_{x}", size=(0.1, 8.8, 0.22), loc=(x, 0, 0), mat=frame)
    for y in (-3, 0, 3):
        add_cube(f"mullion_h_{y}", size=(11.8, 0.1, 0.22), loc=(0, y, 0), mat=frame)

    parent_all_to_empty("library_window_wall")
    export_glb("library-window-wall.glb")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    make_floor()
    make_mezzanine()
    make_tower()
    make_bridge()
    make_stair_step()
    make_railing()
    make_back_wall()
    make_entry_wall()
    make_window_wall()
    print("All library module GLBs generated.")


if __name__ == "__main__":
    main()
