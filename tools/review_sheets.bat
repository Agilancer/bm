@echo off
rem Lays the latest review shots out as contact sheets in tools\build\review.
cd /d "%~dp0.."
if not exist tools\build\review mkdir tools\build\review
set S=tools\build\review
python tools\sheet.py %S%\1_village.jpg 3 620 v1_road_in v2_over_the_square v3_inn_from_well v4_west_house_close v5_south_cottage v6_east_house v7_stall v8_far_view
python tools\sheet.py %S%\2_knights_at_rest.jpg 3 620 k1_black_front k2_black_back k3_black_side k1_silver_front k2_silver_back k3_silver_side
python tools\sheet.py %S%\3_knight_motion.jpg 4 465 m0_guard m1_circle_0 m1_circle_2 m1_circle_4 m2_roll_0 m2_roll_1 m2_roll_2 m2_roll_3 m2_roll_4 m2_roll_5 m2_roll_6 m2_roll_7 m3_a_0 m3_a_2 m3_a_4 m3_over_1 m3_over_3 m3_over_5 m3_dash_1 m3_dash_3 m3_dash_5 m3_bash_1 m3_bash_3 m3_bash_5
python tools\sheet.py %S%\3b_bent_joints.jpg 3 620 j_black_c_0 j_black_c_1 j_black_c_2 j_black_hook_0 j_black_hook_1 j_black_hook_2 j_black_over_0 j_black_over_1 j_black_over_2 j_silver_c_0 j_silver_c_1 j_silver_c_2 j_silver_hook_0 j_silver_hook_1 j_silver_hook_2 j_silver_over_0 j_silver_over_1 j_silver_over_2
python tools\sheet.py %S%\4_wounds.jpg 3 620 w1_black_gash w2_black_puncture_fresh w3_black_bleeding_4s w4_black_bleeding_wide w5_blood_on_ground_13s w6_black_bleeding_13s w7_silver_puncture f3_after_hits f0_guard_close
python tools\sheet.py %S%\5_first_person_swing.jpg 4 465 f1_swing_0 f1_swing_1 f1_swing_2 f1_swing_3 f1_swing_4 f1_swing_5 f1_swing_6 f1_swing_7 f2_wide_0 f2_wide_1 f2_wide_2 f2_wide_3 f2_wide_4 f2_wide_5 f2_wide_6 f2_wide_7
python tools\sheet.py %S%\6_crabs.jpg 4 465 c1_crab c2_attack_0 c2_attack_1 c2_attack_2 c2_attack_3 c2_attack_4 c2_attack_5 c2_attack_6 c2_attack_7 c3_fp_0 c3_fp_1
python tools\sheet.py %S%\9_gashes_at_fighting_range.jpg 2 930 e_real_fp e_real_0 e_real_1 e_real_close
