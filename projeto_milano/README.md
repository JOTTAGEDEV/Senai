# Milano Multimarcas — Painel (front-end)

Painel de atendimento com IA no WhatsApp para a Milano Multimarcas: estoque, conversas, leads, agenda e dashboard.

> **Fase atual:** só o front-end. Os dados ficam salvos no navegador (IndexedDB) com carros de exemplo.
> Quando o back-end (Supabase + WhatsApp Cloud API + IA) for ligado, só a camada `lib/estoque-store.tsx` muda.

## Rodar

```bash
cd projeto_milano
npm install
npm run dev
```

Abra http://localhost:3000 — qualquer e-mail e senha entram.

## Telas

| Tela | Status |
|---|---|
| Login | ✅ visual |
| Estoque — lista, filtros, resumo, ações (editar, duplicar, status, excluir) | ✅ |
| Estoque — cadastro/edição completo, até 15 fotos com capa, ordem e 3 fotos para a IA | ✅ |
| Dashboard, Conversas, Leads, Agenda, Configurações | 🚧 em construção |

## Estrutura

```
app/
  login/                 tela de login
  (painel)/              telas com menu lateral
    estoque/             lista
    estoque/novo/        cadastrar carro
    estoque/[id]/        editar carro
components/
  Sidebar.tsx, Logo.tsx, EmBreve.tsx
  estoque/               formulário, fotos, badges, menu de ações
lib/
  types.ts               tipo Veiculo
  constants.ts           marcas, opcionais, status...
  estoque-store.tsx      onde os dados são salvos (trocar por Supabase depois)
  imagem.ts              compressão de fotos (1280px, WebP)
  mock-data.ts           carros de exemplo
```

## Dados da loja e logo

Os dados ficam em `lib/loja.ts` (endereço encontrado em anúncios públicos: Rua Caetano Silveira de Matos, 2371 – Centro, Palhoça/SC).
WhatsApp, Instagram e horário ainda precisam ser confirmados com a loja.

**Para colocar a logo oficial:** salve o arquivo em `public/logo-milano.png` e, em `lib/loja.ts`, troque `logoUrl: null` por `logoUrl: "/logo-milano.png"`.

O estoque de exemplo usa modelos reais dos anúncios da loja (Taos, Tracker, Pajero Sport, Nivus, Mobi, Compass, Azera);
quilometragem, opcionais, status e parte dos preços são ilustrativos.

## Campos internos

Campos marcados como **interno** (placa completa, preço mínimo, custo de compra, observações internas) nunca serão enviados para a IA.
