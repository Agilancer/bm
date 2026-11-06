import json,struct,io
import numpy as np
SRC="F:/!    BM V2/! TRIPO MODELS/FIRST PERSON MODELS/LEFT SHIELD ARM 2.glb"
def load(p=SRC):
    f=open(p,'rb');f.read(12)
    l,_=struct.unpack('<II',f.read(8));j=json.loads(f.read(l))
    l2,_=struct.unpack('<II',f.read(8));b=f.read(l2)
    return j,b
T={5126:'f4',5123:'u2',5121:'u1',5125:'u4'};C={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(j,b,i):
    a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];n=C[a['type']]
    return np.frombuffer(b,dtype='<'+T[a['componentType']],count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],n)
