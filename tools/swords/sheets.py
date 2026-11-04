"""The Tripo sword sheets in art/swords and what is on each, read by separate.py, atlas.py and render_icons.py.

    source:  four swords side by side on one mesh, pommels up, in the source's units
    hands:   which rig swings them: tip is the distance from the fist to the tip that rig's swings are solved on
    gaps:    where the gaps between its swords fall along X. Its vertices are split at every UV seam, so "loose parts" would be
             its UV charts rather than its swords
    swords, left to right:
    grip:    (bottom, top), the bare handle from the guard to the pommel, read off the mesh's width along its length
    grip_x:  what along X counts as the handle, where a knuckle bow or a swept hilt reaches past it at the same height
    sockets: in the order they fill: slot, height and radius. Those on the blade follow its middle, for the blade that curves
"""
ONE_HAND_TIP = 0.60                        # tools/fp_arms/swings1h.py
TWO_HAND_TIP = 1.00                        # tools/fp_arms/swings.py
# Two fists don't go on a handle made to the proportions of one: the right fist sits this far below the guard and the left
# 0.155 below that (build.py's LEFT_SLIDE and the swings), so a two-hander's handle alone is drawn out to this length.
FIST_TO_GUARD = 0.05
TWO_HAND_GRIP = 0.25

SHEETS = [
    dict(source="swords_1_source.glb", hands=1, tip=ONE_HAND_TIP, gaps=(-0.2467, 0.0015, 0.2560), swords=[
        dict(id="gilded_sword", grip=(0.78, 0.90), sockets=[("guard", 0.750, 0.018), ("blade", 0.503, 0.016), ("blade", 0.277, 0.012), ("pommel", 0.942, 0.018)]),
        dict(id="crimson_sword", grip=(0.82, 0.90), sockets=[("guard", 0.740, 0.018), ("blade", 0.574, 0.016), ("blade", 0.412, 0.014), ("pommel", 0.942, 0.016)]),
        dict(id="thornvine_sword", grip=(0.79, 0.90), sockets=[("guard", 0.746, 0.016), ("blade", 0.510, 0.014), ("blade", 0.300, 0.012), ("pommel", 0.950, 0.016)]),
        dict(id="frost_sword", grip=(0.80, 0.90), sockets=[("guard", 0.736, 0.018), ("blade", 0.554, 0.016), ("blade", 0.230, 0.012), ("pommel", 0.960, 0.014)]),
    ]),
    dict(source="swords_2_source.glb", hands=1, tip=ONE_HAND_TIP, gaps=(-0.258, 0.017, 0.25), swords=[
        dict(id="ringed_sword", grip=(0.81, 0.94), sockets=[("guard", 0.790, 0.016), ("blade", 0.550, 0.014), ("blade", 0.300, 0.012), ("pommel", 0.972, 0.016)]),
        dict(id="bronze_broadsword", grip=(0.82, 0.94), sockets=[("guard", 0.792, 0.018), ("blade", 0.550, 0.016), ("blade", 0.300, 0.014), ("pommel", 0.966, 0.016)]),
        dict(id="brass_sabre", grip=(0.81, 0.93), grip_x=(0.115, 0.16), sockets=[("guard", 0.785, 0.014), ("blade", 0.560, 0.012), ("blade", 0.320, 0.012), ("pommel", 0.942, 0.012)]),
        dict(id="swept_rapier", grip=(0.87, 0.94), grip_x=(0.36, 0.40), sockets=[("guard", 0.812, 0.014), ("blade", 0.620, 0.008), ("blade", 0.450, 0.007), ("pommel", 0.968, 0.014)]),
    ]),
    dict(source="swords_2h_1_source.glb", hands=2, tip=TWO_HAND_TIP, gaps=(-0.25, 0.005, 0.2545), swords=[
        dict(id="wheel_greatsword", grip=(0.785, 0.94), sockets=[("guard", 0.770, 0.016), ("blade", 0.550, 0.014), ("blade", 0.300, 0.012), ("pommel", 0.968, 0.016)]),
        dict(id="bluegrip_greatsword", grip=(0.795, 0.95), sockets=[("guard", 0.768, 0.016), ("blade", 0.550, 0.014), ("blade", 0.300, 0.012), ("pommel", 0.966, 0.014)]),
        dict(id="fluked_greatsword", grip=(0.79, 0.95), sockets=[("guard", 0.758, 0.018), ("blade", 0.500, 0.016), ("blade", 0.280, 0.014), ("pommel", 0.964, 0.014)]),
        dict(id="greengrip_greatsword", grip=(0.79, 0.935), sockets=[("guard", 0.762, 0.016), ("blade", 0.550, 0.012), ("blade", 0.300, 0.012), ("pommel", 0.960, 0.014)]),
    ]),
]
