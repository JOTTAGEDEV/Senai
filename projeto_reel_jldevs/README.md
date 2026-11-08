# Reel JL Devs

Vídeo vertical para Instagram Reels (1080×1920, 30 fps, 54 s) **com narração em português do Brasil**, mostrando como a JL Devs ajuda donos de negócio com **sites, automações e SaaS**. O visual segue a identidade da marca: vidro verde (glass) e o logo "JL." animado.

| Arquivo | O que é |
|---|---|
| `jl-devs-reel.mp4` | Vídeo final com narração + trilha (pronto para postar) |
| `capa-reel.jpg` | Sugestão de capa para o Reels |
| `index.html` | A animação completa (abra no Chrome para assistir em tempo real) |
| `narracao.py` | Trata as falas (corta silêncios, nivela volume) e gera `narracao.json` |
| `music.py` | Gera a trilha e os efeitos sonoros (sintetizados, sem música de terceiros) e mixa a narração |
| `render.js` | Renderiza os quadros e monta o MP4 |
| `assets/voz/` | Falas originais (voz "Caio", pt-BR, gerada via Speko/Azure) |
| `assets/` | Logo original + recortes do J, do L e da bolinha (`recortar_logo.py`) |

## Roteiro e narração

| Tempo | Cena | Fala |
|---|---|---|
| 0–3 s | Gancho | "Você é dono de um negócio? Então presta atenção!" |
| 3–7,8 s | Problema | "Ainda perde venda no meio dessa bagunça?" / "Tem um jeito muito mais fácil." |
| 7,8–14 s | Logo + serviços | "Essa é a JL Devs: sites, automações e sistemas sob medida." |
| 14–23,9 s | Hamburguerias | "Hamburgueria? O cliente pede em três toques." / "A confirmação chega sozinha no WhatsApp." / "E sem pagar comissão de aplicativo!" |
| 23,9–32,4 s | Venda de carros | "Vende carros? Seu estoque fica online, vendendo vinte e quatro horas." / "Chegou um interessado? Em segundos, ele já tá falando com o vendedor." |
| 32,4–40,9 s | Empresários | "É empresário? Sua empresa inteira num só sistema." / "Nota fiscal, cobrança e relatório, tudo no automático." |
| 40,9–45,8 s | Benefícios | "Mais vendas. Menos planilha. Mais tempo livre." |
| 45,8–54,4 s | CTA | "Bora levar seu negócio pro próximo nível?" / "Chama a JL Devs no direct. Orçamento sem compromisso!" |

As animações estão sincronizadas com a voz (os cards de Sites/Automações/SaaS entram quando cada um é falado, os interruptores ligam em "nota fiscal… cobrança… relatório", etc.). A música abaixa automaticamente enquanto o narrador fala.

## Como editar e gerar de novo

Os textos da tela ficam direto no `index.html`. Para ver a partir de um ponto específico, abra `index.html?t=24` no navegador.

```bash
pip install numpy scipy        # áudio
npm install playwright         # navegador headless (precisa do ffmpeg instalado)
python3 narracao.py            # 1) trata as falas de assets/voz/
python3 music.py audio.wav     # 2) gera trilha + efeitos e mixa a narração
node render.js                 # 3) renderiza os quadros e gera jl-devs-reel.mp4
```

Para trocar uma fala, gere um novo `assets/voz/falaXX.wav` (mesma numeração), ajuste o texto/tempo em `narracao.py` e rode os 3 passos de novo. O `render.js` também gera `jl-devs-reel-sem-audio.mp4`, caso prefira outro áudio no Instagram.
