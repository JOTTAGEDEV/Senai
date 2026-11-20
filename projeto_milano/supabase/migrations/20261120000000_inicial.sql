-- =====================================================================
-- Milano Multimarcas — banco de dados do painel (multiempresa / SaaS)
-- Cada empresa (loja) só enxerga os próprios dados (Row Level Security).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Empresas e usuários
-- ---------------------------------------------------------------------
create table public.empresas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  endereco    text not null default '',
  cidade      text not null default '',
  uf          text not null default '',
  whatsapp    text not null default '',
  instagram   text not null default '',
  ia          jsonb not null default '{}'::jsonb,   -- ConfigIA (modo, horários, regras...)
  criado_em   timestamptz not null default now()
);

-- Credenciais do WhatsApp (Meta) por empresa. SEM políticas: só o servidor (service role) lê.
create table public.empresa_whatsapp (
  empresa_id       uuid primary key references public.empresas(id) on delete cascade,
  phone_number_id  text not null unique,
  access_token     text not null,
  criado_em        timestamptz not null default now()
);

-- Quem pode entrar no painel de cada empresa
create table public.membros (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  papel       text not null default 'vendedor' check (papel in ('dono', 'vendedor')),
  nome        text not null default ''
);
create index on public.membros (empresa_id);

-- Empresa do usuário logado (usada nas regras de segurança e como valor padrão)
create function public.empresa_atual() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.membros where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Vendedores
-- ---------------------------------------------------------------------
create table public.vendedores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome        text not null,
  telefone    text not null default '',
  ativo       boolean not null default true
);
create index on public.vendedores (empresa_id);

-- ---------------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------------
create table public.veiculos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  marca                 text not null,
  modelo                text not null,
  versao                text not null default '',
  ano_fabricacao        int  not null,
  ano_modelo            int  not null,
  cor                   text not null default '',
  placa                 text not null default '',          -- interno
  carroceria            text not null default '',
  km                    int  not null default 0,
  cambio                text not null default '',
  combustivel           text not null default '',
  motor                 text not null default '',
  portas                int  not null default 4,
  opcionais             text[] not null default '{}',
  tipo                  text not null default 'usado' check (tipo in ('novo', 'seminovo', 'usado')),
  conservacao           text not null default 'bom' check (conservacao in ('excelente', 'otimo', 'bom', 'regular')),
  checklist             jsonb not null default '{}'::jsonb,
  garantia_meses        int  not null default 0,
  preco                 int  not null check (preco >= 0),  -- em reais
  preco_minimo          int,                                -- interno
  custo_compra          int,                                -- interno
  fipe                  int,
  aceita_troca          boolean not null default true,
  aceita_financiamento  boolean not null default true,
  descricao             text not null default '',
  observacoes_internas  text not null default '',           -- interno
  instrucoes_ia         text not null default '',
  fotos                 jsonb not null default '[]'::jsonb, -- [{id, src, enviarIA}]
  video_url             text not null default '',
  links                 jsonb not null default '{}'::jsonb,
  status                text not null default 'disponivel'
                          check (status in ('disponivel', 'reservado', 'preparacao', 'vendido', 'oculto')),
  destaque              boolean not null default false,
  data_entrada          date not null default current_date,
  interessados          int  not null default 0,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create index on public.veiculos (empresa_id, status);

-- ---------------------------------------------------------------------
-- Leads (um por cliente/telefone) e mensagens
-- ---------------------------------------------------------------------
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  nome                text not null default '',
  telefone            text not null,                       -- só dígitos, com DDI (5548...)
  veiculo_id          uuid references public.veiculos(id) on delete set null,
  interesse           text not null default '',
  temperatura         text not null default 'morno' check (temperatura in ('quente', 'morno', 'frio')),
  importancia         text not null default 'normal' check (importancia in ('importante', 'normal', 'baixa')),
  etapa               text not null default 'novo'
                        check (etapa in ('novo', 'atendimento', 'qualificado', 'visita', 'negociando', 'vendido', 'perdido')),
  etiquetas           text[] not null default '{}',
  resumo              text not null default '',
  proxima_acao        text not null default '',
  dados               jsonb not null default '{}'::jsonb,
  atendente           text not null default 'ia' check (atendente in ('ia', 'humano')),
  vendedor_id         uuid references public.vendedores(id) on delete set null,
  nao_lidas           int  not null default 0,
  motivo_perda        text not null default '',
  ultima_mensagem_em  timestamptz not null default now(),
  analisado_em        timestamptz,
  criado_em           timestamptz not null default now(),
  unique (empresa_id, telefone)
);
create index on public.leads (empresa_id, ultima_mensagem_em desc);

create table public.mensagens (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  lead_id        uuid not null references public.leads(id) on delete cascade,
  autor          text not null check (autor in ('cliente', 'ia', 'vendedor', 'sistema')),
  autor_nome     text not null default '',
  texto          text not null default '',
  midia_url      text,
  wa_message_id  text unique,                              -- evita duplicar quando a Meta reenvia
  criada_em      timestamptz not null default now()
);
create index on public.mensagens (lead_id, criada_em);
create index on public.mensagens (empresa_id, criada_em);

-- ---------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------
create table public.agendamentos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null default public.empresa_atual() references public.empresas(id) on delete cascade,
  lead_id       uuid references public.leads(id) on delete set null,
  cliente_nome  text not null,
  telefone      text not null default '',
  veiculo_id    uuid references public.veiculos(id) on delete set null,
  tipo          text not null default 'visita' check (tipo in ('visita', 'test-drive')),
  inicio        timestamptz not null,
  vendedor_id   uuid references public.vendedores(id) on delete set null,
  status        text not null default 'agendado'
                  check (status in ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado')),
  origem        text not null default 'manual' check (origem in ('ia', 'manual')),
  observacao    text not null default '',
  criado_em     timestamptz not null default now()
);
create index on public.agendamentos (empresa_id, inicio);

