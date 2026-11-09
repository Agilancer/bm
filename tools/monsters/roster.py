"""Every new Tripo monster: where it comes from, what it is, how tall it stands, and which moves it gets.

Humanoids (Mixamo rigs) borrow Pretty Lisandra's clips (assets/game/lisandra/pretty.glb) by family; beasts get clips made
for them in beasts.py. A clip entry is  game name: (Lisandra clip, start s, end s or None).  Long Tripo clips repeat
themselves, so most are cut to one telling of the move.
"""
import os

SRC = "F:/!    BM V2/!  GENERATED TRIPO MONSTERS"
HERE = os.path.dirname(os.path.abspath(__file__))
FIXED = os.path.join(os.path.dirname(HERE), "build", "monsters", "src")   # beak fixes, new rigs

POUNCE = 'Pounce on an enemy violently attacking them'
CLAW = 'the character violently attacks scratches at something in front'
ROAR = 'intimidating roar'
TWO_HAND = 'The character is holding a large 2 handed weapon, ready to swin'
CLEAVER = 'Overhand cleaver downward chop motion with cleaver with left ha'
POWER = "Make the character swing his arms like he's casting a very powe"
FANCY = '2 handed fancy spell casting with waving arms.'

# (clip, start, end, playback rate). Windows are where the source clip's motion is (measured by joint speed): the
# roar's scream is at 4-7 s, the pounce's leap at 0.6-2.8 s. "They run on all fours" has no motion at all: never use it.
COMMON = {
    'hit': ('hit_to_body_01', 0, None), 'hit2': ('hit_to_head', 0, None),
    'death': ('Death01', 0, None), 'death2': ('defeat_03', 0, None), 'jump': ('jump', 0, None),
    'roar': (ROAR, 4.0, 7.2),
}
P_POUNCE = (POUNCE, 0.6, 2.8)
P_CLAW = (CLAW, 0, 2.0)
P_TWO = (TWO_HAND, 0.25, 2.8)

