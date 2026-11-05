import bpy,os
W=os.path.join(os.path.dirname(os.path.abspath(__file__)),'build');arm=bpy.data.objects['hydra_rig'];me=bpy.data.objects['hydra_mesh']
arm.animation_data.action=None
for pb in arm.pose.bones:
    pb.location=(0,0,0);pb.rotation_quaternion=(1,0,0,0);pb.scale=(1,1,1)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);me.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=os.path.join(W,'bone_hydra.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_def_bones=True,export_skins=True,export_yup=True,export_nla_strips=False,export_optimize_animation_size=False,export_image_format='JPEG',export_image_quality=90,export_tangents=False)
print(os.path.getsize(os.path.join(W,'bone_hydra.glb'))/1e6,'MB')
