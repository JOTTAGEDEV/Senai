#!/usr/bin/env python3
"""
Trilha sintetizada (sem música de terceiros) + efeitos sincronizados com as cenas + narração.
A música abaixa sozinha enquanto o narrador fala.
Uso: python3 musica.py [saida.wav]   (precisa ter rodado narracao.py antes)
"""
import json, os, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt

AQUI = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DUR = 57.5
N = int(DUR * SR)
rng = np.random.default_rng(7)


def T(d):
    return np.arange(int(d * SR)) / SR


def filtro(x, tipo, fc, ordem=2):
    return sosfilt(butter(ordem, fc, tipo, fs=SR, output='sos'), x)


def env(n, ataque=.005, decai=.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(ataque, 1e-4)) * np.exp(-t / decai)


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


class Faixa:
    def __init__(self):
        self.x = np.zeros((N + SR * 3, 2))

    def add(self, s, t, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= N or len(s) == 0:
            return
        s = s[: len(self.x) - i]
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.x[i:i + len(s), 0] += s * g * l * 1.414
        self.x[i:i + len(s), 1] += s * g * r * 1.414


# ---------------- instrumentos ----------------
def kick():
    t = T(.4)
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .001, .16)


def clap():
    s = filtro(rng.standard_normal(int(.25 * SR)), 'band', [900, 2600])
    e = env(len(s), .001, .07)
    return s * e * .8


def hat(aberto=False):
    s = filtro(rng.standard_normal(int((.25 if aberto else .06) * SR)), 'high', 7000)
    return s * env(len(s), .001, .09 if aberto else .02) * .5


def baixo(m, d):
    t = T(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t)
    return filtro(s, 'low', 500) * env(len(t), .01, d * .7)


def pad(notas, d, brilho=2200):
    t = T(d)
    s = np.zeros(len(t))
    for m in notas:
        for dt in (-.07, 0, .07):
            f = mtof(m) * 2 ** (dt / 12)
            s += 2 * ((t * f) % 1) - 1
    s = filtro(s / (len(notas) * 3), 'low', brilho)
    a = np.minimum(1, t / .35) * np.minimum(1, (d - t) / .4)
    return s * a * .5


def sino(m, d=.6):
    t = T(d)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t))
    return s * env(len(t), .002, .18)


def pop(f0=500, f1=1200):
    t = T(.12)
    f = f0 + (f1 - f0) * (t / .12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .002, .04)


def whoosh(d=.6):
    s = rng.standard_normal(int(d * SR))
    t = np.arange(len(s)) / len(s)
    s = filtro(s, 'band', [400, 5000]) * np.sin(np.pi * t) ** 2
    return s * .6


def boom(d=1.6):
    t = T(d)
    f = 38 + 60 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .004, .5)


def ding(f=1568):
    t = T(1.0)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t)) * env(len(t), .001, .25) * .5


def bater():
    t = T(.25)
    s = filtro(rng.standard_normal(len(t)), 'low', 1600) * env(len(t), .001, .05)
    return s + np.sin(2 * np.pi * 90 * t) * env(len(t), .001, .12)


def tick():
    s = filtro(rng.standard_normal(int(.03 * SR)), 'high', 4000)
    return s * env(len(s), .0005, .008)


def riser(d=1.2):
    t = T(d)
    s = filtro(rng.standard_normal(len(t)), 'band', [800, 7000])
    return s * (t / d) ** 2 * .5


# ---------------- arranjo (110 BPM, C G Am F) ----------------
bat, bx, pd, ef = Faixa(), Faixa(), Faixa(), Faixa()
BPM = 110
B = 60 / BPM
ACORDES = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]
RAIZ = [36, 31, 33, 29]
PROBLEMA = (6.95, 14.1)        # cena 2: só pad escuro, sem batida
QUEBRA_FIM = 49.8              # cena final: tudo de novo + acorde final

compasso = 4 * B
k = 0
t = 0.0
while t < DUR - .5:
    ac, r = ACORDES[k % 4], RAIZ[k % 4]
    escuro = PROBLEMA[0] - .2 <= t < PROBLEMA[1]
    pd.add(pad([n - (12 if escuro else 0) for n in ac], compasso + .3, 900 if escuro or t < 3 else 2400), t, .9)
    for b in range(4):
        tb = t + b * B
        if tb >= DUR - 1.2:
            break
        if escuro:
            if b == 0:
                bx.add(filtro(baixo(r, B * 2), 'low', 200), tb, .7)
            continue
        bat.add(kick(), tb, .85)
        if b in (1, 3) and tb > 3:
            bat.add(clap(), tb, .45)
        for s in (0, .5):
            bat.add(hat(s == .5 and b % 2 == 1), tb + s * B, .35)
        bx.add(baixo(r + (12 if b == 2 else 0), B * .9), tb, .6)
        bx.add(baixo(r, B * .4), tb + B * .5, .45)
    k += 1
    t += compasso