SETS = {
    'feral': {   # goblins, dragonlings, the werewolf: low, quick, mean, they scurry
        'idle': ('Crouch_Idle_Loop', 0, None), 'idle2': ('look_around', 0, 5.0), 'idle3': ('angry_03', 0, None),
        'walk': ('Crouch_Fwd_Loop', 0, None), 'walk2': ('swagger', 0, None),
        'run': ('run', 0, None, 1.1), 'run2': ('Sprint_Loop', 0, None), 'run3': ('Crouch_Fwd_Loop', 0, None, 1.9),
        'atk1': ('slash', 0.3, 3.0), 'atk2': (CLEAVER, 0, 3.0), 'atk3': ('Sword_Dash', 0, None),
        'atk4': ('Zombie_Scratch', 0, None, 1.3), 'atk5': P_POUNCE,
    },
    'kobold': {   # kobolds: springy, darting, spear throwers
        'idle': ('Crouch_Idle_Loop', 0, None, 1.3), 'idle2': ('look_around', 0, 5.0), 'idle3': ('angry_01', 0, None),
        'walk': ('Crouch_Fwd_Loop', 0, None, 1.3), 'walk2': ('Walk_Loop', 0, None),
        'run': ('Sprint_Loop', 0, None), 'run2': ('flee_01', 0, None), 'run3': ('Jog_Fwd_Loop', 0, None),
        'atk1': ('Sword_Attack', 0, None, 0.85), 'atk2': ('OverhandThrow', 0, None), 'atk3': ('Melee_Hook', 0, None, 0.4),
        'atk4': P_POUNCE, 'atk5': ('front_kick_02', 0, None),
    },
    'shambler': {   # the possessed and the dead children: lurching, grabbing
        'idle': ('Zombie_Idle_Loop', 0, None), 'idle2': ('freaky', 0, None), 'idle3': ('sob', 0, 5.6),
        'walk': ('Zombie_Walk_Fwd_Loop', 0, None), 'walk2': ('Intimidating walk', 0, 4.0),
        'run': ('run', 0, None, 0.95), 'run2': ('Zombie_Walk_Fwd_Loop', 0, None, 1.8), 'run3': ('Sprint_Loop', 0, None, 0.85),
        'atk1': ('slash', 0.3, 3.0, 1.1), 'atk2': ('Zombie_Scratch', 0, None, 1.2), 'atk3': ('dive', 0, 1.1, 0.9),
        'atk4': ('box_01', 0, None), 'atk5': ('Sword_Dash', 0, None, 0.9),
    },
    'brute': {   # giant plague zombies, the bone golem: everything slowed so the weight shows
        'idle': ('Idle_Loop', 0, None, 0.7), 'idle2': ('angry_01', 0, None, 0.7), 'idle3': ('angry_03', 0, None, 0.6),
        'walk': ('Walk_Loop', 0, None, 0.65), 'walk2': ('He takes very long strides', 0, 4.0, 0.75),
        'run': ('run', 0, None, 0.8), 'run2': ('Running', 0, 2.5, 0.75), 'run3': ('Jog_Fwd_Loop', 0, None, 0.65),
        'atk1': P_TWO + (0.75,), 'atk2': ('TreeChopping_Loop', 0, None, 0.5), 'atk3': ('Sword_Heavy_Combo', 0, None, 0.7),
        'atk4': ('Shield_Dash', 0, None, 0.6), 'atk5': ('front_kick_02', 0, None, 0.6),
        'roar': (ROAR, 4.0, 7.2, 0.8),
    },
    'caster': {   # necromancers
        'idle': ('Spell_Simple_Idle_Loop', 0, None), 'idle2': ('standing_relax', 0, 6.0), 'idle3': ('wait', 0, 6.0),
        'walk': ('Slow, proud walk with longer strides.', 0, 5.0), 'walk2': ('Walk_Formal_Loop', 0, None),
        'run': ('Jog_Fwd_Loop', 0, None), 'run2': ('flee_01', 0, None), 'run3': ('Intimidating walk', 0, 4.0),
        'atk1': ('cast_a_spell', 0.2, 3.0), 'atk2': ('Pointing at an enemy', 2.4, 4.6), 'atk3': ('OverhandThrow', 0, None),
        'atk4': ('Spell_Simple_Shoot', 0, None, 0.6), 'atk5': (POWER, 2.5, 5.0),
        'roar': ('Talking to someone angrily', 0.25, 3.0),
    },
    'knight': {   # Velscour's knights, lancer, plague knights, the giant skeleton knight
        'idle': ('Sword_Idle', 0, None), 'idle2': ('Idle_Loop', 0, None), 'idle3': ('look_around', 0, 5.0),
        'walk': ('Walk_Loop', 0, None), 'walk2': ('Intimidating walk', 0, 4.0),
        'run': ('Jog_Fwd_Loop', 0, None), 'run2': ('Sprint_Loop', 0, None), 'run3': ('proud run', 0, 2.5),
        'atk1': ('Sword_Attack', 0, None), 'atk2': ('Sword_Regular_C', 0, None), 'atk3': ('Sword_Heavy_Combo', 0, None),
        'atk4': ('Sword_Dash', 0, None), 'atk5': P_TWO, 'block': ('Idle_Shield_Loop', 0, None),
        'bash': ('Shield_OneShot', 0, None, 0.8),
    },
    'stalker': {   # mannequins and the night paralysis demons: still, then very fast
        'idle': ('standing_relax', 0, 5.0), 'idle2': ('freaky', 0, None, 0.6), 'idle3': ('look_around', 0, 5.0),
        'walk': ('Slow, proud walk with longer strides.', 0, 5.0), 'walk2': ('Crouch_Fwd_Loop', 0, None),
        'run': ('Sprint_Loop', 0, None, 1.1), 'run2': ('Crouch_Fwd_Loop', 0, None, 2.2), 'run3': ('Zombie_Walk_Fwd_Loop', 0, None, 2.0),
        'atk1': ('hug', 0, 2.8, 1.3), 'atk2': ('Sword_Dash', 0, None, 1.2), 'atk3': ('slash', 0.3, 3.0),
        'atk4': ('front_kick_02', 0, None), 'atk5': ('hug', 0, 2.8), 'climb': ('Climbing', 0, 4.0),
    },
    'flyer': {   # harpies and the werebat: wings beat on the swim strokes
        'idle': ('Idle_Loop', 0, None), 'idle2': ('Crouch_Idle_Loop', 0, None), 'idle3': ('look_around', 0, 5.0),
        'walk': ('Crouch_Fwd_Loop', 0, None), 'fly': ('Swim_Fwd_Loop', 0, None), 'fly2': ('swim', 0, 5.7),
        'run': ('Running', 0, 2.5), 'run2': ('Sprint_Loop', 0, None),
        'atk1': ('dive', 0, 1.35), 'atk2': ('slash', 0.3, 3.0), 'atk3': ('Zombie_Scratch', 0, None, 1.2),
        'atk4': ('front_kick_01', 0, None), 'atk5': ('slash', 0.3, 3.0), 'land': ('jump_down', 0, None),
    },
    'goat': {   # goat men: horn charges, hoof kicks, great axes overhead
        'idle': ('Idle_Loop', 0, None), 'idle2': ('look_around', 0, 5.0), 'idle3': ('angry_01', 0, None),
        'walk': ('Intimidating walk', 0, 4.0), 'walk2': ('swagger', 0, None),
        'run': ('Running', 0, 2.5), 'run2': ('Sprint_Loop', 0, None), 'run3': ('proud run', 0, 2.5),
        'atk1': P_TWO, 'atk2': ('Shield_Dash', 0, None, 0.8), 'atk3': ('Melee_Hook', 0, None, 0.45),
        'atk4': (CLEAVER, 0, 3.0), 'atk5': ('box_03', 0, None),
    },
}

