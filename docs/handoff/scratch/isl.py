import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
for n in ['velscour_knight_1','velscour_knight_2','velscour_lancer','possessed_man_1','possessed_woman_1']:
    m=Model(f'{TRIPO}/{n}.glb'); me=m.mesh
    lab=me.islands(); P,N=m.posed()
    hw=m.weight_of('Head'); nw=m.weight_of('Neck')
    print(n,'islands',lab.max()+1,'head y',m.rest_world('Head')[1],'neck',m.rest_world('Neck')[1], 'headw>0.5 verts',(hw>0.5).sum())
    for l in range(lab.max()+1):
        s=lab==l
        if hw[s].mean()>0.05 or nw[s].mean()>0.2:
            # uv square
            uv=me.UV[s]
            print(f'  isl {l:3d} n={s.sum():5d} head={hw[s].mean():.2f} neck={nw[s].mean():.2f} y={P[s][:,1].min():.3f}..{P[s][:,1].max():.3f} x={P[s][:,0].min():.3f}..{P[s][:,0].max():.3f} z={P[s][:,2].min():.3f}..{P[s][:,2].max():.3f} uv={uv.min(0).round(3)}..{uv.max(0).round(3)}')
