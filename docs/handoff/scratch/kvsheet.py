from PIL import Image
ids=['velscour_knight_3','velscour_knight_4','velscour_knight_5','velscour_knight_6','velscour_lancer_2','velscour_lancer_3']
for k in (0,3):
    ims=[Image.open(f'{i}.png') for i in ids[k:k+3]]
    o=Image.new('RGB',(ims[0].width,400*3))
    for i,im in enumerate(ims): o.paste(im,(0,400*i))
    o.save(f'kv_{k}.png')