# id, source file (in SRC unless the path is absolute), family, height in metres, extra
H = []


def add(id_, src, fam, height, **kw):
    H.append(dict(id=id_, src=src, family=fam, height=height, **kw))


for i, s in ((1, 'ZOMBIE CHILD - BOY 1l'), (2, 'ZOMBIE CHILD - BOY 2'), (3, 'ZOMBIE CHILD - BOY 3')):
    add(f'zombie_boy_{i}', s, 'shambler', 1.15, group='Dead Children')
for i in (1, 2):
    add(f'zombie_girl_{i}', f'ZOMBIE CHILD - GIRL {i}', 'shambler', 1.1, group='Dead Children')
for i in (1, 2):
    add(f'possessed_man_{i}', f'POSESSED VILLAGER - MAN {i}', 'shambler', 1.8, group='The Possessed')
    add(f'possessed_woman_{i}', f'POSESSED VILLAGER - WOMAN {i}', 'shambler', 1.7, group='The Possessed')
add('plague_giant_1', 'GIANT PLAGUE ZOMBIE 1', 'brute', 3.2, group='Plague Giants')
add('plague_giant_2', 'GIANT PLAGUE ZOMBIE 2', 'brute', 3.2, group='Plague Giants')
add('plague_giant_armored', 'GIANT PLAGUE ZOMBIE + ARMOR', 'brute', 3.4, group='Plague Giants')
add('bone_golem', 'BONE GOLEM', 'brute', 3.6, group='Bone Giants')
add('skeleton_knight_giant', 'GIANT SKELETON KNIGHT', 'knight', 3.6, group='Bone Giants', weapon='greatsword', rate=0.75)
add('necromancer_2', 'NECROMANCER 2', 'caster', 1.9, group='Necromancers')
add('necromancer_3', 'NECROMANCER 3', 'caster', 1.9, group='Necromancers')
add('necromancer_lord', 'NECROMANCER LORD', 'caster', 2.2, group='Necromancers')
add('necromancer_lord_2', 'NECROMANCER LORD 2', 'caster', 2.2, group='Necromancers')
add('necromancer_f1', 'FEMALE NECROMANCER', 'caster', 1.8, group='Necromancers')
add('necromancer_f2', 'FEMALE NECROMANCER 2', 'caster', 1.8, group='Necromancers')
add('velscour_knight_1', 'VELSCOUR KNIGHT - MALEl', 'knight', 2.05, group="Velscour's Knights", weapon='sword')
add('velscour_knight_2', 'VELSCOUR KNIGHT 2 - MALEl', 'knight', 2.05, group="Velscour's Knights", weapon='sword')
add('velscour_lancer', 'VELSCOUR LANCER - MALE', 'knight', 2.05, group="Velscour's Knights", weapon='lance')
add('plague_knight_black', os.path.join(FIXED, 'PLAGUE KNIGHT - BLACK.glb'), 'knight', 1.95, group='Plague Knights', weapon='sword')
add('plague_knight_red', os.path.join(FIXED, 'PLAGUE KNIGHT - RED.glb'), 'knight', 1.95, group='Plague Knights', weapon='sword')
for c in ('GREEN', 'RED'):
    for i in (1, 2, 3):
        add(f'goblin_{c.lower()}_{i}', f'GOBLIN - {c} - {i}', 'feral', 1.25, group='Goblins')
    for i in (1, 2):
        add(f'goblin_{c.lower()}_armored_{i}', f'GOBLIN - {c} - ARMORED - {i}', 'feral', 1.3, group='Goblins')
