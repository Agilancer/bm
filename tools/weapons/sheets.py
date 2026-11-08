r"""The owner's Tripo weapon and shield sheets in F:\!    BM V2\! TRIPO MODELS, and what is on each, read by cut.py.

    kind:  what they are, KINDS in cut.py: their size, which end is up, how many hands
    rows:  1, or 2 for a sheet with a row above a row
    tier:  the rarity they'd drop at by how fine they look (0 Common to 4 Legendary), a first guess for the ones not in the game yet
    note:  what the owner's file name says of them
    items: (id, name), top row first, left to right as the sheet faces you

The three sword sheets from 2026-11-04 (Swords 1 - High Level, Swords 2 - Common, 2-Handed Swords 1) aren't here: they're the
twelve swords already in the game (tools/swords). "2 Handed Maces 3.stl" isn't either: it's Two Handed Maces 3.glb's mesh again,
without its maps (76,726 triangles, both).
"""
import os

SOURCE = r"F:\!    BM V2\! TRIPO MODELS"


def S(folder, file, kind, tier, items, rows=1, note=""):
    return dict(folder=folder, file=file, kind=kind, tier=tier, rows=rows, note=note, items=[(i, n) for i, n in (x.split("=") for x in items)])


ENEMY = "basic enemies and monsters can use these"
TESS = "Tessariel and the lancers"
SHEETS = [
    # ---- shields, in the game ----
    S("Shields", "Kite Shields 1.glb", "kite", 2, ["kite_dawnstar=Dawnstar Kite Shield", "kite_blackwyrm=Blackwyrm Kite Shield", "kite_azure_wing=Azure Wing Kite Shield",
                                                   "kite_greenwood=Greenwood Kite Shield"]),
    S("Shields", "Kite Shields 2.glb", "kite", 4, ["kite_solar_crown=Solar Crown Kite Shield", "kite_bloodthorn=Bloodthorn Kite Shield", "kite_moonleaf=Moonleaf Kite Shield",
                                                   "kite_rimespike=Rimespike Kite Shield"]),
    S("Shields", "Kite Shields 3.glb", "kite", 4, ["kite_starcross=Starcross Kite Shield", "kite_spinedrake=Spinedrake Kite Shield", "kite_winterpine=Winterpine Kite Shield",
                                                   "kite_lionheart=Lionheart Kite Shield"]),
    S("Shields", "Kite Shields 4.glb", "kite", 2, ["kite_gilded_drake=Gilded Drake Kite Shield", "kite_ironthorn=Ironthorn Kite Shield", "kite_eclipse=Eclipse Kite Shield",
                                                   "kite_palewyrm=Pale Wyrm Kite Shield"]),
    S("Shields", "Kite Shields 5.glb", "kite", 3, ["kite_sunforged=Sunforged Kite Shield", "kite_cinderdrake=Cinder Drake Kite Shield", "kite_northstar=Northstar Kite Shield",
                                                   "kite_twin_stag=Twin Stag Kite Shield"]),
    S("Shields", "Kite Shields 6.glb", "kite", 3, ["kite_radiant=Radiant Kite Shield", "kite_coiled_dragon=Coiled Dragon Kite Shield", "kite_frozen_star=Frozen Star Kite Shield",
                                                   "kite_stag_crown=Stag Crown Kite Shield"]),
    S("Shields", "Kite Shields 7.glb", "kite", 1, ["kite_black_lion=Black Lion Kite Shield", "kite_compass=Compass Kite Shield", "kite_sun_cross=Sun Cross Kite Shield",
                                                   "kite_griffin=Griffin Kite Shield"]),
    S("Shields", "Kite Shields 8.glb", "kite", 0, ["kite_gold_lion=Gold Lion Kite Shield", "kite_red_cross=Red Cross Kite Shield", "kite_blue_fleur=Blue Fleur Kite Shield",
                                                   "kite_chevron=Chevron Kite Shield"]),
    S("Shields", "Tower Shields - Tessariel + Lancers - 1.glb", "tower", 2, ["tower_sun=Sun Tower Shield", "tower_griffin=Griffin Tower Shield", "tower_red_star=Red Star Tower Shield",
                                                                             "tower_ivy=Ivy Tower Shield"], note=TESS),
    S("Shields", "Tower Shields - Tessariel + Lancers - 2.glb", "tower", 3, ["tower_sunburst=Sunburst Tower Shield", "tower_gold_lion=Gold Lion Tower Shield",
                                                                             "tower_eagle=Eagle Tower Shield", "tower_dragon=Dragon Tower Shield"], note=TESS),
    S("Shields", "Tower Shields - Tessariel + Lancers - 3.glb", "tower", 4, ["tower_lion_sun=Lion Sun Tower Shield", "tower_serpent=Serpent Tower Shield",
                                                                             "tower_laurel=Laurel Tower Shield", "tower_world_tree=World Tree Tower Shield"], note=TESS),
    S("Shields", "Tower Shields - Tessariel + Lancers - 4.glb", "tower", 0, ["tower_iron=Iron Tower Shield", "tower_red_stripe=Red Stripe Tower Shield",
                                                                             "tower_blue_lion=Blue Lion Tower Shield", "tower_gold_chevron=Gold Chevron Tower Shield"], note=TESS),
    S("Shields", "Tower Shields - Tessariel + Lancers - 5.glb", "tower", 1, ["tower_sun_cross=Sun Cross Tower Shield", "tower_white_griffin=White Griffin Tower Shield",
                                                                             "tower_lancer=Lancer's Tower Shield", "tower_keep=Keep Tower Shield"], note=TESS),
    # ---- weapons, kept for later ----
    S("Swords", "1 Handed Swords 3 - RARE.glb", "sword", 2, ["sunguard_sword=Sunguard Sword", "bloodfire_sword=Bloodfire Sword", "vinewrap_sword=Vinewrap Sword",
                                                             "icevein_sword=Icevein Sword", "azure_sword=Azure Sword", "voidbolt_sword=Voidbolt Sword"], note="rare"),
    S("Swords", "1 Handed Swords 4 - RARE.glb", "sword", 2, ["goldspur_sword=Goldspur Sword", "dusk_sword=Dusk Sword", "rimeshard_sword=Rimeshard Sword",
                                                             "emberfang_sword=Emberfang Sword", "wildroot_sword=Wildroot Sword", "moonring_sword=Moonring Sword"], note="rare"),
    S("Swords", "1 Handed Swords 5 - Common - BASIC ENEMIES AND MONSTERS CAN USE THESE.glb", "sword", 0,
      ["spiked_longsword=Spiked Longsword", "bloodgem_sword=Bloodgem Sword", "greengrip_sword=Greengrip Sword", "bluegem_sword=Bluegem Sword",
       "lionguard_sword=Lionguard Sword", "scimitar=Scimitar"], note=ENEMY),
    S("Swords", "1 Handed Swords 6 - Common - BASIC ENEMIES AND MONSTERS CAN USE THESE.glb", "sword", 0,
      ["crossguard_sword=Crossguard Sword", "sawback_sword=Sawback Sword", "falchion=Falchion", "iron_sword=Iron Sword", "bluesteel_sword=Bluesteel Sword",
       "copper_sword=Copper Sword"], note=ENEMY),
    S("Spears - Dragoon", "Spears - Dragoon 1.glb", "spear", 3, ["emberbanner_spear=Emberbanner Spear", "skywing_spear=Skywing Spear", "violet_coil_spear=Violet Coil Spear",
                                                                 "greenbanner_spear=Greenbanner Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - Dragoon 2.glb", "spear", 4, ["bloodthorn_spear=Bloodthorn Spear", "starbanner_spear=Starbanner Spear", "violet_orb_spear=Violet Orb Spear",
                                                                 "sunbanner_spear=Sunbanner Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - Dragoon 3.glb", "spear", 3, ["frostgem_spear=Frostgem Spear", "crimson_twist_spear=Crimson Twist Spear", "golden_spear=Golden Spear",
                                                                 "violet_wraith_spear=Violet Wraith Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - Dragoon 4.glb", "spear", 3, ["icefang_spear=Icefang Spear", "redclaw_spear=Redclaw Spear", "goldcross_spear=Goldcross Spear",
                                                                 "duskspine_spear=Duskspine Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - Dragoon 5.glb", "spear", 1, ["bluewrap_spear=Bluewrap Spear", "redwrap_spear=Redwrap Spear", "iron_spear=Iron Spear",
                                                                 "winged_spear=Winged Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - Dragoon 6.glb", "spear", 2, ["whitegold_spear=Whitegold Spear", "crimson_spear=Crimson Spear", "frost_spear=Frost Spear",
                                                                 "vine_spear=Vine Spear"], note="dragoons"),
    S("Spears - Dragoon", "Spears - SPEARS THAT ENEMIES CAN USE + DRAGOONS 6.glb", "spear", 0, ["blue_pike=Blue Pike", "red_pike=Red Pike", "black_pike=Black Pike",
                                                                                                "pennon_spear=Pennon Spear"], note="enemies and dragoons can use these"),
    S("Maces", "1 Handed Maces.glb", "mace", 3, ["lionsun_mace=Lionsun Mace", "bloodspike_mace=Bloodspike Mace", "icecrystal_mace=Ice Crystal Mace",
                                                 "thornvine_mace=Thornvine Mace", "skull_mace=Skull Mace", "voidorb_mace=Void Orb Mace", "iron_maul=Iron Maul",
                                                 "magma_mace=Magma Mace"]),
    S("Maces", "1 Handed Maces 2.glb", "mace", 3, ["gilded_lion_mace=Gilded Lion Mace", "frostburst_mace=Frostburst Mace", "emberheart_mace=Emberheart Mace",
                                                   "greeneye_mace=Greeneye Mace", "bonecrown_mace=Bonecrown Mace", "bluewheel_mace=Bluewheel Mace", "kraken_mace=Kraken Mace",
                                                   "voidbloom_mace=Voidbloom Mace"], rows=2),
    S("Maces", "1 Handed Maces 3.glb", "mace", 0, ["morning_star=Morning Star", "flanged_mace=Flanged Mace", "studded_mace=Studded Mace", "ribbed_mace=Ribbed Mace",
                                                   "iron_morning_star=Iron Morning Star", "pointed_mace=Pointed Mace", "war_hammer=War Hammer",
                                                   "blue_morning_star=Blue Morning Star"], rows=2),
    S("Maces", "Two Handed Maces 1.glb", "great_mace", 3, ["hellfire_maul=Hellfire Maul", "glacier_maul=Glacier Maul", "sunburst_maul=Sunburst Maul",
                                                           "greenskull_maul=Greenskull Maul"]),
    S("Maces", "Two Handed Maces 2.glb", "great_mace", 3, ["frostspire_maul=Frostspire Maul", "bloodspire_maul=Bloodspire Maul", "goldstar_maul=Goldstar Maul",
                                                           "vinewrapped_maul=Vinewrapped Maul"]),
    S("Maces", "Two Handed Maces 3.glb", "great_mace", 0, ["great_morning_star=Great Morning Star", "great_flanged_mace=Great Flanged Mace",
                                                           "great_studded_mace=Great Studded Mace", "great_ribbed_mace=Great Ribbed Mace"]),
    S("Lances", "Lances for Lancers - 1.glb", "lance", 2, ["silver_lance=Silver Lance", "blood_lance=Blood Lance", "gilded_lance=Gilded Lance", "frost_lance=Frost Lance"], note="lancers"),
    S("Lances", "Lances for Lancers - 2.glb", "lance", 3, ["lion_lance=Lion Lance", "dragon_lance=Dragon Lance", "sun_lance=Sun Lance", "shadow_lance=Shadow Lance"], note="lancers"),
    S("Lances", "Lances for Lancers - 3.glb", "lance", 3, ["blue_lion_lance=Blue Lion Lance", "black_dragon_lance=Black Dragon Lance", "white_lance=White Lance",
                                                           "green_lance=Green Lance"], note="lancers"),
    S("Lances", "Lances for Lancers - 4.glb", "lance", 3, ["fleur_lance=Fleur Lance", "thorn_lance=Thorn Lance", "radiant_lance=Radiant Lance", "violet_lance=Violet Lance"],
      note="lancers"),
    S("Lances", "Lances for Lancers - 5.glb", "lance", 1, ["blue_tourney_lance=Blue Tourney Lance", "red_tourney_lance=Red Tourney Lance", "gold_tourney_lance=Gold Tourney Lance",
                                                           "rose_tourney_lance=Rose Tourney Lance"], note="lancers"),
    S("Lances", "Lances for Lancers - 6.glb", "lance", 1, ["blue_jousting_lance=Blue Jousting Lance", "red_jousting_lance=Red Jousting Lance",
                                                           "gold_jousting_lance=Gold Jousting Lance", "green_jousting_lance=Green Jousting Lance"], note="lancers"),
    S("Daggers", "Daggers for Stabbing - 1.glb", "dagger", 2, ["voidfang_dagger=Voidfang Dagger", "sunspike_dagger=Sunspike Dagger", "venom_dagger=Venom Dagger",
                                                               "frostbite_dagger=Frostbite Dagger", "bloodletter=Bloodletter", "steel_dirk=Steel Dirk",
                                                               "crescent_dagger=Crescent Dagger", "bone_dagger=Bone Dagger"]),
    S("Daggers", "Daggers for Stabbing - 2.glb", "dagger", 2, ["whitegem_dagger=Whitegem Dagger", "rubyfang_dagger=Rubyfang Dagger", "serpent_dagger=Serpent Dagger",
                                                               "icicle_dagger=Icicle Dagger", "voidtwist_dagger=Voidtwist Dagger", "sunflare_dagger=Sunflare Dagger",
                                                               "horned_dagger=Horned Dagger", "frostcurve_dagger=Frostcurve Dagger"]),
    S("Bows", "Bows 1.glb", "bow", 1, ["hunting_bow=Hunting Bow", "recurve_bow=Recurve Bow", "leafwing_bow=Leafwing Bow", "ironbound_bow=Ironbound Bow", "bonewrap_bow=Bonewrap Bow"]),
    S("Bows", "Bows 2.glb", "bow", 0, ["longbow=Longbow", "blackwood_bow=Blackwood Bow", "ashwood_bow=Ashwood Bow", "bone_bow=Bone Bow", "yew_bow=Yew Bow"]),
    S("Bows", "Bows 3.glb", "bow", 3, ["blossom_bow=Blossom Bow", "frostshard_bow=Frostshard Bow", "sunmoon_bow=Sunmoon Bow", "nightshade_bow=Nightshade Bow",
                                       "dragonwing_bow=Dragonwing Bow"]),
    S("Bows", "Bows 4.glb", "bow", 3, ["seraph_bow=Seraph Bow", "voidthorn_bow=Voidthorn Bow", "emerald_bow=Emerald Bow", "frostfeather_bow=Frostfeather Bow",
                                       "cinder_bow=Cinder Bow"]),
    S("Boomerangs", "Boomerangs - 1.glb", "boomerang", 3, ["lion_boomerang=Lion Boomerang", "frost_boomerang=Frost Boomerang", "fire_boomerang=Fire Boomerang",
                                                           "verdant_boomerang=Verdant Boomerang"], rows=2),
    S("Boomerangs", "Boomerangs - 2.glb", "boomerang", 3, ["sun_boomerang=Sun Boomerang", "blood_boomerang=Blood Boomerang", "ice_boomerang=Ice Boomerang",
                                                           "vine_boomerang=Vine Boomerang"], rows=2),
    S("Boomerangs", "Boomerangs - 3.glb", "boomerang", 2, ["gold_lion_boomerang=Gold Lion Boomerang", "black_thorn_boomerang=Black Thorn Boomerang",
                                                           "bronze_leaf_boomerang=Bronze Leaf Boomerang", "crystal_boomerang=Crystal Boomerang"], rows=2),
    S("Boomerangs", "Boomerangs - 4.glb", "boomerang", 0, ["wooden_boomerang=Wooden Boomerang", "brass_boomerang=Brass Boomerang", "spiked_boomerang=Spiked Boomerang",
                                                           "blue_boomerang=Blue Boomerang"], rows=2),
    S("Axes", "1 Handed Axes 1.glb", "axe", 3, ["frost_axe=Frost Axe", "ember_axe=Ember Axe", "thornwood_axe=Thornwood Axe", "sunsteel_axe=Sunsteel Axe"], rows=2),
    S("Axes", "1 Handed Axes 2.glb", "axe", 2, ["magma_axe=Magma Axe", "gilded_axe=Gilded Axe", "rime_axe=Rime Axe", "moss_axe=Moss Axe", "bone_axe=Bone Axe",
                                                "sapphire_axe=Sapphire Axe", "butcher_axe=Butcher Axe", "voidmoon_axe=Voidmoon Axe"], rows=2),
    S("Axes", "1 Handed Axes 3.glb", "axe", 2, ["horned_axe=Horned Axe", "bluegem_axe=Bluegem Axe", "flame_axe=Flame Axe", "vine_axe=Vine Axe", "icespine_axe=Icespine Axe",
                                                "deathskull_axe=Deathskull Axe", "hammer_axe=Hammer Axe", "rust_axe=Rust Axe"], rows=2),
    S("Axes", "1 Handed Axes 4.glb", "axe", 0, ["bearded_axe=Bearded Axe", "hatchet=Hatchet", "spiked_axe=Spiked Axe", "blue_grip_axe=Blue Grip Axe", "broad_axe=Broad Axe",
                                                "iron_hatchet=Iron Hatchet", "horned_hatchet=Horned Hatchet", "green_grip_axe=Green Grip Axe"], rows=2),
    S("Axes", "2 Handed Axes 1.glb", "great_axe", 3, ["inferno_greataxe=Inferno Greataxe", "glacier_greataxe=Glacier Greataxe", "wildwood_greataxe=Wildwood Greataxe",
                                                      "solar_greataxe=Solar Greataxe"]),
    S("Axes", "2 Handed Axes 2.glb", "great_axe", 0, ["iron_greataxe=Iron Greataxe", "brass_greataxe=Brass Greataxe", "black_greataxe=Black Greataxe",
                                                      "blood_greataxe=Blood Greataxe"]),
]


def sheet_path(sheet):
    return os.path.join(SOURCE, sheet["folder"], sheet["file"])
