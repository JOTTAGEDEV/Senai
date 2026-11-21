# Reel: IA de atendimento para lojas de carros (JL Devs)

Vídeo vertical para Instagram Reels (1080×1920, 30 fps, 57 s) com narração em português do Brasil.
Mostra o que a JL Devs faz para lojas de veículos: uma IA que atende o WhatsApp da loja com o estoque real,
manda fotos, agenda test-drive, chama o vendedor na hora certa e organiza os leads num painel.

**Sem nome de cliente nem de loja.** Os nomes que aparecem no painel (Rafael S., Ana P., Marcos L.) são fictícios,
e os carros são ilustrações genéricas.

| Arquivo | O que é |
|---|---|
| `reel-ia-carros.mp4` | Vídeo final com narração e trilha, pronto para postar |
| `capa-reel.jpg` | Sugestão de capa |
| `legenda-instagram.txt` | Texto da legenda com hashtags |
| `index.html` | A animação (abra no Chrome; `index.html?t=20` começa no segundo 20) |
| `narracao.py` | Trata as falas e gera `narracao.json` (tempo de cada fala) |
| `musica.py` | Trilha e efeitos sintetizados (sem música de terceiros) + mixagem com a narração |
| `render.js` | Renderiza os quadros e gera o MP4 |
| `assets/voz/` | Falas originais (voz "Caio", pt-BR, gerada via Speko/Azure) |
| `assets/` | Logo da JL Devs recortado (J, L e a bolinha) |

## Roteiro

| Tempo | Cena | Fala |
|---|---|---|
| 0–7 s | Gancho | "Vende carro? Então me responde: quantos clientes te chamaram ontem à noite, e ficaram sem resposta?" |
| 7–14 s | Problema | "Dez da noite. O cliente pergunta do carro, e ninguém responde. De manhã, ele já comprou no concorrente." |
| 14–20 s | Solução + logo | "Por isso a JL Devs criou uma inteligência artificial que atende o WhatsApp da sua loja." |
| 20–31 s | Demonstração | "Ela conhece o seu estoque de verdade: responde preço, quilometragem, manda as fotos. E já marca a visita e o test-drive direto na agenda." |
| 31–37 s | Vendedor | "Pediu desconto? Ela chama o vendedor na hora certa. E nunca inventa preço." |
| 37–45 s | Painel | "No painel, cada cliente chega organizado: quente, morno ou frio, com o resumo da conversa." |
| 45–50 s | 24 horas | "Sua loja vendendo vinte e quatro horas. Inclusive quando está fechada." |
| 50–57 s | Chamada | "Tem uma loja de carros? Chama a JL Devs no direct!" |

## Como gerar de novo

```bash
pip install numpy scipy
python3 narracao.py     # 1) trata as falas e calcula os tempos
python3 musica.py       # 2) trilha + efeitos + narração → audio.wav
node render.js          # 3) quadros → reel-ia-carros.mp4 (precisa de Playwright e ffmpeg)
```

Para trocar uma fala: gere um novo `assets/voz/falaXX.wav`, atualize o texto em `narracao.py`, rode os 3 passos
e, se a duração mudar muito, ajuste os tempos (`--d`) das cenas no `index.html`.