add('kobold_1', 'KOBOLD 1', 'kobold', 1.35, group='Kobolds')
add('kobold_3', 'KOBOLD 3', 'kobold', 1.35, group='Kobolds')
add('kobold_armored_1', 'KOBOLD - ARMORED - 1', 'kobold', 1.4, group='Kobolds')
add('kobold_armored_2', 'KOBOLD - ARMORED - 2', 'kobold', 1.4, group='Kobolds')
add('kobold_armored_3', os.path.join(FIXED, 'KOBOLD - ARMORED - 3.glb'), 'kobold', 1.4, group='Kobolds')
add('harpy_queen', 'HARPY - QUEEN 1', 'flyer', 2.0, group='Harpies', wings=True)
add('harpy_warrior', 'HARPY - WARRIOR', 'flyer', 1.85, group='Harpies', wings=True)
add('harpy_undead_1', 'HARPY - UNDEAD 1', 'flyer', 1.8, group='Harpies', wings=True)
add('harpy_undead_2', 'HARPY - UNDEAD 2', 'flyer', 1.8, group='Harpies', wings=True)
add('werebat', 'WEREBAT', 'flyer', 2.1, group='Harpies')
add('dragonling_black', 'DRAGONLING - BLACK', 'feral', 1.6, group='Dragonlings', breath='fire')
add('dragonling_undead', 'DRAGONLING - UNDEAD', 'feral', 1.6, group='Dragonlings', breath='rot')
add('mannequin_1', 'HAUNTED MANNEQUIN - 1', 'stalker', 1.75, group='Haunted Mannequins', stutter=7)
add('mannequin_2', 'HAUNTED MANNEQUIN - 2', 'stalker', 1.75, group='Haunted Mannequins', stutter=7)
add('mannequin_3', os.path.join(FIXED, 'HAUNTED MANNEQUIN - 3.glb'), 'stalker', 1.75, group='Haunted Mannequins', stutter=7)
for c in ('BLACK', 'BLUE', 'RED'):
    add(f'night_demon_{c.lower()}', os.path.join(FIXED, f'NIGHT PARALYSIS DEMON - {c}.glb'), 'stalker', 2.6,
        group='Night Paralysis Demons')
add('goatman_bw', 'GOAT MAN - BLACK AND WHITE - ALL THE ANIMATIONS', 'goat', 2.2, group='Goat Men')
add('goatman_gold_bad', 'GOAT MAN - GOLD BAD GOAT - JUST RUNNING', 'goat', 2.2, group='Goat Men')
add('goatman_gold_good', 'GOAT MAN - GOLD GOOD GOAT - JUST RUNNING', 'goat', 2.2, group='Goat Men')
add('goatman_white', 'GOAT MAN - WHITE GOAT - JUST RUNNING', 'goat', 2.2, group='Goat Men')
add('goatman_black', 'tripo_convert_620e7515-7a7f-400f-b6b7-d9b1179bee03', 'goat', 2.2, group='Goat Men')
# in the game already with its own clips that walk off (assets/monsters/new_creatures): rebuilt on the feral set
add('werewolf_brown', 'WEREWOLF BROWN', 'feral', 2.4, group='Werewolf')

# Beasts: own rigs (dragons) or rigs made here (spiders, worms). Clips come from beasts.py.
BEASTS = [
    dict(id='dragon_black', src='DRAGON - BLACK', kind='dragon', height=4.5, group='Dragons', breath='fire'),
    dict(id='dragon_green', src='DRAGON - GREEN', kind='dragon', height=4.5, group='Dragons', breath='poison'),
    dict(id='dragon_red', src='DRAGON - RED', kind='dragon', height=4.5, group='Dragons', breath='fire'),
    dict(id='dragon_undead', src='DRAGON - UNDEAD', kind='dragon', height=4.5, group='Dragons', breath='rot'),
    dict(id='spider_black', src='GIANT SPIDER - BLACK', kind='spider', height=1.3, group='Giant Spiders'),
    dict(id='spider_red', src='GIANT SPIDER - RED', kind='spider', height=1.3, group='Giant Spiders', tempo=1.3),
    dict(id='worm_1', src='GIANT WORM - 1', kind='worm', height=4.0, group='Giant Worms'),
    dict(id='worm_2', src='GIANT WORM - 2', kind='worm', height=4.0, group='Giant Worms'),
    # in the game already with a few faint clips (assets/monsters/new_creatures): rebuilt here with the spiders' set
    dict(id='flesh_spider_demon', src='FLESH SPIDER DEMON', kind='spider', height=1.7, group='Giant Spiders', tempo=0.8, noflip=True, reach=2.0),
]


