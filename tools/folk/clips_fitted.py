"""The clips' last pass, in Blender, after tools/folk/pack_clips.py and smith_clips.mjs (and rig_fit.py's jog_up / run_up):

    blender --background --factory-startup --python tools/folk/bg.py -- tools/folk/clips_fitted.py

- hands: the library clips' clenched fists and a few dead-straight hands given her walk's loose fingers (hands.bake_hands);
- the library's standing, talking and strolling clips stood up for the fitted bodies (src/folk/rig.js UPRIGHT): hips
  lifted, trunk straightened, feet brought in under the hips (it stands with them 30 cm apart, one 24 cm ahead).
Running it twice changes nothing the second time for the hands; the stood-up clips are packed again.
"""
print("hands:", h["bake_hands"]())
STAND = dict(dip=0.2, lean=0.3, plant=1.0, narrow=(0.45, 0.2))
WALK = dict(dip=0.35, lean=0.35, plant=1.0, narrow=(0.5, 1.0))
for c in ("idle_ual", "talk", "nod", "lantern", "water", "walk_ual", "walk_formal"):
    r, hh = RF["upright"](src=c, **(WALK if c.startswith("walk") else STAND))
    RF["add_clip"](c + "_up", r, hh, like=c)
m = RF["clips"]()["meta"]
print("stood up:", sorted(k for k in m["clips"] if k.endswith("_up") and "upright" in m["clips"][k].get("src", "")))