-- ---------------------------------------------------------------------
-- Consumo de IA (para acompanhar o custo por empresa)
-- ---------------------------------------------------------------------
create table public.uso_ia (
  id               bigint generated always as identity primary key,
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  tipo             text not null,      -- 'atendente' | 'analista' | 'teste'
  modelo           text not null,
  tokens_entrada   int not null default 0,
  tokens_saida     int not null default 0,
  tokens_cache     int not null default 0,
  criado_em        timestamptz not null default now()
);
create index on public.uso_ia (empresa_id, criado_em);

-- =====================================================================
-- Segurança (RLS): cada usuário só acessa a própria empresa
-- =====================================================================
alter table public.empresas          enable row level security;
alter table public.empresa_whatsapp  enable row level security;
alter table public.membros           enable row level security;
alter table public.vendedores        enable row level security;
alter table public.veiculos          enable row level security;
alter table public.leads             enable row level security;
alter table public.mensagens         enable row level security;
alter table public.agendamentos      enable row level security;
alter table public.uso_ia            enable row level security;

create policy "ver a própria empresa" on public.empresas
  for select to authenticated using (id = public.empresa_atual());
create policy "editar a própria empresa" on public.empresas
  for update to authenticated using (id = public.empresa_atual()) with check (id = public.empresa_atual());

create policy "ver membros da empresa" on public.membros
  for select to authenticated using (empresa_id = public.empresa_atual());

create policy "empresa" on public.vendedores for all to authenticated
  using (empresa_id = public.empresa_atual()) with check (empresa_id = public.empresa_atual());
create policy "empresa" on public.veiculos for all to authenticated
  using (empresa_id = public.empresa_atual()) with check (empresa_id = public.empresa_atual());
create policy "empresa" on public.leads for all to authenticated
  using (empresa_id = public.empresa_atual()) with check (empresa_id = public.empresa_atual());
create policy "empresa" on public.mensagens for all to authenticated
  using (empresa_id = public.empresa_atual()) with check (empresa_id = public.empresa_atual());
create policy "empresa" on public.agendamentos for all to authenticated
  using (empresa_id = public.empresa_atual()) with check (empresa_id = public.empresa_atual());
create policy "ver consumo" on public.uso_ia
  for select to authenticated using (empresa_id = public.empresa_atual());
-- empresa_whatsapp: nenhuma política de propósito (token da Meta nunca vai para o navegador)

-- Permissões explícitas da API (o RLS acima ainda filtra por empresa)
grant select, update on public.empresas to authenticated;
grant select on public.membros, public.uso_ia to authenticated;
grant select, insert, update, delete on public.vendedores, public.veiculos, public.leads, public.mensagens, public.agendamentos to authenticated;
revoke all on public.empresa_whatsapp from anon, authenticated;

-- =====================================================================
-- Tempo real (painel atualiza sozinho quando chega mensagem)
-- =====================================================================
alter publication supabase_realtime add table
  public.empresas, public.vendedores, public.veiculos, public.leads, public.mensagens, public.agendamentos;

-- =====================================================================
-- Fotos dos carros (Storage). Pasta = id da empresa.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "fotos: enviar na pasta da empresa" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.empresa_atual()::text);
create policy "fotos: alterar na pasta da empresa" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.empresa_atual()::text);
create policy "fotos: apagar na pasta da empresa" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.empresa_atual()::text);

-- =====================================================================
-- Cadastrar uma loja nova (rodar no SQL Editor depois de criar o usuário em Authentication)
--   select public.cadastrar_loja('dona@milano.com.br', 'Milano Multimarcas', 'Dona da loja');
-- =====================================================================
create function public.cadastrar_loja(p_email text, p_nome_loja text, p_nome_usuario text default '')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_empresa uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'Usuário % não existe. Crie em Authentication > Users primeiro.', p_email;
  end if;

  insert into public.empresas (nome, ia)
  values (
    p_nome_loja,
    jsonb_build_object(
      'modo', 'fora_horario',
      'horarios', jsonb_build_array(
        jsonb_build_object('aberto', false, 'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '18:00'),
        jsonb_build_object('aberto', true,  'abre', '08:30', 'fecha', '12:30')
      ),
      'podeInformarPreco', true,
      'podeAgendar', true,
      'enviaFotos', true,
      'tom', 'amigavel',
      'instrucoes', 'Nunca dar desconto: diga que o vendedor pode negociar pessoalmente.',
      'boasVindas', 'Olá! Aqui é a assistente virtual da ' || p_nome_loja || ' 🚗 Como posso te ajudar?'
    )
  )
  returning id into v_empresa;

  insert into public.membros (user_id, empresa_id, papel, nome)
  values (v_user, v_empresa, 'dono', p_nome_usuario)
  on conflict (user_id) do update set empresa_id = excluded.empresa_id, papel = 'dono';

  return v_empresa;
end;
$$;

-- Adicionar outro usuário (vendedor) a uma loja existente
create function public.adicionar_membro(p_email text, p_empresa uuid, p_papel text default 'vendedor', p_nome text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'Usuário % não existe.', p_email;
  end if;
  insert into public.membros (user_id, empresa_id, papel, nome)
  values (v_user, p_empresa, p_papel, p_nome)
  on conflict (user_id) do update set empresa_id = excluded.empresa_id, papel = excluded.papel, nome = excluded.nome;
end;
$$;

-- Estas funções administrativas não podem ser chamadas pelo navegador
revoke execute on function public.cadastrar_loja(text, text, text) from public, anon, authenticated;
revoke execute on function public.adicionar_membro(text, uuid, text, text) from public, anon, authenticated;
