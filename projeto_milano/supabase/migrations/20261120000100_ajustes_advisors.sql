-- Ajustes apontados pelos "advisors" do Supabase.

-- empresa_atual() só faz sentido para quem está logado (usada nas regras de RLS)
revoke execute on function public.empresa_atual() from public, anon;
grant execute on function public.empresa_atual() to authenticated, service_role;

-- Índices nas chaves estrangeiras (consultas e exclusões mais rápidas)
create index if not exists agendamentos_lead_id_idx on public.agendamentos (lead_id);
create index if not exists agendamentos_veiculo_id_idx on public.agendamentos (veiculo_id);
create index if not exists agendamentos_vendedor_id_idx on public.agendamentos (vendedor_id);
create index if not exists leads_veiculo_id_idx on public.leads (veiculo_id);
create index if not exists leads_vendedor_id_idx on public.leads (vendedor_id);
