import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
import os
HERE=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(HERE,'logo-original.png')
OUT=HERE+'/'
rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)/255
H,W,_ = rgb.shape
mx = rgb.max(2); mn = rgb.min(2)
S = (mx-mn)/(mx+1e-6); V = mx
base = S > 0.22
cut = np.full(W, 880)
for x in range(W):
    if base[850:885, x].any():
        y0 = 895
        cut[x] = y0 + int(np.argmin(V[y0:935, x])) + 1
yy = np.arange(H)[:,None]
mask = base & (yy <= cut[None,:])
mask = ndi.binary_fill_holes(mask)
mask = ndi.binary_opening(mask, iterations=1)
lab, n = ndi.label(mask)
sizes = ndi.sum(mask, lab, range(1,n+1))
order = np.argsort(sizes)[::-1]
keep = [i+1 for i in order[:3]]
print('components', n, 'top sizes', sizes[order[:5]])
mask = np.isin(lab, keep)
mask = ndi.binary_fill_holes(mask)
# soft alpha
alpha = ndi.gaussian_filter(mask.astype(np.float32), 0.9)
alpha = np.clip((alpha-0.15)/0.7, 0, 1)
ys,xs = np.where(alpha>0.01)
x0,x1,y0,y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
print('bbox', x0,x1,y0,y1)
rgba = np.dstack([rgb, alpha])
full = (rgba[y0:y1, x0:x1]*255).round().astype(np.uint8)
Image.fromarray(full, 'RGBA').save(OUT+'jl-logo.png', optimize=True)
# parts
lab2, n2 = ndi.label(alpha>0.01)
parts = {}
objs = ndi.find_objects(lab2)
comps = sorted([(sl[1].start, i+1, sl) for i,sl in enumerate(objs)], key=lambda t:t[0])
names = ['j','l','dot']
for name,(xs0, idx, sl) in zip(names, comps):
    sub = rgba[sl].copy()
    sub[...,3] *= (lab2[sl]==idx)
    im = (sub*255).round().astype(np.uint8)
    Image.fromarray(im,'RGBA').save(OUT+f'jl-{name}.png', optimize=True)
    parts[name] = dict(x=int(sl[1].start-x0), y=int(sl[0].start-y0), w=int(sl[1].stop-sl[1].start), h=int(sl[0].stop-sl[0].start))
parts['full'] = dict(w=int(x1-x0), h=int(y1-y0))
print(json.dumps(parts))
json.dump(parts, open(OUT+'jl-parts.json','w'), indent=1)
