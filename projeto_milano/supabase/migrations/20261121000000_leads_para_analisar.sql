-- Correções apontadas na revisão de código.

-- Leads que precisam de análise da IA (filtro feito no banco, não no código).
create function public.leads_para_analisar(p_limite int, p_parada_min int)
returns setof public.leads
language sql stable security definer set search_path = public as $$
  select *
  from public.leads
  where etapa not in ('vendido', 'perdido')
    and ultima_mensagem_em < now() - make_interval(mins => p_parada_min)
    and (analisado_em is null or analisado_em < ultima_mensagem_em)
  order by ultima_mensagem_em desc
  limit p_limite
$$;

-- Mensagem nova do cliente: soma não lidas de forma atômica (sem perder contagem em mensagens simultâneas).
create function public.registrar_mensagem_cliente(p_lead uuid, p_quando timestamptz, p_nome text)
returns void
language sql security definer set search_path = public as $$
  update public.leads
     set nao_lidas = nao_lidas + 1,
         ultima_mensagem_em = greatest(ultima_mensagem_em, p_quando),
         nome = case when nome = '' then coalesce(p_nome, '') else nome end
   where id = p_lead
$$;

-- Só o servidor (Edge Functions, service_role) pode chamar
revoke execute on function public.leads_para_analisar(int, int) from public, anon, authenticated;
revoke execute on function public.registrar_mensagem_cliente(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.leads_para_analisar(int, int) to service_role;
grant execute on function public.registrar_mensagem_cliente(uuid, timestamptz, text) to service_role;
