"""Each staff's power point, set by eye on tools/staffeffects/grid.py's sheets: (across z, up y, radius), metres in the item's
frame from the front. Depth is read off the mesh by cores.py."""
PLACED = {
    "greenwood_staff": (-0.01, 0.375, 0.065), "crystal_staff": (0.0, 0.40, 0.09), "skullhorn_staff": (-0.05, 0.40, 0.06),
    "gnarled_crook": (-0.02, 0.48, 0.07), "dark_staff": (0.015, 0.45, 0.09), "death_staff": (0.0, 0.435, 0.075),
    "earth_staff": (0.03, 0.32, 0.07), "fire_staff": (0.0, 0.365, 0.12), "ice_staff": (-0.005, 0.365, 0.09),
    "life_staff": (0.01, 0.405, 0.08), "vine_staff": (-0.01, 0.415, 0.10), "wind_staff": (0.0, 0.385, 0.10),

    "dawnspire_staff": (0.0, 0.395, 0.055), "nightflame_staff": (-0.01, 0.435, 0.055), "riptide_staff": (0.015, 0.44, 0.05),
    "verdant_heart": (0.0, 0.40, 0.07), "phoenix_ascendant": (0.02, 0.42, 0.085), "sunbanner_staff": (-0.01, 0.355, 0.065),
    "galaxy_coil": (-0.01, 0.40, 0.075), "emerald_thornheart": (0.0, 0.305, 0.07), "shardstorm_staff": (0.0, 0.40, 0.08),
    "bloodsigil_staff": (0.0, 0.35, 0.07), "eye_of_the_maelstrom": (0.0, 0.385, 0.07), "wildcage_staff": (-0.02, 0.35, 0.07),

    "hourglass_of_ages": (0.0, 0.35, 0.09), "frostfang_trident": (0.0, 0.395, 0.08), "blood_moon": (-0.005, 0.45, 0.09),
    "sunspoke_staff": (-0.005, 0.37, 0.065), "glacier_spire": (0.01, 0.385, 0.055), "duskorb_staff": (0.0, 0.335, 0.065),
    "grovekeeper": (-0.015, 0.405, 0.08), "stormcaller": (-0.01, 0.37, 0.06), "orrery_staff": (0.0, 0.415, 0.095),
    "thornwood_staff": (-0.005, 0.47, 0.085), "winterstar": (0.0, 0.415, 0.06), "emberheart_staff": (0.01, 0.305, 0.09),

    "voidgaze_staff": (0.0, 0.405, 0.09), "cinderbloom_staff": (-0.01, 0.45, 0.055), "moonwane_staff": (-0.008, 0.535, 0.055),
    "mossheart_staff": (-0.01, 0.40, 0.055), "abyssal_eye": (0.0, 0.405, 0.085), "seraphs_coil": (-0.035, 0.395, 0.045),
    "sunwheel_staff": (-0.005, 0.42, 0.05), "lichs_lantern": (-0.01, 0.405, 0.07), "ivyheart_staff": (-0.015, 0.38, 0.07),
    "hoarfrost_staff": (0.015, 0.39, 0.075), "wyrmcoil_staff": (-0.02, 0.36, 0.08), "dawnwheel_staff": (0.0, 0.45, 0.045),

    "icefall_staff": (-0.01, 0.415, 0.07), "whisper_spiral": (0.005, 0.43, 0.055), "druids_reliquary": (0.0, 0.415, 0.05),
    "stormeye_staff": (0.0, 0.44, 0.05), "angels_dawn": (0.015, 0.43, 0.045), "wildroot_staff": (0.0, 0.365, 0.075),
    "frostlance_staff": (-0.005, 0.345, 0.055), "gravecaller": (0.0, 0.435, 0.075), "drakescale_staff": (-0.015, 0.405, 0.07),
    "sunrod": (0.0, 0.395, 0.055), "bonelantern_staff": (0.01, 0.435, 0.065), "hedgewitch_staff": (-0.02, 0.385, 0.055),

    "frostwheel_staff": (0.0, 0.40, 0.055), "magma_heart": (-0.01, 0.395, 0.06), "sunpillar_staff": (-0.005, 0.40, 0.055),
    "verdant_oath": (-0.015, 0.45, 0.07), "umbral_eye": (0.01, 0.365, 0.08), "icecrown_staff": (0.0, 0.345, 0.045),
    "dragonheart_staff": (-0.04, 0.34, 0.075), "emerald_vigil": (0.015, 0.45, 0.08), "wraith_staff": (0.0, 0.47, 0.06),
    "celestial_orrery": (0.0, 0.43, 0.07), "rimeheart_staff": (0.0, 0.465, 0.08), "moonlit_reliquary": (-0.005, 0.42, 0.085),

    "forest_charm": (0.0, 0.44, 0.055), "shroud_of_the_lich": (-0.035, 0.505, 0.07), "frostbanner_staff": (-0.03, 0.425, 0.06),
    "oakroot_staff": (-0.02, 0.505, 0.07), "sapphire_staff": (-0.005, 0.495, 0.06), "lavaroot_staff": (-0.01, 0.45, 0.09),
    "pale_crescent": (0.005, 0.53, 0.075), "mossgem_staff": (0.015, 0.535, 0.06), "cobalt_staff": (0.0, 0.52, 0.06),
    "ember_staff": (0.0, 0.49, 0.07), "twilight_staff": (0.0, 0.50, 0.09), "moonstone_staff": (-0.01, 0.51, 0.065),

    "amethyst_staff": (0.0, 0.50, 0.06), "old_crook": (-0.05, 0.49, 0.045), "wayfinder_staff": (0.0, 0.47, 0.05),
    "driftwood_staff": (-0.015, 0.525, 0.065), "copper_sun_staff": (0.0, 0.44, 0.06), "vinewood_staff": (0.0, 0.49, 0.045),
    "ironcrystal_staff": (0.0, 0.515, 0.06), "stormwood_staff": (-0.01, 0.52, 0.085), "gilded_sun_staff": (0.0, 0.445, 0.06),
    "bonecrystal_staff": (0.0, 0.545, 0.06), "greenmoon_staff": (-0.005, 0.525, 0.06),
}
