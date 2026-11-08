"""The staffs on the owner's eighteen sheets, left to right as the sheet faces you. (Placeholder ids while they're looked at.)"""
import os

SRC = r"F:\!    BM V2\! TRIPO MODELS\Staffs 2"
COUNTS = {s: 5 if s <= 11 else 4 for s in range(1, 19)}


def sheet_path(sheet):
    name = next(f for f in os.listdir(SRC) if f.startswith(f"Staffs - {sheet}.") or f.startswith(f"Staffs - {sheet} "))
    return os.path.join(SRC, name)


# (sheet x, y, z) boxes of a sheet, the staff (left to right from 0) the walk gave them to, and the one whose they are.
MOVES = {10: [((0.209, 0.80, -1), (1, 0.96, 1), 3, 4)]}

# What hangs, by the placeholder id: cut, the height in metres just under where it's tied; seed, a point on it (up, across[, "front"]).
DANGLES = {
    "s02a": [dict(cut=0.0, seed=(-0.15, -0.11), cloth=True, core=0.06), dict(cut=0.0, seed=(-0.2, 0.07), cloth=True, core=0.05)],
    "s03e": [dict(cut=-0.005, seed=(-0.16, 0.075))],
    "s04c": [dict(cut=0.04, seed=(-0.035, 0.056))],
    "s05e": [dict(cut=0.24, seed=(0.17, -0.069)), dict(cut=0.24, seed=(0.17, 0.077))],
    "s06d": [dict(cut=0.25, seed=(0.19, 0.084))],
    "s08d": [dict(cut=0.215, seed=(0.05, -0.076)), dict(cut=0.215, seed=(0.11, 0.095))],
    "s09a": [dict(cut=0.15, seed=(-0.04, -0.075))],
    "s09b": [dict(cut=0.19, seed=(0.03, -0.081)), dict(cut=0.19, seed=(0.03, 0.069))],
    "s09d": [dict(cut=0.12, seed=(0.0, 0.095), core=0.06)],
    "s09e": [dict(cut=0.10, seed=(-0.02, 0.057), core=0.04)],
    "s10b": [dict(cut=0.24, seed=(-0.04, 0.069))],
    "s10c": [dict(cut=0.15, seed=(-0.1, 0.057))],
    "s10d": [dict(cut=0.265, seed=(0.19, -0.07)), dict(cut=0.265, seed=(0.19, 0.069))],
    "s11b": [dict(cut=0.06, seed=(0.0, -0.08), core=0.05)],
    "s12a": [dict(cut=0.30, seed=(0.22, -0.09)), dict(cut=0.30, seed=(0.22, 0.12))],
    "s12c": [dict(cut=0.31, seed=(0.10, -0.106), core=0.055), dict(cut=0.31, seed=(0.07, 0.09), core=0.055)],
    "s13a": [dict(cut=0.27, seed=(0.05, -0.1)), dict(cut=0.27, seed=(0.08, 0.087))],
    "s13b": [dict(cut=0.25, seed=(-0.06, 0.064))],
    "s13c": [dict(cut=0.20, seed=(0.11, 0.055), core=0.04), dict(cut=-0.03, seed=(-0.25, 0.08), cloth=True)],
    "s13d": [dict(cut=0.28, seed=(0.04, 0.07)), dict(cut=-0.08, seed=(-0.2, 0.1), cloth=True, core=0.06)],
    "s14d": [dict(cut=0.29, seed=(0.09, 0.071))],
}