def src_path(entry):
    s = entry['src']
    if entry.get('wings'):
        return os.path.join(FIXED, s + '.glb')   # wing bones added by wings.py
    return s if os.path.isabs(s) else os.path.join(SRC, s + '.glb')


# Flyers hang this high (times their height) during these moves; the viewer and the game ease toward it.
HOVER = {'idle': 0.55, 'fly': 1.0, 'fly2': 1.0, 'atk1': 0.0}


# One creature's own moves on top of its family's.
MOVES = {
    'werewolf_brown': {   # a beast, not a man: a long loping stride, a leap, claw rakes and a lunging bite
        'walk': ('Zombie_Walk_Fwd_Loop', 0, None, 1.1), 'walk2': ('Crouch_Fwd_Loop', 0, None, 0.9),
        'run': ('Sprint_Loop', 0, None, 0.85), 'run2': ('run', 0, None),
        'atk1': ('Sword_Dash', 0, None), 'atk2': ('Zombie_Scratch', 0, None, 1.3), 'atk3': ('Melee_Hook', 0, None, 0.45),
        'atk4': ('dive', 0, 1.35, 1.1), 'atk5': ('Sword_Dash', 0, None, 0.75),
    },
    'skeleton_knight_giant': {'atk2': ('Sword_Regular_Combo', 0, None), 'atk4': ('TreeChopping_Loop', 0, None, 0.6)},
    'werebat': {'atk1': ('dive', 0, 1.1), 'atk2': ('slash', 0.3, 1.8)},   # stop before the wings close over the body
    'dragonling_black': {'death': ('defeat_03', 0, None), 'death2': ('defeat_03', 0, None, 0.8)},   # a back-fall drives the tail spines up through the floor
    'dragonling_undead': {'death': ('defeat_03', 0, None), 'death2': ('defeat_03', 0, None, 0.8)},
    'goatman_bw': {'atk1': ('Sword_Attack', 0, None), 'atk4': ('Sword_Regular_C', 0, None)},   # axe in one hand, shield in the other
}
# Arms held out from the body all the time (degrees), so wing skin on the arms never folds through the chest.
SPREAD = {'werebat': 50, 'dragonling': 50}
# The finger bones are the wing's struts on these: fingers stay at rest (wings open) whatever the borrowed move does.
STILL_FINGERS = {'werebat', 'dragonling'}
# Arm swing pulled this far back toward the rest pose (wings open) on every move: borrowed arm swings cross the chest
# and wrap the wing skin round the body.
DAMP_ARMS = {'werebat': 0.6, 'dragonling': 0.6}
# Thin wing membranes are one sheet of triangles: draw both faces or the far wing shows bare struts from behind.
TWO_SIDED = ('werebat', 'harpy', 'dragon')
# Humanoid builds whose wing membrane (hung between arm and leg) tears: run the stretch cull after building.
# Value: how many times its rest length an edge may stretch before its triangle goes. Feathered wings stretch a lot
# between feathers and must keep them: only the extreme needles go there.
CULL = {'dragonling': 4.0, 'harpy': 12.0}
# Tails Tripo hung off both thighs: moved onto the hips so strides don't drag them forward between the feet.
TAILS = ('dragonling',)
# Colour maps Tripo baked too dark to read: gamma lift (below 1 brightens shadows and mids).
LIFT = {'dragonling_black': 0.75}
# Skirts and dresses: the cloth hangs off the hips, not the thighs, so a wide stance doesn't balloon it into a bell.
SKIRTS = ('possessed_woman', 'zombie_girl', 'mannequin')
# Bent forward over the hips on walks and runs (degrees through the spine), the head kept up: beasts that lope and
# things that scuttle, not upright human gaits.
# These stay bent on idles (half the angle) and attacks (full angle) too, so they never snap upright between moves.
HUNCH_ALL = {'werewolf_brown'}
HUNCH = {'werewolf_brown': 50, 'mannequin': 40, 'night_demon': 40, 'possessed': 18, 'zombie_child': 18}


