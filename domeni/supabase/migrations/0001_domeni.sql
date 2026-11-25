-- Domeni: contas, plano, uso da IA, sincronização e lista de espera.
-- Rode uma vez no Supabase (SQL Editor > New query > colar > Run).
-- Tudo tem Row Level Security: cada pessoa só lê o que é dela, e escritas
-- sensíveis (plano, pagamentos) só acontecem pelo servidor (chave secreta).

-- ---------------------------------------------------------------- perfis
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "perfil: ler o proprio" on public.profiles;
create policy "perfil: ler o proprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------- direito ao Plus
-- Uma linha por origem (site, Pix, App Store, Google Play, cortesia).
create table if not exists public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('stripe', 'stripe_pix', 'app_store', 'play_store', 'cortesia')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  plan text not null default 'plus',
  billing_interval text check (billing_interval in ('mensal', 'anual')),
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  external_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, source)
);
alter table public.entitlements enable row level security;
drop policy if exists "plano: ler o proprio" on public.entitlements;
create policy "plano: ler o proprio" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.has_plus(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid
      and e.status in ('trialing', 'active', 'past_due')
      and (e.period_end is null or e.period_end > now())
  );
$$;
revoke all on function public.has_plus(uuid) from public, anon;
grant execute on function public.has_plus(uuid) to authenticated, service_role;

-- --------------------------------------------------------------- uso da IA
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  action text not null,
  kind text not null check (kind in ('acao', 'pesquisa')),
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 5) not null default 0
);
create index if not exists ai_usage_user_at on public.ai_usage (user_id, at);
create index if not exists ai_usage_at on public.ai_usage (at);
alter table public.ai_usage enable row level security;
drop policy if exists "uso: ler o proprio" on public.ai_usage;
create policy "uso: ler o proprio" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Início do mês no horário de Brasília.
create or replace function public.month_start()
returns timestamptz language sql stable set search_path = '' as $$
  select (date_trunc('month', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
$$;

-- Reserva uma ação de IA se ainda houver cota no mês. Devolve o id da
-- reserva ou null quando a cota acabou. Só o servidor chama.
create or replace function public.reserve_ai(uid uuid, p_action text, p_kind text, p_limit integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  used integer;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 42));
  select count(*) into used from public.ai_usage
    where user_id = uid and kind = p_kind and at >= public.month_start();
  if p_limit >= 0 and used >= p_limit then
    return null;
  end if;
  insert into public.ai_usage (user_id, action, kind) values (uid, p_action, p_kind)
    returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.reserve_ai(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai(uuid, text, text, integer) to service_role;

create or replace function public.month_ai_cost()
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.ai_usage where at >= public.month_start();
$$;
revoke all on function public.month_ai_cost() from public, anon, authenticated;
grant execute on function public.month_ai_cost() to service_role;

-- ---------------------------------------------------------- sincronização
-- Cada registro do app vira uma linha. "u" é a hora da última mudança no
-- aparelho (ms); a mais nova vence. "rev" cresce a cada gravação e serve de
-- marcador para baixar só o que mudou.
create sequence if not exists public.sync_rev_seq;
create table if not exists public.sync_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  tbl text not null,
  id text not null,
  data jsonb,
  u bigint not null,
  deleted boolean not null default false,
  rev bigint not null default nextval('public.sync_rev_seq'),
  primary key (user_id, tbl, id)
);
create index if not exists sync_records_user_rev on public.sync_records (user_id, rev);
alter table public.sync_records enable row level security;
drop policy if exists "sync: ler o proprio" on public.sync_records;
create policy "sync: ler o proprio" on public.sync_records
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_push(records jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r jsonb;
  n integer := 0;
begin
  if uid is null then raise exception 'sem-sessao' using errcode = '28000'; end if;
  if not public.has_plus(uid) then raise exception 'sem-plano' using errcode = '42501'; end if;
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records) > 500 then
    raise exception 'lote-invalido' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(records) loop
    if (r->>'tbl') not in ('semesters', 'disciplines', 'lessons', 'pages', 'recordings', 'reviews', 'tasks',
        'attendance', 'grades', 'books', 'bookTexts', 'cards', 'questions', 'hours', 'internships',
        'fieldNotes', 'reports', 'aiOutputs', 'calendar', 'images', 'files', 'settings') then
      raise exception 'tabela-invalida' using errcode = '22023';
    end if;
    if pg_column_size(r->'data') > 8000000 then
      raise exception 'registro-grande-demais' using errcode = '22023';
    end if;
    insert into public.sync_records as s (user_id, tbl, id, data, u, deleted)
    values (uid, r->>'tbl', r->>'id', case when (r->>'deleted')::boolean then null else r->'data' end,
            (r->>'u')::bigint, coalesce((r->>'deleted')::boolean, false))
    on conflict (user_id, tbl, id) do update
      set data = excluded.data, u = excluded.u, deleted = excluded.deleted,
          rev = nextval('public.sync_rev_seq')
      where s.u < excluded.u;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.sync_push(jsonb) from public, anon;
grant execute on function public.sync_push(jsonb) to authenticated;

-- ------------------------------------------- arquivos (imagens, PDFs, áudios)
insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos', 'arquivos', false, 104857600)
on conflict (id) do nothing;

-- Limite de espaço do Plus: 3 GB por pessoa.
create or replace function public.storage_used(uid uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id = 'arquivos' and (storage.foldername(o.name))[1] = uid::text;
$$;
revoke all on function public.storage_used(uuid) from public, anon;
grant execute on function public.storage_used(uuid) to authenticated, service_role;

drop policy if exists "arquivos: ler os proprios" on storage.objects;
create policy "arquivos: ler os proprios" on storage.objects
  for select to authenticated
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "arquivos: enviar com Plus" on storage.objects;
create policy "arquivos: enviar com Plus" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'arquivos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_plus((select auth.uid()))
    and public.storage_used((select auth.uid())) < 3221225472
  );

drop policy if exists "arquivos: trocar com Plus" on storage.objects;
create policy "arquivos: trocar com Plus" on storage.objects
  for update to authenticated
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (public.has_plus((select auth.uid())));

drop policy if exists "arquivos: apagar os proprios" on storage.objects;
create policy "arquivos: apagar os proprios" on storage.objects
  for delete to authenticated
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ----------------------------------------------------------- lista de espera
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  semestre text,
  faculdade text,
  ferramenta text,
  dificuldade text,
  quanto_pagaria text,
  consent_at timestamptz not null,
  source text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
-- Sem políticas: só o servidor lê e grava.

-- ------------------------------------------------ eventos de pagamento vistos
create table if not exists public.billing_events (
  id text primary key,
  provider text not null,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;

-- --------------------------------------------- limpeza (opcional, manual)
-- Apaga dados sincronizados de quem está sem plano há mais de 180 dias.
-- Para agendar: Database > Extensions > pg_cron, depois rode
--   select cron.schedule('domeni-limpeza', '17 4 * * 0', 'select public.cleanup_lapsed()');
create or replace function public.cleanup_lapsed()
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with lapsed as (
    select p.id from public.profiles p
    where not public.has_plus(p.id)
      and not exists (
        select 1 from public.entitlements e
        where e.user_id = p.id and coalesce(e.period_end, e.updated_at) > now() - interval '180 days'
      )
  )
  delete from public.sync_records s using lapsed where s.user_id = lapsed.id;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.cleanup_lapsed() from public, anon, authenticated;
