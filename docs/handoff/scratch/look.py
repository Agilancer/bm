import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
ks=['velscour_knight_1','velscour_knight_2','velscour_lancer']
ps=['possessed_man_1','possessed_man_2','possessed_woman_1','possessed_woman_2']
body=[];heads=[]
for n in ks+ps:
    m=Model(f'{TRIPO}/{n}.glb')
    P,N=m.posed()
    body+= [draw(P,N,m.mesh,m.albedo,yaw=y,size=(300,400),light=2.2) for y in (0,180)]
    h=m.rest_world('Head')
    heads+=[draw(P,N,m.mesh,m.albedo,yaw=y,size=(300,300),centre=h+[0,0.05,0],span=0.3,light=2.2) for y in (0,60,180)]
sheet(body[:6]).save('k_body.png'); sheet(body[6:]).save('p_body.png')
sheet(heads[:9],3).save('k_heads.png'); sheet(heads[9:],6).save('p_heads.png')
