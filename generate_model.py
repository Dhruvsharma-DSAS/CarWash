"""
24-SECOND CYCLE LINE - 3D machine model generator
Six-station indexed car cleaning line. Units are metres.
Exports GLB (for decks / web viewers) and OBJ+MTL (for Blender / SketchUp / Fusion).
"""

import os
import numpy as np
import trimesh
from trimesh.transformations import translation_matrix, rotation_matrix, concatenate_matrices



C = {
    "concrete": [40, 46, 53, 255],
    "steel":    [95, 110, 127, 255],
    "dark":     [35, 42, 51, 255],
    "amber":    [255, 178, 63, 255],
    "cyan":     [71, 214, 224, 255],
    "brush":    [46, 91, 102, 255],
    "paint":    [201, 205, 210, 255],
    "glass":    [24, 32, 40, 255],
    "rubber":   [20, 24, 28, 255],
    "lane":     [150, 110, 45, 255],
}

SPACING = 9.0
station_x = lambda i: (i - 2.5) * SPACING

parts = {}   # name -> mesh

def _add(name, mesh, color):
    mesh.visual.face_colors = C[color]
    n, k = name, 1
    while n in parts:
        k += 1
        n = f"{name}_{k}"
    parts[n] = mesh
    return mesh

def box(name, size, at, color, rot=None):
    m = trimesh.creation.box(extents=size)
    T = translation_matrix(at)
    if rot is not None:
        T = concatenate_matrices(T, rotation_matrix(rot[0], rot[1]))
    m.apply_transform(T)
    return _add(name, m, color)

def cyl(name, radius, height, at, color, axis="y", sections=28):
    m = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    if axis == "y":
        m.apply_transform(rotation_matrix(np.pi / 2, [1, 0, 0]))
    elif axis == "x":
        m.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0]))
    m.apply_translation(at)
    return _add(name, m, color)

def torus(name, R, r, at, color):
    m = trimesh.creation.torus(major_radius=R, minor_radius=r, major_sections=48, minor_sections=12)
    m.apply_transform(rotation_matrix(np.pi / 2, [0, 1, 0]))
    m.apply_translation(at)
    return _add(name, m, color)

