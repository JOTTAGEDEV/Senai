#!/usr/bin/env python3
"""
Trata as falas da narração (assets/voz/falaXX.wav, voz pt-BR "Caio" gerada via Speko/Azure):
corta silêncios, encurta pausas longas, acelera levemente (sem mudar o tom), equaliza e
nivela o volume. Salva em assets/voz/tratado/ e grava narracao.json com duração e
posição de cada frase (usado pelo music.py para mixar e pelo index.html para sincronizar).
"""
import json, os, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets', 'voz')
OUT = os.path.join(SRC, 'tratado')
SR = 48000
TEMPO = 1.08          # aceleração leve (preserva o tom)
MAX_PAUSE = 0.28      # pausas internas maiores que isso são encurtadas

# texto de cada fala e o instante (s) em que entra no vídeo
FALAS = [
    ("Você é dono de um negócio? Então presta atenção!", 0.15),
    ("Ainda perde venda no meio dessa bagunça?", 3.20),
    ("Tem um jeito muito mais fácil.", 6.00),
    ("Essa é a JL Devs: sites, automações e sistemas sob medida.", 8.55),
    ("Hamburgueria? O cliente pede em três toques.", 14.35),
    ("A confirmação chega sozinha no WhatsApp.", 17.95),
    ("E sem pagar comissão de aplicativo!", 20.85),
    ("Vende carros? Seu estoque fica online, vendendo vinte e quatro horas.", 24.20),
    ("Chegou um interessado? Em segundos, ele já tá falando com o vendedor.", 28.65),
    ("É empresário? Sua empresa inteira num só sistema.", 32.70),
    ("Nota fiscal, cobrança e relatório, tudo no automático.", 35.90),
    ("Mais vendas. Menos planilha. Mais tempo livre.", 41.15),
    ("Bora levar seu negócio pro próximo nível?", 46.95),
    ("Chama a JL Devs no direct. Orçamento sem compromisso!", 49.05),
]


def read(p):
    w = wave.open(p)
    x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    return x, w.getframerate()


def write(p, x, sr):
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def frames_db(x, sr, hop=.01):
    n = int(sr * hop)
    e = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x) - n, n)])
    return 20 * np.log10(e + 1e-9), n


def speech_runs(db, thr, min_gap):
    """trechos de fala separados por silêncios >= min_gap (em quadros de 10 ms)"""
    on = db > thr
    idx = np.where(on)[0]
    runs, a = [], idx[0]
    prev = idx[0]
    for i in idx[1:]:
        if i - prev > min_gap:
            runs.append((a, prev + 1)); a = i
        prev = i
    runs.append((a, prev + 1))
    return runs


def process(x, sr):
    db, n = frames_db(x, sr)
    thr = db.max() - 36
    runs = speech_runs(db, thr, int(MAX_PAUSE / .01))
    pad_a, pad_b, gap = int(.02 * sr), int(.07 * sr), int(MAX_PAUSE * sr)
    pieces = []
    for k, (a, b) in enumerate(runs):
        s = max(0, a * n - pad_a); e = min(len(x), b * n + pad_b)
        seg = x[s:e].copy()
        f = min(int(.008 * sr), len(seg) // 4)
        seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        pieces.append(seg)
        if k < len(runs) - 1:
            pieces.append(np.zeros(max(0, gap - pad_a - pad_b)))
    y = np.concatenate(pieces)
    # aceleração leve + reamostragem para 48 kHz (ffmpeg atempo preserva o tom)
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, 'a.wav'), os.path.join(td, 'b.wav')
        write(a, y, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-af', f'atempo={TEMPO},aresample={SR}', '-ac', '1', b], check=True)
        y, _ = read(b)
    # EQ: corta graves, leve brilho/presença
    y = sosfilt(butter(2, 90, 'high', fs=SR, output='sos'), y)
    y = y + .35 * sosfilt(butter(2, [2500, 6500], 'band', fs=SR, output='sos'), y)
    # compressão suave
    env = np.sqrt(np.maximum(sosfilt(butter(1, 25, 'low', fs=SR, output='sos'), y ** 2), 1e-12))
    thr_c = 10 ** (-24 / 20)
    y = y * np.where(env > thr_c, (thr_c / env) ** .5, 1.0)
    # nivela pela energia da fala
    db2, n2 = frames_db(y, SR)
    act = db2 > db2.max() - 30
    rms = np.sqrt(np.mean(np.concatenate([y[i * n2:(i + 1) * n2] for i in np.where(act)[0]]) ** 2))
    y *= 10 ** (-17 / 20) / rms
    return y


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    info = []
    for k, (txt, t0) in enumerate(FALAS, 1):
        x, sr = read(os.path.join(SRC, f'fala{k:02d}.wav'))
        y = process(x, sr)
        write(os.path.join(OUT, f'fala{k:02d}.wav'), y, SR)
        db, n = frames_db(y, SR)
        frases = [(round(a * .01, 2), round(b * .01, 2)) for a, b in speech_runs(db, db.max() - 36, 18)]
        info.append(dict(n=k, texto=txt, inicio=t0, dur=round(len(y) / SR, 2), frases=frases))
        print(f'{k:2d} {t0:6.2f}s → {t0 + len(y) / SR:6.2f}s  ({len(y) / SR:.2f}s)  frases={frases}')
    json.dump(info, open(os.path.join(HERE, 'narracao.json'), 'w'), ensure_ascii=False, indent=1)
    ends = [i['inicio'] + i['dur'] for i in info]
    starts = [i['inicio'] for i in info]
    over = [(k + 1, round(ends[k] - starts[k + 1], 2)) for k in range(len(info) - 1) if ends[k] > starts[k + 1]]
    print('sobreposições:', over or 'nenhuma')
