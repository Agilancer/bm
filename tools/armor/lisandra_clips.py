"""Which of Lisandra's clips the knights fight with, and the part of each that's used (seconds into her clip).

src: her clip. mirror: swap the sides (her cleaver chop is left-handed). loop: a whole stride, start to the same
foot's next up-crossing. root: it travels, and the game carries the body along. limb: what lands the blow, for measuring where in the clip it can land.
"""
LISANDRA = {
    # Blows.
    "L_Slash": {"src": "slash", "start": 0.9, "end": 2.7, "limb": "hand_r"},
    "L_Chop": {"src": "Overhand cleaver downward chop motion with cleaver with left ha", "start": 0.0, "end": 1.7, "mirror": True, "limb": "hand_r"},
    "L_SnapKick": {"src": "front_kick_02", "start": 0.0, "end": 1.35, "limb": "foot_r"},
    "L_Pounce": {"src": "Pounce on an enemy violently attacking them", "start": 0.8, "end": 2.8, "limb": "hand_r"},
    "L_ShieldJab": {"src": "box_01", "start": 0.0, "end": 1.2, "limb": "hand_l"},
    "L_ShieldCross": {"src": "box_02", "start": 0.3, "end": 2.4, "limb": "hand_l"},
    # Getting out of the way.
    # Words without words.
    "L_Point": {"src": "Pointing at an enemy", "start": 2.6, "end": 4.8},
    "L_Angry": {"src": "angry_01", "start": 0.3, "end": 3.4},
    # Going places.
    "L_Stalk": {"src": "Intimidating walk", "start": 3.8, "end": 4.93, "loop": True, "root": True},
    "L_Run": {"src": "Running", "start": 1.9, "end": 2.63, "loop": True, "root": True},
    # Taking it.
    "L_HitHead": {"src": "hit_to_head", "start": 0.0, "end": 1.6},
    "L_HitBody": {"src": "hit_to_body_02", "start": 0.0, "end": 1.6},
    "L_HitGut": {"src": "hit_to_stomach", "start": 0.0, "end": 1.5},
}