def generate():
    parts.clear()
    # ---------------------------------------------------------------- site
    box("floor_slab", [96, 0.3, 34], [0, -0.15, 0], "concrete")
    box("conveyor_bed", [78, 0.25, 5.4], [0, 0.12, 0], "dark")

    for z in (-2.9, 2.9):
        box("lane_marking", [78, 0.03, 0.16], [0, 0.26, z], "lane")

    # roller drive housings down the bed
    for x in np.arange(-37, 38, 3.0):
        box("conveyor_roller", [0.3, 0.16, 5.0], [float(x), 0.30, 0], "steel")

    # ---------------------------------------------------------------- portal frames
    def portal(i):
        x = station_x(i)
        for z in (-3.5, 3.5):
            box(f"S{i+1}_column", [0.5, 6.2, 0.5], [x, 3.1, z], "steel")
            box(f"S{i+1}_hazard_stripe", [0.54, 0.9, 0.54], [x, 0.75, z], "amber")
        box(f"S{i+1}_crossbeam", [0.6, 0.5, 7.5], [x, 6.1, 0], "steel")
        box(f"S{i+1}_light_strip", [0.16, 0.1, 6.8], [x, 5.78, 0], "cyan")

    for i in range(6):
        portal(i)

    # ---------------------------------------------------------------- S1  load + 3D scan
    x = station_x(0)
    for z in (-3.5, 3.5):
        box("S1_scanner_post", [0.3, 4.4, 0.3], [x - 3.6, 2.2, z], "dark")
        box("S1_lidar_bar", [0.12, 3.4, 0.12], [x - 3.75, 2.4, z], "cyan")
    box("S1_scan_plane", [0.06, 4.6, 7.0], [x, 2.4, 0], "cyan")
    box("S1_door_actuator", [1.1, 0.5, 0.5], [x + 2.4, 1.6, -3.0], "dark")
    box("S1_door_actuator", [1.1, 0.5, 0.5], [x + 2.4, 1.6, 3.0], "dark")

    # ---------------------------------------------------------------- S2/S3  in-cabin arms
    def cabin_arm(i, head_kind):
        x = station_x(i)
        tag = f"S{i+1}"
        for side in (-1, 1):
            z = side * 3.4
            box(f"{tag}_arm_mast", [0.42, 5.0, 0.42], [x, 2.5, z], "steel")
            box(f"{tag}_arm_boom", [0.3, 0.3, 2.6], [x, 3.9, side * 2.2], "steel")
            box(f"{tag}_arm_wrist", [0.26, 1.4, 0.26], [x, 3.2, side * 1.05], "steel")
            if head_kind == "vacuum":
                box(f"{tag}_vacuum_shoe", [0.6, 0.3, 0.85], [x, 2.5, side * 1.05], "dark")
                box(f"{tag}_shoe_sensor", [0.62, 0.06, 0.87], [x, 2.32, side * 1.05], "cyan")
                cyl(f"{tag}_suction_duct", 0.16, 2.2, [x, 4.6, z], "dark", axis="y")
            else:
                cyl(f"{tag}_rotary_pad", 0.42, 0.16, [x, 2.5, side * 1.05], "brush", axis="y")
                cyl(f"{tag}_pad_motor", 0.18, 0.4, [x, 2.78, side * 1.05], "steel", axis="y")
                box(f"{tag}_chem_line", [0.1, 2.0, 0.1], [x, 4.6, z], "cyan")

    cabin_arm(1, "vacuum")
    cabin_arm(2, "pad")

    # ---------------------------------------------------------------- S4  pre-soak + wheels
    x = station_x(3)
    for k in range(9):
        a = (k / 8) * np.pi
        box("S4_foam_nozzle", [0.24, 0.3, 0.24],
            [x, 1.0 + np.sin(a) * 3.6, float(np.cos(a) * 3.2)], "dark")
    box("S4_chem_manifold", [0.35, 0.35, 7.2], [x, 5.55, 0], "steel")
    for bx in (-1.6, 1.6):
        for bz in (-2.6, 2.6):
            box("S4_wheel_blaster", [0.7, 0.7, 0.5], [x + bx, 0.5, bz], "dark")
            box("S4_blaster_jet", [0.3, 0.24, 0.24], [x + bx, 0.5, bz * 0.88], "cyan")
    box("S4_chem_tank", [1.6, 2.2, 1.4], [x - 1.0, 1.1, -6.4], "steel")
    box("S4_chem_tank", [1.6, 2.2, 1.4], [x + 1.0, 1.1, -6.4], "steel")

    # ---------------------------------------------------------------- S5  friction wash + rinse
    x = station_x(4)
    for side in (-1, 1):
        cyl("S5_wrap_brush", 0.95, 4.0, [x + side * 1.9, 2.1, side * 1.9], "brush", axis="y")
        cyl("S5_wrap_spindle", 0.16, 5.2, [x + side * 1.9, 2.6, side * 1.9], "steel", axis="y")
    cyl("S5_top_brush", 0.75, 6.4, [x, 3.3, 0], "brush", axis="z")
    box("S5_top_carriage", [1.2, 0.4, 7.2], [x, 4.4, 0], "steel")
    cyl("S5_mitter_shaft", 0.12, 7.0, [x - 3.2, 5.2, 0], "steel", axis="z")
    for z in np.linspace(-2.8, 2.8, 9):
        box("S5_mitter_strip", [0.1, 2.6, 0.34], [x - 3.2, 3.9, float(z)], "brush")
    box("S5_rinse_bar", [0.3, 0.3, 7.0], [x + 3.4, 5.0, 0], "dark")
    for z in np.linspace(-3.0, 3.0, 11):
        box("S5_rinse_nozzle", [0.18, 0.22, 0.18], [x + 3.4, 4.78, float(z)], "cyan")




    x = station_x(5)
    box("S6_air_knife_top", [0.34, 0.34, 6.6], [x - 1.0, 4.5, 0], "dark")
    for z in (-3.0, 3.0):
        box("S6_air_knife_side", [0.34, 0.34, 3.4], [x - 1.0, 2.3, z], "dark")
    box("S6_blower_housing", [2.2, 2.0, 2.0], [x - 1.0, 7.4, 0], "steel")
    torus("S6_qc_camera_ring", 3.5, 0.14, [x + 3.6, 2.6, 0], "steel")
    for k in range(10):
        a = (k / 10) * 2 * np.pi
        box("S6_qc_camera", [0.24, 0.24, 0.24],
            [x + 3.6, 2.6 + float(np.sin(a) * 3.5), float(np.cos(a) * 3.5)], "cyan")
    box("S6_reject_signal", [0.5, 0.9, 0.5], [x + 5.4, 5.6, -3.5], "amber")

    # ---------------------------------------------------------------- services
    for x in np.arange(-36, 37, 12.0):
        box("ceiling_light_housing", [1.2, 0.3, 8.0], [float(x), 8.4, 0], "dark")
        box("ceiling_light_lens", [1.0, 0.08, 7.6], [float(x), 8.22, 0], "cyan")

    for x in (-40.5, 40.5):
        box("end_gantry", [0.4, 5.4, 8.4], [x, 2.7, 0], "dark")

    box("control_cabinet", [2.0, 2.4, 1.2], [-30.0, 1.2, 7.2], "steel")
    box("control_hmi", [0.1, 0.9, 0.7], [-28.95, 1.7, 7.2], "cyan")
    box("water_reclaim_tank", [4.0, 2.6, 3.0], [10.0, 1.3, 9.0], "steel")
    box("pump_skid", [2.4, 1.4, 1.8], [15.0, 0.7, 9.0], "dark")

    # ---------------------------------------------------------------- reference car
    def car(cx, tag):
        box(f"{tag}_body_lower", [4.3, 0.72, 1.78], [cx, 0.86, 0], "paint")
        box(f"{tag}_body_mid",   [3.9, 0.44, 1.82], [cx, 1.40, 0], "paint")
        box(f"{tag}_cabin",      [2.25, 0.66, 1.66], [cx - 0.12, 1.90, 0], "paint")
        box(f"{tag}_glazing",    [2.28, 0.50, 1.70], [cx - 0.12, 1.94, 0], "glass")
        box(f"{tag}_roof",       [2.15, 0.10, 1.60], [cx - 0.12, 2.26, 0], "paint")
        for wx, wz in ((1.55, 0.9), (-1.5, 0.9), (1.55, -0.9), (-1.5, -0.9)):
            cyl(f"{tag}_wheel", 0.36, 0.24, [cx + wx, 0.38, wz], "rubber", axis="z")

    car(station_x(1), "car_A")
    car(station_x(4), "car_B")

    # Export targets
    output_dirs = ["./exports", "./public/exports", "/tmp/exports"]
    for out_dir in output_dirs:
        try:
            os.makedirs(out_dir, exist_ok=True)
            scene = trimesh.Scene()
            for name, mesh in parts.items():
                scene.add_geometry(mesh, node_name=name, geom_name=name)
            
            glb_path = os.path.join(out_dir, "24s-cycle-line.glb")
            obj_path = os.path.join(out_dir, "24s-cycle-line.obj")
            
            scene.export(glb_path)
            scene.export(obj_path)
            print(f"Exported successfully to {out_dir}")
        except Exception as e:
            print(f"Note for {out_dir}: {e}")

    merged = trimesh.util.concatenate(list(parts.values()))
    print(f"parts     : {len(parts)}")
    print(f"triangles : {len(merged.faces):,}")
    b = merged.bounds
    print(f"footprint : {b[1][0]-b[0][0]:.1f} m long x {b[1][2]-b[0][2]:.1f} m wide x {b[1][1]-b[0][1]:.1f} m tall")

if __name__ == "__main__":
    generate()