# Every staff: the placeholder it was cut as, its id and name, its rarity by how fine it looks (0 common to 4 legendary; the sheets
# marked COMMON are 0 or 1), and what it fires (src/sim/casting.js STAFF_SHOTS).
TABLE = """
s01a dawnspire_staff      Dawnspire                3 sunburst
s01b nightflame_staff     Nightflame Staff         3 singularity
s01c riptide_staff        Riptide Staff            3 prism
s01d verdant_heart        Verdant Heart            2 vine
s01e phoenix_ascendant    Phoenix Ascendant        4 phoenix
s02a sunbanner_staff      Sunbanner                4 sunburst
s02b galaxy_coil          Galaxy Coil              3 singularity
s02c emerald_thornheart   Emerald Thornheart       2 thorns
s02d shardstorm_staff     Shardstorm Staff         3 prism
s02e bloodsigil_staff     Bloodsigil Staff         1 leech
s03a eye_of_the_maelstrom Eye of the Maelstrom     4 singularity
s03b wildcage_staff       Wildcage Staff           2 bloom
s03c hourglass_of_ages    Hourglass of Ages        4 stasis
s03d frostfang_trident    Frostfang Trident        2 rime
s03e blood_moon           Blood Moon               3 leech
s04a sunspoke_staff       Sunspoke Staff           2 sunburst
s04b glacier_spire        Glacier Spire            2 rime
s04c duskorb_staff        Duskorb Staff            2 shade
s04d grovekeeper          Grovekeeper              2 vine
s04e stormcaller          Stormcaller              3 tesla
s05a orrery_staff         Orrery Staff             3 starfall
s05b thornwood_staff      Thornwood Staff          2 thorns
s05c winterstar           Winterstar               3 rime
s05d emberheart_staff     Emberheart Staff         2 comet
s05e voidgaze_staff       Voidgaze Staff           3 shade
s06a cinderbloom_staff    Cinderbloom Staff        1 comet
s06b moonwane_staff       Moonwane Staff           2 crescent
s06c mossheart_staff      Mossheart Staff          1 bloom
s06d abyssal_eye          Abyssal Eye              2 singularity
s06e seraphs_coil         Seraph's Coil            4 judgement
s07a sunwheel_staff       Sunwheel Staff           2 sunburst
s07b lichs_lantern        Lich's Lantern           2 souls
s07c ivyheart_staff       Ivyheart Staff           1 vine
s07d hoarfrost_staff      Hoarfrost Staff          2 rime
s07e wyrmcoil_staff       Wyrmcoil                 4 wyrm
s08a dawnwheel_staff      Dawnwheel Staff          1 sunburst
s08b icefall_staff        Icefall Staff            2 prism
s08c whisper_spiral       Spiral of Whispers       2 shade
s08d druids_reliquary     Druid's Reliquary        3 bloom
s08e stormeye_staff       Stormeye Staff           2 tesla
s09a angels_dawn          Angel's Dawn             3 sunburst
s09b wildroot_staff       Wildroot Staff           3 thorns
s09c frostlance_staff     Frostlance               2 rime
s09d gravecaller          Gravecaller              2 souls
s09e drakescale_staff     Drakescale Staff         3 wyrm
s10a sunrod               Sunrod                   1 sunburst
s10b bonelantern_staff    Bonelantern Staff        2 souls
s10c hedgewitch_staff     Hedgewitch Staff         2 vine
s10d frostwheel_staff     Frostwheel Staff         3 prism
s10e magma_heart          Magma Heart              3 comet
s11a sunpillar_staff      Sunpillar Staff          2 sunburst
s11b verdant_oath         Verdant Oath             3 bloom
s11c umbral_eye           Umbral Eye               2 shade
s11d icecrown_staff       Icecrown Staff           3 rime
s11e dragonheart_staff    Dragonheart Staff        3 wyrm
s12a emerald_vigil        Emerald Vigil            3 vine
s12b wraith_staff         Wraith Staff             2 souls
s12c celestial_orrery     Celestial Orrery         4 starfall
s12d rimeheart_staff      Rimeheart Staff          1 rime
s13a moonlit_reliquary    Moonlit Reliquary        3 crescent
s13b forest_charm         Forest Charm Staff       2 thorns
s13c shroud_of_the_lich   Shroud of the Lich       4 souls
s13d frostbanner_staff    Frostbanner              3 prism
s14a oakroot_staff        Oakroot Staff            0 vine
s14b sapphire_staff       Sapphire Staff           1 prism
s14c lavaroot_staff       Lavaroot Staff           1 comet
s14d pale_crescent        Pale Crescent            1 crescent
s15a mossgem_staff        Mossgem Staff            0 thorns
s15b cobalt_staff         Cobalt Staff             0 frost
s15c ember_staff          Ember Staff              0 comet
s15d twilight_staff       Twilight Staff           1 crescent
s16a moonstone_staff      Moonstone Staff          0 bloom
s16b amethyst_staff       Amethyst Staff           0 shade
s16c old_crook            Old Crook                0 souls
s16d wayfinder_staff      Wayfinder Staff          1 starfall
s17a driftwood_staff      Driftwood Staff          0 frost
s17b copper_sun_staff     Copper Sun Staff         0 sunburst
s17c vinewood_staff       Vinewood Staff           0 vine
s17d ironcrystal_staff    Ironcrystal Staff        0 shade
s18a stormwood_staff      Stormwood Staff          0 tesla
s18b gilded_sun_staff     Gilded Sun Staff         1 sunburst
s18c bonecrystal_staff    Bonecrystal Staff        0 souls
s18d greenmoon_staff      Greenmoon Staff          0 thorns
"""

STAFFS = []
for _line in TABLE.strip().splitlines():
    _ph, _id = _line[:4], _line[5:26].strip()
    _name, _tier, _shot = _line[26:51].strip(), int(_line[51:53]), _line[53:].strip()
    _s = dict(sheet=int(_ph[1:3]), placeholder=_ph, id=_id, name=_name, tier=_tier, shot=_shot)
    if _ph in DANGLES:
        _s["dangles"] = DANGLES[_ph]
    STAFFS.append(_s)
assert len(STAFFS) == 83 and all(len([t for t in STAFFS if t["sheet"] == k]) == COUNTS[k] for k in COUNTS)
