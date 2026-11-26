-- Rodadas automáticas: IA analista (a cada 5 min) e follow-up (a cada 15 min).
-- O segredo do cron fica no Vault (nome 'cron_secret'), nunca escrito aqui. Para configurar, no SQL Editor:
--   select vault.create_secret('O_MESMO_CRON_SECRET_DAS_FUNCOES', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.chamar_funcao_cron(p_funcao text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_segredo text;
begin
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'cron_secret' limit 1;
  if v_segredo is null then
    return; -- ainda não configurado: não chama nada
  end if;
  perform net.http_post(
    url := 'https://tobmcmqluydaxrdxsxbi.supabase.co/functions/v1/' || p_funcao,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_segredo),
    body := '{}'::jsonb
  );
end;
$$;
revoke execute on function public.chamar_funcao_cron(text) from public, anon, authenticated;

select cron.schedule('ia-analista', '*/5 * * * *', $$ select public.chamar_funcao_cron('ia-analista') $$);
select cron.schedule('ia-followup', '*/15 * * * *', $$ select public.chamar_funcao_cron('ia-followup') $$);
