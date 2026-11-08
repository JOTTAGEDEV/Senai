#!/usr/bin/env python3
"""
Trilha sonora + efeitos do reel JL Devs.
Tudo é sintetizado aqui (sem samples nem músicas de terceiros), então pode ser
usado livremente no Instagram. Gera audio.wav (48 kHz, estéreo, 44 s) já
sincronizado com as animações do index.html.

Uso: python3 music.py [saida.wav]
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 44.0
N = int(SR * DUR)
TAIL = SR * 4
rng = np.random.default_rng(2026)


# ---------------------------------------------------------------- utilidades
def T(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def _sos(kind, fc, order=2):
    return butter(order, fc, kind, fs=SR, output='sos')


def lp(x, fc, o=2):
    return sosfilt(_sos('low', fc, o), x)


def hp(x, fc, o=2):
    return sosfilt(_sos('high', fc, o), x)


def bp(x, lo, hi, o=2):
    return sosfilt(_sos('band', [lo, hi], o), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def pan2(v, pan):
    return np.vstack([v * np.sqrt(.5 * (1 - pan)), v * np.sqrt(.5 * (1 + pan))])


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N + TAIL))

    def add(self, sig, t0, g=1.0, pan=0.0):
        if sig.ndim == 1:
            sig = pan2(sig, pan)
        i = int(round(t0 * SR))
        if i < 0:
            sig, i = sig[:, -i:], 0
        n = min(sig.shape[1], self.x.shape[1] - i)
        if n > 0:
            self.x[:, i:i + n] += sig[:, :n] * g


def saw(f, t, fmax=6000, phase=0.0):
    """dente-de-serra limitada em banda (sem aliasing)"""
    out = np.zeros_like(t)
    for k in range(1, max(1, int(fmax / f)) + 1):
        out += np.sin(2 * np.pi * k * f * t + k * phase) / k
    return out * (2 / np.pi)


# ---------------------------------------------------------------- bateria
def kick(d=.42):
    t = T(d)
    f = 46 + 125 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = hp(noise(d), 2500) * np.exp(-t * 400) * .3
    return np.tanh(1.6 * (body + click)) * .9


def clap(d=.35):
    t = T(d)
    env = np.zeros_like(t)
    for o in (0, .011, .023):
        m = t >= o
        env[m] += np.exp(-(t[m] - o) * 140)
    env += .55 * np.exp(-np.maximum(t - .023, 0) * 16) * (t >= .023)
    return bp(noise(d), 900, 3400) * env * .55


def hat(open_=False):
    d = .32 if open_ else .07
    t = T(d)
    return hp(noise(d), 7500, 3) * np.exp(-t * (11 if open_ else 70)) * .33


def snare(d=.2):
    t = T(d)
    return np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .45 + bp(noise(d), 1200, 7500) * np.exp(-t * 22) * .6


def crash(d=2.6):
    t = T(d)
    n = hp(noise(d), 4200, 2) * np.exp(-t * 1.9)
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (3120, 4370, 5590, 6830)) * np.exp(-t * 3) * .05
    return np.vstack([n * .32 + ring, hp(noise(d), 4200, 2) * np.exp(-t * 1.9) * .32 + ring])


# ---------------------------------------------------------------- sintetizadores
def bass_note(m, d):
    t = T(d)
    f = mtof(m)
    env = np.minimum(1, t / .004) * (.55 + .45 * np.exp(-t * 9)) * np.clip((d - t) / .03, 0, 1)
    return (np.sin(2 * np.pi * f * t) * .85 + lp(saw(2 * f, t, 3000), 850) * .38) * env


def pad_chord(notes, d, bright=2400):
    t = T(d)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for m in notes:
        for det, p in ((-8, -.7), (0, 0), (8, .7)):
            v = saw(mtof(m) * 2 ** (det / 1200), t, 3200, rng.uniform(0, 6))
            L += v * np.sqrt(.5 * (1 - p))
            R += v * np.sqrt(.5 * (1 + p))
    env = np.minimum(1, t / .32) * np.clip((d - t) / .45, 0, 1)
    return np.vstack([lp(L, bright), lp(R, bright)]) * env * .055


def gtone(m, d=.55, idx=2.2, ratio=3.5, dec=7.0):
    """tom de 'vidro' (FM) usado no arpejo e nos efeitos"""
    t = T(d)
    f = mtof(m) if m < 200 else m
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t * 14)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * dec) * np.minimum(1, t / .002)


# ---------------------------------------------------------------- efeitos
def boom(d=2.0):
    t = T(d)
    f = 36 + 52 * np.exp(-t * 8)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4) + lp(noise(d), 380) * np.exp(-t * 9) * .55
    return np.tanh(v * 1.4) * .75


def thud(f0=150, f1=70, dec=18):
    t = T(.35)
    f = f1 + (f0 - f1) * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * dec) * .55


def clink(f0=2200, d=1.0):
    """impacto de vidro: parciais inarmônicos + transiente"""
    t = T(d)
    v = np.zeros_like(t)
    for r, dk, a in zip((1, 2.32, 4.25, 6.63), (5.5, 8, 13, 19), (1, .55, .32, .18)):
        v += a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 6)) * np.exp(-t * dk)
    tr = hp(noise(.02), 3000) * np.exp(-T(.02) * 280) * .5
    v[:len(tr)] += tr
    return v * np.minimum(1, t / .0008) * .2


def pop(f0=480, f1=1250, g=1.0):
    t = T(.13)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 55))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 36) * np.minimum(1, t / .002) * .32 * g


def click():
    t = T(.035)
    return np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 230) * .22 + hp(noise(.035), 3000) * np.exp(-t * 520) * .22


def tick(f=3600):
    t = T(.02)
    return bp(noise(.02), f * .7, min(f * 1.7, 20000)) * np.exp(-t * 650) * .2


def ding(f=1318.5, d=1.0):
    t = T(d)
    v = (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
         + .2 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 7))
    return v * np.exp(-t * 4.5) * np.minimum(1, t / .003) * .15


def chime(notes=(76, 83, 88)):
    out = np.zeros(int(1.3 * SR))
    for k, m in enumerate(notes):
        v = gtone(m, .9, 1.6, 3.0, 5.5) * .2
        i = int(k * .075 * SR)
        out[i:i + len(v)] += v
    return out


def shimmer(d=.8, n=24):
    out = np.zeros((2, int((d + .6) * SR)))
    for k in range(n):
        st = d * k / n + rng.uniform(0, .03)
        v = np.sin(2 * np.pi * rng.uniform(2800, 7800) * T(.45)) * np.exp(-T(.45) * 12) * np.minimum(1, T(.45) / .002)
        v *= np.sin(np.pi * (k + .5) / n)
        i = int(st * SR)
        out[:, i:i + len(v)] += pan2(v, rng.uniform(-.8, .8))
    return out * .05


def whoosh(d=.72, peak=.5, lo=250, hi=6000, pan_from=.85, pan_to=-.85):
    t = T(d)
    x = t / d
    n = noise(d)
    v = bp(n, lo, lo * 3) * (1 - x) + bp(n, lo * 3, hi * .6) * np.sin(np.pi * x) + bp(n, hi * .6, hi) * x
    env = np.where(x < peak, (x / peak) ** 2, np.exp(-(x - peak) * d * 9))
    v = v * env
    p = pan_from + (pan_to - pan_from) * x
    return np.vstack([v * np.sqrt(.5 * (1 - p)), v * np.sqrt(.5 * (1 + p))]) * .55


def riser(d=1.4):
    t = T(d)
    x = t / d
    n = noise(d)
    v = lp(n, 1200) * (1 - x) + hp(n, 2200) * x
    f = 180 * 2 ** (x * 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) * .22 + np.sin(2 * ph) * .08
    return (v * .45 + tone) * x ** 2.2 * .55


# ---------------------------------------------------------------- arranjo
drums, bassb, pads, plk, sfx, send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

BAR0 = -0.5  # compasso de 2 s (120 BPM); a "virada" cai em 7,5 s
CH = [[55, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [57, 60, 65, 69]]  # C G Am F
RT = [36, 31, 33, 29]

INTRO_END, BREAK, CTA, OUTRO = 7.5, (34.0, 37.5), 37.5, 41.5
GAPS = [(7.28, 7.5), (37.36, 37.5)]


def in_gap(t):
    return any(a <= t < b for a, b in GAPS)


def full(t):
    return INTRO_END <= t < BREAK[0] or CTA <= t < OUTRO


kicks = []
for k in range(0, 23):
    b0 = BAR0 + 2 * k
    chord, root = CH[k % 4], RT[k % 4]
    if b0 < OUTRO:
        pads.add(pad_chord(chord, 2.45, 950 if b0 < INTRO_END else 2600), b0, .85 if b0 < INTRO_END else 1.0)
    for beat in range(4):
        tb = b0 + beat * .5
        if tb < 0 or tb >= OUTRO or in_gap(tb):
            continue
        if tb < INTRO_END:                       # gancho/problema: batida abafada
            if tb < 6.5:
                drums.add(lp(kick(), 380), tb, .7)
                kicks.append(tb)
            if tb >= 3.0 and tb < 6.5:
                drums.add(hat(), tb + .25, .35)
        elif full(tb):                           # parte principal
            drums.add(kick(), tb, .9)
            kicks.append(tb)
            if beat in (1, 3):
                drums.add(clap(), tb, .5)
                send.add(clap(), tb, .12)
            drums.add(hat(True), tb + .25, .2, .2)
            for s in (0, .125, .375):
                drums.add(hat(), tb + s, .1 if s else .06, -.25)
        # baixo (colcheias)
        for e in range(2):
            te = tb + e * .25
            if in_gap(te) or te >= OUTRO:
                continue
            octv = 12 if (beat * 2 + e) in (2, 6) else 0
            if tb < INTRO_END:
                if 3.0 <= te < 6.75:
                    bassb.add(lp(bass_note(root + octv, .22), 320), te, .55)
            elif full(te):
                bassb.add(bass_note(root + octv, .23), te, .55 if e == 0 else .8)
        # arpejo de vidro (semicolcheias) durante os exemplos e o CTA
        if (11.5 <= tb < BREAK[1]) or (CTA <= tb < OUTRO):
            pat = [0, 1, 2, 3, 2, 1, 2, 3]
            for s in range(4):
                ts = tb + s * .125
                if in_gap(ts):
                    continue
                m = chord[pat[(beat * 4 + s) % 8]] + 12
                g = .33 if (BREAK[0] <= ts < BREAK[1]) else .42
                v = gtone(m, .5, 1.4, 2.0, 9.0)
                plk.add(v, ts, g, pan=[-.35, .35][s % 2])

# viradas de caixa antes das quedas
for a, b in ((6.5, 7.28), (36.4, 37.36)):
    n = 16
    for i in range(n):
        x = i / n
        drums.add(snare(), a + (b - a) * (x ** .85), .18 + .5 * x)

# compressão lateral (efeito "pump")
sc = np.ones(N + TAIL)
for tk in kicks:
    i = int(tk * SR)
    L = int(.32 * SR)
    seg = 1 - .55 * np.exp(-np.arange(L) / SR / .09)
    j = min(i + L, len(sc))
    sc[i:j] = np.minimum(sc[i:j], seg[:j - i])
bassb.x *= sc
pads.x *= sc
plk.x *= (.6 + .4 * sc)

# ---------------------------------------------------------------- efeitos (sincronizados)
# cena 1 · gancho
sfx.add(boom(1.8), 0.0, .9)
drums.add(crash(), 0.0, .38)
sfx.add(shimmer(.6), .02, .8)
for i, t in enumerate((.55, .70, .85, 1.0)):
    sfx.add(pop(430 + 70 * i, 1100 + 140 * i), t, .9, (-.5, .5, -.4, .4)[i])
sfx.add(whoosh(.45, .85, 300, 7000, -.2, .2), 2.6, .65)
# cena 2 · problema (notificações empilhando)
for i, t in enumerate((3.6, 3.95, 4.3, 4.65)):
    sfx.add(ding((1568, 1319, 1760, 1175)[i]), t, .95, (-.3, .3, -.2, .2)[i])
    sfx.add(thud(), t, .7)
sfx.add(whoosh(.5, .4, 300, 5000, .6, -.6), 5.62, .8)
sfx.add(shimmer(.7), 6.0, .9)
sfx.add(riser(1.25), 6.03, .9)
# cena 3 · marca (letras de vidro caindo)
sfx.add(boom(2.2), 7.5, 1.0)
drums.add(crash(), 7.5, .45)
for t, f, g, p in ((8.025, 1950, 1.0, -.35), (8.175, 2150, .95, .0), (8.31, 1950, .3, -.35), (8.46, 2150, .28, 0),
                   (8.357, 2950, .85, .45), (8.794, 3050, .5, .45), (9.03, 3100, .22, .45)):
    sfx.add(clink(f), t, g, p)
for t in (8.025, 8.175):
    sfx.add(thud(220, 90, 26), t, .45)
sfx.add(shimmer(.9), 9.0, .75)
for i, t in enumerate((9.12, 9.30, 9.48)):
    sfx.add(pop(520 + 60 * i, 1250 + 130 * i), t, .7, (-.4, 0, .4)[i])
# transições (lâmina de vidro: direita → esquerda)
for t in (11.14, 18.64, 26.14, 33.64):
    sfx.add(whoosh(), t, 1.0)
for t in (11.5, 19.0, 26.5):
    drums.add(crash(1.6), t, .22)
# cena 4 · hamburgueria
sfx.add(whoosh(.6, .45, 200, 3000, 0, 0), 11.82, .35)
sfx.add(whoosh(.4, .5, 400, 5000, -.6, -.2), 12.48, .25)
sfx.add(whoosh(.4, .5, 400, 5000, .6, .2), 12.83, .25)
for t, f0, f1 in ((13.5, 620, 1500), (14.25, 700, 1650)):
    sfx.add(click(), t, .9, .25)
    sfx.add(pop(f0, f1), t + .07, .85, .25)
sfx.add(whoosh(.35, .6, 400, 4000, 0, 0), 14.47, .25)
sfx.add(click(), 15.12, .9)
sfx.add(chime((76, 81, 88)), 15.6, 1.0)
sfx.add(ding(1568), 16.13, .9, -.4)
sfx.add(pop(600, 1400), 16.63, .8, .4)
sfx.add(pop(500, 1300), 17.12, .8, .3)
sfx.add(shimmer(.5), 17.15, .5)
# cena 5 · carros
sfx.add(whoosh(.6, .45, 200, 3000, 0, 0), 19.32, .35)
sfx.add(click(), 20.95, .9, -.4)
sfx.add(pop(450, 1100), 21.18, .6)
for k in range(12):
    sfx.add(tick(rng.uniform(2800, 4200)), 21.45 + (k + .5) * .5 / 12, .55, rng.uniform(-.2, .2))
for k in range(15):
    sfx.add(tick(rng.uniform(2800, 4200)), 22.05 + (k + .5) * .55 / 15, .55, rng.uniform(-.2, .2))
sfx.add(click(), 22.7, .9)
sfx.add(chime((79, 84)), 22.84, .7)
for i, (t, m) in enumerate(((23.38, 81), (23.73, 84), (24.08, 88), (24.43, 93))):
    sfx.add(gtone(m, .8, 2.0, 3.5, 6.0) * .22, t, 1.0, (-.6, -.2, .2, .6)[i])
sfx.add(pop(600, 1400), 24.18, .7, .4)
sfx.add(pop(480, 1250), 24.78, .9)
sfx.add(shimmer(.5), 24.8, .55)
# cena 6 · empresários
sfx.add(whoosh(.6, .45, 200, 3000, 0, 0), 26.82, .35)
nt = 22
for i in range(1, nt + 1):
    p = 1 - (1 - i / nt) ** (1 / 3)
    sfx.add(tick(5200), 27.3 + 1.5 * p, .45, rng.uniform(-.3, .3))
sfx.add(whoosh(.4, .6, 300, 4000, -.3, .3), 28.78, .3)
for i, t in enumerate((29.7, 30.1, 30.5)):
    sfx.add(click(), t, .85, .55)
    sfx.add(gtone((84, 88, 91)[i], .5, 1.2, 2.0, 9) * .2, t + .06, 1.0, .5)
sfx.add(ding(1760), 31.27, .85, .3)
# cena 7 · benefícios (pancadas)
for i, t in enumerate((34.33, 34.68, 35.03)):
    drums.add(kick(), t, .95)
    drums.add(clap(), t, .4)
    sfx.add(thud(160, 55, 9), t, .6)
    sfx.add(clink((2100, 2350, 2640)[i]), t, .35, (-.3, 0, .3)[i])
    bassb.add(bass_note(RT[0] + (0, 7, 12)[i], .45), t, .7)
sfx.add(shimmer(.7), 35.65, .7)
sfx.add(riser(1.3), 36.06, .9)
# cena 8 · CTA
sfx.add(boom(2.2), 37.5, 1.0)
drums.add(crash(), 37.5, .45)
for t, f, g, p in ((38.025, 1950, .95, -.35), (38.155, 2150, .9, 0), (38.31, 1950, .28, -.35), (38.44, 2150, .26, 0),
                   (38.317, 2950, .8, .45), (38.754, 3050, .45, .45), (39.03, 3100, .2, .45)):
    sfx.add(clink(f), t, g, p)
for t in (38.025, 38.155):
    sfx.add(thud(220, 90, 26), t, .4)
sfx.add(shimmer(.9), 38.95, .7)
sfx.add(pop(380, 1050), 39.28, 1.0)
sfx.add(click(), 40.55, .9, .3)
sfx.add(chime((84, 88, 91, 96)), 40.6, .9)
sfx.add(shimmer(.6), 40.62, .6)
# final
sfx.add(boom(2.6), OUTRO, .85)
drums.add(crash(3.0), OUTRO, .5)
pads.add(pad_chord(CH[0], 2.5, 2200), OUTRO, 1.15)
sfx.add(gtone(72, 2.2, 1.6, 3.5, 2.2) * .22, OUTRO, 1.0, -.3)
sfx.add(gtone(79, 2.2, 1.6, 3.5, 2.4) * .18, OUTRO + .02, 1.0, .3)
sfx.add(gtone(88, 2.0, 1.6, 3.5, 2.8) * .14, OUTRO + .04, 1.0)

# ---------------------------------------------------------------- reverb + mix
def make_ir(d=2.2, dec=3.1):
    t = T(d)
    pre = np.zeros(int(.018 * SR))
    L = np.concatenate([pre, lp(noise(d) * np.exp(-t * dec), 6500)])
    R = np.concatenate([pre, lp(noise(d) * np.exp(-t * dec), 6500)])
    nrm = np.sqrt(np.sum(L ** 2))
    return L / nrm, R / nrm


ir = make_ir()
send.x += pads.x * .35 + plk.x * .55 + sfx.x * .3
send.x = hp(send.x, 250)
wet = np.vstack([fftconvolve(send.x[0], ir[0])[:send.x.shape[1]], fftconvolve(send.x[1], ir[1])[:send.x.shape[1]]])

# eco pingue-pongue no arpejo
D = int(.375 * SR)
echo = np.zeros_like(plk.x)
for k in range(1, 5):
    src = (plk.x[0] + plk.x[1]) * .5
    sh = np.zeros_like(src)
    sh[D * k:] = src[:-D * k]
    echo[k % 2] += lp(sh, 4500) * (.38 ** k)

mix = (drums.x * 1.0 + bassb.x * .95 + pads.x * .95 + (plk.x + echo) * .8 + sfx.x * 1.0 + wet * .5)[:, :N]
mix = hp(mix, 28)

# compressor simples + saturação suave
env = np.sqrt(np.maximum(lp(np.mean(mix ** 2, axis=0), 12), 0))
thr = .22
gain = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** .3, 1.0)
mix = mix * gain
mix /= np.percentile(np.abs(mix), 99.95)  # nível antes da saturação: só os picos raros encostam em 1
over = np.mean(np.abs(mix) > 1) * 100
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 10 ** (-1.0 / 20) / np.max(np.abs(mix))  # pico -1 dBFS
print(f'amostras saturando: {over:.3f}%')

# fades de entrada/saída
fi = int(.01 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi)
fo_start = int(42.6 * SR)
mix[:, fo_start:] *= np.linspace(1, 0, N - fo_start) ** 1.6

rms = np.sqrt(np.mean(mix ** 2))
print(f'pico {20*np.log10(np.max(np.abs(mix))):.1f} dBFS · RMS {20*np.log10(rms):.1f} dBFS')

out = sys.argv[1] if len(sys.argv) > 1 else 'audio.wav'
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('salvo:', out)
