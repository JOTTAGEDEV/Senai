-- WhatsApp por outros provedores além da Meta (Evolution API, Z-API) e follow-up automático.

-- ---------------------------------------------------------------------
-- Conexão do WhatsApp: qual provedor e como falar com ele
-- ---------------------------------------------------------------------
alter table public.empresa_whatsapp
  add column provedor      text not null default 'meta' check (provedor in ('meta', 'evolution', 'zapi')),
  add column api_url       text not null default '',   -- Evolution: endereço do servidor (https://...)
  add column instancia     text not null default '',   -- Evolution: nome da instância · Z-API: id da instância
  add column client_token  text not null default '',   -- Z-API: token de segurança da conta (cabeçalho Client-Token)
  add column webhook_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');  -- segredo na URL do webhook

-- phone_number_id só existe na Meta
alter table public.empresa_whatsapp alter column phone_number_id drop not null;
alter table public.empresa_whatsapp
  add constraint empresa_whatsapp_dados_do_provedor check (
    (provedor = 'meta' and phone_number_id is not null)
    or (provedor = 'evolution' and api_url <> '' and instancia <> '')
    or (provedor = 'zapi' and instancia <> '')
  );
create unique index empresa_whatsapp_instancia_unica on public.empresa_whatsapp (provedor, instancia) where instancia <> '';

-- ---------------------------------------------------------------------
-- Follow-up: quantos já foram enviados para cada cliente
-- ---------------------------------------------------------------------
alter table public.leads
  add column followups_enviados int not null default 0,
  add column ultimo_followup_em  timestamptz;

-- O cliente respondeu: zera os follow-ups (se ele sumir de novo, recomeça a contagem)
create or replace function public.registrar_mensagem_cliente(p_lead uuid, p_quando timestamptz, p_nome text)
returns void
language sql security definer set search_path = public as $$
  update public.leads
     set nao_lidas = nao_lidas + 1,
         ultima_mensagem_em = greatest(ultima_mensagem_em, p_quando),
         nome = case when nome = '' then coalesce(p_nome, '') else nome end,
         followups_enviados = 0
   where id = p_lead
$$;

-- Clientes que pararam de responder há p_dias e ainda podem receber follow-up.
-- Só quem JÁ conversou com a loja (tem pelo menos uma mensagem do cliente) e não comprou nem desistiu.
create function public.leads_para_followup(p_empresa uuid, p_dias int, p_maximo int, p_limite int)
returns setof public.leads
language sql stable security definer set search_path = public as $$
  select l.*
  from public.leads l
  where l.empresa_id = p_empresa
    and l.etapa not in ('vendido', 'perdido')
    and l.followups_enviados < p_maximo
    and l.ultima_mensagem_em < now() - make_interval(days => p_dias)
    and l.ultima_mensagem_em > now() - interval '45 days'          -- não ressuscita conversa muito antiga
    and (l.ultimo_followup_em is null or l.ultimo_followup_em < now() - make_interval(days => p_dias))
    and exists (select 1 from public.mensagens m where m.lead_id = l.id and m.autor = 'cliente')
  order by l.ultima_mensagem_em asc
  limit p_limite
$$;

revoke execute on function public.leads_para_followup(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.leads_para_followup(uuid, int, int, int) to service_role;
revoke execute on function public.registrar_mensagem_cliente(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.registrar_mensagem_cliente(uuid, timestamptz, text) to service_role;