# ---------------- efeitos (alinhados com o index.html) ----------------
ef.add(boom(), 0.3, .9); ef.add(pop(420, 1100), .35, .7)
for i, tt in enumerate((2.5, 2.85, 3.2)):
    ef.add(ding((1568, 1319, 1760)[i]), tt, .6, (-.3, .3, 0)[i])
ef.add(bater(), 4.95, .8)
ef.add(whoosh(), 6.75, .8)
ef.add(ding(1175), 7.5, .5)
ef.add(bater(), 9.0, .5)
for i in range(18):                         # relógio avançando a noite
    ef.add(tick(), 10.3 + i * .06, .5, rng.uniform(-.3, .3))
ef.add(ding(1047), 11.65, .55)
ef.add(boom(.9), 12.4, 1.0); ef.add(bater(), 12.4, 1.0)
ef.add(riser(1.2), 12.9, .7)
ef.add(boom(2.0), 14.1, 1.0)
for tt, f in ((14.3 + .475, 1950), (14.5 + .475, 2150), (14.85 + .475, 2950)):
    ef.add(sino(91, .9), tt, .35); ef.add(bater(), tt, .5)
for i, tt in enumerate((17.1, 17.55, 18.0)):
    ef.add(pop(520 + 60 * i, 1250 + 130 * i), tt, .6, (-.3, 0, .3)[i])
ef.add(whoosh(), 20.1, .8)
for tt in (20.6, 25.35, 31.0):
    ef.add(pop(450, 1000), tt, .55, -.3)
for tt in (22.05, 24.05, 26.9, 32.05):
    ef.add(pop(650, 1500), tt, .6, .3)
ef.add(sino(84, .8), 28.35, .7); ef.add(sino(88, .8), 28.45, .6); ef.add(sino(91, .9), 28.55, .5)
ef.add(whoosh(), 30.55, .8)
ef.add(ding(1760), 32.7, .6)
ef.add(sino(88, .8), 34.5, .6)
ef.add(whoosh(), 36.4, .8)
for i, tt in enumerate((37.75, 38.05, 38.35)):
    ef.add(pop(480 + 50 * i, 1100 + 80 * i), tt, .45)
for i, tt in enumerate((39.65, 40.4, 40.95)):
    ef.add(sino((79, 83, 86)[i], .6), tt, .6, (-.3, 0, .3)[i])
ef.add(sino(91, .9), 41.9, .45)
ef.add(whoosh(), 44.5, .8)
for i in range(24):
    ef.add(tick(), 44.9 + 1.2 * (1 - (1 - (i + 1) / 24) ** .5), .45)
ef.add(boom(1.0), 46.1, .6)
ef.add(bater(), 47.75, .6)
ef.add(pop(650, 1500), 48.25, .7)
ef.add(riser(1.4), 48.4, .8)
ef.add(boom(2.4), 49.8, 1.0)
for tt in (50.55 + .475, 50.75 + .475, 51.1 + .475):
    ef.add(sino(93, .9), tt, .35); ef.add(bater(), tt, .45)
ef.add(sino(84, 1.2), 52.0, .6); ef.add(sino(88, 1.2), 52.08, .5); ef.add(sino(91, 1.4), 52.16, .5); ef.add(sino(96, 1.6), 52.24, .4)
pd.add(pad([48, 60, 64, 67, 72], 3.0, 1800), DUR - 3.0, 1.0)

# ---------------- narração ----------------
info = json.load(open(os.path.join(AQUI, 'narracao.json')))
voz = np.zeros(N + SR * 3)
for f in info:
    w = wave.open(os.path.join(AQUI, 'assets', 'voz', 'tratado', f"fala{f['n']:02d}.wav"))
    y = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    i = int(f['inicio'] * SR)
    voz[i:i + len(y)] += y[: len(voz) - i]

# ducking: música abaixa ~9 dB enquanto há voz
e = np.abs(voz)
e = sosfilt(butter(1, 6, 'low', fs=SR, output='sos'), e)
duck = 1 - .65 * np.clip(e / (e.max() * .15 + 1e-9), 0, 1)

musica = bat.x * .55 + bx.x * .5 + pd.x * .32
musica = musica * duck[:, None]
mix = musica + ef.x * .42 * (0.55 + .45 * duck[:, None]) + np.stack([voz, voz], 1) * 1.15
mix = mix[:N]
fade = np.minimum(1, (N - np.arange(N)) / (SR * 1.2))
mix *= fade[:, None]
mix /= max(1e-9, np.abs(mix).max()) / .89

saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'audio.wav')
with wave.open(saida, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('áudio:', saida, f'{DUR}s')
