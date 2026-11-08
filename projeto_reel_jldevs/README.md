# Reel JL Devs

Vídeo vertical para Instagram Reels (1080×1920, 30 fps, 44 s) mostrando como a JL Devs ajuda donos de negócio com **sites, automações e SaaS**. O visual segue a identidade da marca: vidro verde (glass) e o logo "JL." animado.

| Arquivo | O que é |
|---|---|
| `jl-devs-reel.mp4` | Vídeo final com trilha sonora (pronto para postar) |
| `capa-reel.jpg` | Sugestão de capa para o Reels |
| `index.html` | A animação completa (abra no Chrome para assistir em tempo real) |
| `music.py` | Gera a trilha e os efeitos sonoros (tudo sintetizado, sem música de terceiros) |
| `render.js` | Renderiza os quadros e monta o MP4 |
| `assets/` | Logo original + recortes do J, do L e da bolinha (`recortar_logo.py`) |

## Roteiro

| Tempo | Cena |
|---|---|
| 0–3 s | Gancho: "Você é dono de um negócio?" |
| 3–7,5 s | Problema: WhatsApp lotado, planilha quebrada, cliente desistindo |
| 7,5–11,5 s | Logo JL de vidro cai e quica + Sites · Automações · SaaS |
| 11,5–19 s | Hamburguerias: cardápio digital, pedido em 3 toques, confirmação automática no WhatsApp |
| 19–26,5 s | Venda de carros: estoque online, lead vai do site → CRM → vendedor → test drive |
| 26,5–34 s | Empresários: painel de gestão + automações (nota fiscal, cobrança Pix, relatório) |
| 34–37,5 s | Mais vendas · Menos planilha · Mais tempo livre |
| 37,5–44 s | CTA: "Chama no direct" · Orçamento sem compromisso |

## Como editar e gerar de novo

Os textos ficam direto no `index.html`. Para ver a partir de um ponto específico, abra `index.html?t=19` no navegador.

```bash
pip install numpy scipy        # trilha
npm install playwright         # navegador headless (precisa do ffmpeg instalado)
python3 music.py audio.wav     # 1) gera a trilha
node render.js                 # 2) renderiza os quadros e gera jl-devs-reel.mp4
```

O `render.js` também gera `jl-devs-reel-sem-audio.mp4`, caso prefira usar um áudio em alta do próprio Instagram.