def clips_for(family, id_=None):
    out = dict(COMMON)
    out.update(SETS[family])
    out.update(MOVES.get(id_, {}))
    if id_ and id_.startswith(SKIRTS) and out['atk1'][0] == 'slash':   # bent double, a skirt stands out like a sail
        out['atk1'] = ('Sword_Dash', 0, None, 1.0)
    if id_ and (arms_for(id_) or {}).get('left'):   # the cleaver chop swings the left hand: a shield arm must not
        out = {k: (('Sword_Regular_C', 0, None) if v[0] == CLEAVER else v) for k, v in out.items()}
    return out


# ---- What the armed ones carry. Right hand: weapons from assets/game/weapons (striking end +Y, origin at the butt);
# left hand: a shield. Nothing holy in a monster's hand: no suns, crosses, radiance or lions.
HOLY = ('sun', 'eclipse', 'solar', 'radiant', 'cross', 'lion', 'holy', 'dawn', 'star', 'fleur', 'laurel', 'world_tree', 'griffin', 'eagle')
DARK_KITES = ['kite_blackwyrm', 'kite_palewyrm', 'kite_spinedrake', 'kite_bloodthorn', 'kite_ironthorn',
              'kite_coiled_dragon', 'kite_cinderdrake']
CRUDE_KITES = ['kite_chevron', 'kite_ironthorn', 'kite_bloodthorn']
# Tower shields are Tessariel's and the lancers' (the owner's sheet names say so): no monster carries one.
# Swords: only the ones the owner marked for basic enemies and monsters, plus the dark rares for Velscour's knights.
# Spears: only the four pikes marked for enemies. Lances are for lancers: Velscour's lancer takes the dark ones.
# Necromancers carry the game's dark staffs (assets/game/items/<id>.glb, not in weapons.json).
NECRO_STAFFS = ['bloodsigil_staff', 'bonecrystal_staff', 'bonelantern_staff', 'death_staff', 'nightflame_staff',
                'skullhorn_staff', 'voidgaze_staff', 'wraith_staff']
DARK_SWORDS = ['dusk_sword', 'voidbolt_sword', 'bloodfire_sword', 'emberfang_sword']
DARK_LANCES = ['shadow_lance', 'black_dragon_lance', 'blood_lance', 'thorn_lance', 'violet_lance', 'dragon_lance']
_ARMS = [   # (id prefix, right-hand kinds or ids, left-hand shields)
    ('goblin_green_armored', ('sword', 'axe'), CRUDE_KITES),
    ('goblin_red_armored', ('sword', 'axe'), CRUDE_KITES),
    ('goblin_', ('dagger', 'axe', 'mace', 'spear'), None),
    ('kobold_armored', ('spear', 'mace'), CRUDE_KITES),
    ('kobold_', ('spear', 'dagger'), None),
    ('goatman_bw', ('axe',), CRUDE_KITES),
    ('goatman_', ('great_axe', 'great_mace'), None),
    ('velscour_lancer', DARK_LANCES, DARK_KITES),
    ('velscour_knight', ('sword', *DARK_SWORDS), DARK_KITES),
    ('plague_knight', ('mace', 'sword'), DARK_KITES),
    ('skeleton_knight_giant', ('sword', 'great_axe'), None),
    ('plague_giant_armored', ('great_mace',), None),
    ('necromancer', NECRO_STAFFS, None),
    ('bone_golem', ('great_mace', 'great_axe'), None),
]


def _allowed(k, v):
    note = v['note']
    if v['kind'] in ('tower', 'lance', 'bow', 'boomerang') or any(h in k for h in HOLY):
        return False
    if v['kind'] == 'sword':
        return 'monsters' in note
    if v['kind'] == 'spear':
        return 'enemies' in note
    return True


def arms_for(id_):
    """{'right': [weapon ids], 'left': [shield ids]}: the game or the viewer picks one of each per spawn."""
    import json
    w = json.load(open(os.path.join(os.path.dirname(os.path.dirname(HERE)), 'assets', 'game', 'weapons', 'weapons.json')))
    for pre, kinds, shields in _ARMS:
        if id_.startswith(pre):
            right = [k for k, v in w.items() if (v['kind'] in kinds and _allowed(k, v)) or k in kinds]
            right += [k for k in kinds if k not in w and k.endswith('_staff')]   # staffs live in assets/game/items
            out = {'right': right}
            if shields:
                out['left'] = shields
            return out
    return None
