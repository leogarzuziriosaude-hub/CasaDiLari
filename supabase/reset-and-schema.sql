-- Casa Di Lari - RESET COMPLETO + SCHEMA NOVO
--
-- ATENCAO:
-- Este SQL apaga as tabelas do schema public do Supabase e recria tudo do zero.
-- Ele NAO apaga usuarios do Supabase Auth.
-- Rode no SQL Editor somente se voce quer realmente recomecar o banco.

begin;

create extension if not exists pgcrypto;

-- 1) Limpa o schema public.
-- Como este projeto Supabase sera dedicado a Casa Di Lari, limpamos as tabelas
-- existentes para evitar conflito com colunas antigas como pizzaria_id/loja_id.
do $$
declare
  item record;
begin
  for item in
    select schemaname, viewname
    from pg_views
    where schemaname = 'public'
  loop
    execute format('drop view if exists %I.%I cascade', item.schemaname, item.viewname);
  end loop;

  for item in
    select schemaname, matviewname
    from pg_matviews
    where schemaname = 'public'
  loop
    execute format('drop materialized view if exists %I.%I cascade', item.schemaname, item.matviewname);
  end loop;

  for item in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('drop table if exists %I.%I cascade', item.schemaname, item.tablename);
  end loop;
end $$;

drop function if exists public.usuario_admin() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.gerar_protocolo_pedido() cascade;
drop function if exists public.set_protocolo_pedido() cascade;
drop function if exists public.consultar_pedido_por_protocolo(text) cascade;
drop function if exists public.criar_pedido_publico(jsonb) cascade;

drop type if exists public.pedido_status cascade;
drop type if exists public.pedido_tipo cascade;
drop type if exists public.entrega_tipo cascade;
drop type if exists public.produto_tipo cascade;
drop type if exists public.desconto_tipo cascade;

-- 2) Tipos usados pelo app.
create type public.pedido_status as enum (
  'recebido',
  'em_preparo',
  'saiu_entrega',
  'disponivel_retirada',
  'encerrado'
);

create type public.pedido_tipo as enum ('agora', 'encomenda');
create type public.entrega_tipo as enum ('entrega', 'retirada');
create type public.produto_tipo as enum ('produto', 'combo', 'adicional');
create type public.desconto_tipo as enum ('percentual', 'valor');

-- 3) Helpers.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admins autorizados a mexer no painel.
-- Depois de rodar este schema, insira o user_id do dono em public.app_admins.
create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

create function public.usuario_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins admin
    where admin.user_id = auth.uid()
  );
$$;

-- 4) Configuracao unica da loja.
create table public.configuracoes (
  id boolean primary key default true check (id = true),
  nome text not null default 'Casa Di Lari',
  whatsapp text not null default '',
  endereco text,
  status_aberto boolean not null default true,
  tempo_entrega_texto text,
  permite_encomendas boolean not null default true,
  encomenda_hora_inicio time not null default '18:00',
  encomenda_hora_fim time not null default '20:00',
  mensagem_aviso text not null default 'Escolha seus sabores e faca seu pedido.',
  imagem_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger configuracoes_set_updated_at
before update on public.configuracoes
for each row execute function public.set_updated_at();

-- 5) Cardapio.
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categorias_set_updated_at
before update on public.categorias
for each row execute function public.set_updated_at();

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias(id) on delete set null,
  nome text not null unique,
  descricao text,
  tipo public.produto_tipo not null default 'produto',
  imagem_url text,
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger produtos_set_updated_at
before update on public.produtos
for each row execute function public.set_updated_at();

create table public.produto_opcoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (produto_id, nome)
);

create trigger produto_opcoes_set_updated_at
before update on public.produto_opcoes
for each row execute function public.set_updated_at();

create table public.bordas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bordas_set_updated_at
before update on public.bordas
for each row execute function public.set_updated_at();

create table public.combo_config (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  desconto_tipo public.desconto_tipo not null default 'percentual',
  desconto_valor numeric(10,2) not null default 0 check (desconto_valor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger combo_config_set_updated_at
before update on public.combo_config
for each row execute function public.set_updated_at();

create table public.combo_itens (
  id uuid primary key default gen_random_uuid(),
  combo_produto_id uuid not null references public.produtos(id) on delete cascade,
  item_produto_id uuid not null references public.produtos(id) on delete restrict,
  item_opcao_id uuid references public.produto_opcoes(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0),
  ordem integer not null default 1,
  created_at timestamptz not null default now()
);

-- 6) Pedidos.
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated by default as identity,
  protocolo text not null unique,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  status public.pedido_status not null default 'recebido',
  tipo_pedido public.pedido_tipo not null default 'agora',
  data_encomenda date,
  hora_encomenda time,
  tipo_entrega public.entrega_tipo not null,
  endereco text,
  bairro text,
  referencia text,
  forma_pagamento text not null,
  troco text,
  total_calculado numeric(10,2) not null default 0 check (total_calculado >= 0),
  total_informado_cliente numeric(10,2),
  mensagem_whatsapp text,
  ip_hash text,
  user_agent text,
  encerrado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    tipo_entrega = 'retirada'
    or (coalesce(endereco, '') <> '' and coalesce(bairro, '') <> '')
  ),
  check (
    tipo_pedido = 'agora'
    or (data_encomenda is not null and hora_encomenda is not null)
  )
);

create trigger pedidos_set_updated_at
before update on public.pedidos
for each row execute function public.set_updated_at();

create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  produto_opcao_id uuid references public.produto_opcoes(id) on delete set null,
  borda_id uuid references public.bordas(id) on delete set null,
  nome_snapshot text not null,
  categoria_snapshot text,
  opcao_snapshot text,
  borda_snapshot text,
  quantidade integer not null default 1 check (quantidade > 0),
  preco_unitario_calculado numeric(10,2) not null check (preco_unitario_calculado >= 0),
  preco_borda_calculado numeric(10,2) not null default 0 check (preco_borda_calculado >= 0),
  observacao text,
  created_at timestamptz not null default now()
);

create table public.pedido_item_sabores (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_itens(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_snapshot text not null,
  created_at timestamptz not null default now()
);

create table public.pedido_item_adicionais (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_itens(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_snapshot text not null,
  preco_calculado numeric(10,2) not null default 0 check (preco_calculado >= 0),
  created_at timestamptz not null default now()
);

-- 7) Indices.
create index categorias_ordem_idx on public.categorias(ativo, ordem);
create index produtos_categoria_ordem_idx on public.produtos(categoria_id, ativo, ordem);
create index produtos_tipo_idx on public.produtos(tipo, ativo);
create index produto_opcoes_produto_idx on public.produto_opcoes(produto_id, ativo, ordem);
create index bordas_ordem_idx on public.bordas(ativo, ordem);
create index combo_itens_combo_idx on public.combo_itens(combo_produto_id, ordem);
create index pedidos_status_idx on public.pedidos(status, created_at desc);
create index pedidos_protocolo_idx on public.pedidos(protocolo);
create index pedidos_cliente_whatsapp_created_idx on public.pedidos(cliente_whatsapp, created_at desc);
create index pedido_itens_pedido_idx on public.pedido_itens(pedido_id);

-- 8) Protocolo automatico.
create function public.gerar_protocolo_pedido()
returns text
language plpgsql
as $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  resultado text := '';
  i integer;
begin
  for i in 1..12 loop
    resultado := resultado || substr(alfabeto, floor(random() * length(alfabeto) + 1)::integer, 1);
    if i in (4, 8) then
      resultado := resultado || '-';
    end if;
  end loop;

  return resultado;
end;
$$;

create function public.set_protocolo_pedido()
returns trigger
language plpgsql
as $$
begin
  if new.protocolo is null or new.protocolo = '' then
    loop
      new.protocolo := public.gerar_protocolo_pedido();
      exit when not exists (
        select 1 from public.pedidos where protocolo = new.protocolo
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger pedidos_set_protocolo
before insert on public.pedidos
for each row execute function public.set_protocolo_pedido();

-- 9) RLS.
alter table public.app_admins enable row level security;
alter table public.configuracoes enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_opcoes enable row level security;
alter table public.bordas enable row level security;
alter table public.combo_config enable row level security;
alter table public.combo_itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.pedido_item_sabores enable row level security;
alter table public.pedido_item_adicionais enable row level security;

create policy "Admins podem ler admins"
on public.app_admins
for select
to authenticated
using (public.usuario_admin() or user_id = auth.uid());

create policy "Publico le configuracoes"
on public.configuracoes
for select
to anon, authenticated
using (true);

create policy "Admins gerenciam configuracoes"
on public.configuracoes
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le categorias ativas"
on public.categorias
for select
to anon, authenticated
using (ativo = true);

create policy "Admins gerenciam categorias"
on public.categorias
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le produtos ativos"
on public.produtos
for select
to anon, authenticated
using (ativo = true);

create policy "Admins gerenciam produtos"
on public.produtos
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le opcoes ativas"
on public.produto_opcoes
for select
to anon, authenticated
using (
  ativo = true
  and exists (
    select 1
    from public.produtos produto
    where produto.id = produto_opcoes.produto_id
      and produto.ativo = true
  )
);

create policy "Admins gerenciam opcoes"
on public.produto_opcoes
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le bordas ativas"
on public.bordas
for select
to anon, authenticated
using (ativo = true);

create policy "Admins gerenciam bordas"
on public.bordas
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le combo config"
on public.combo_config
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.produtos produto
    where produto.id = combo_config.produto_id
      and produto.ativo = true
  )
);

create policy "Admins gerenciam combo config"
on public.combo_config
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Publico le itens de combo"
on public.combo_itens
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.produtos combo
    where combo.id = combo_itens.combo_produto_id
      and combo.ativo = true
  )
);

create policy "Admins gerenciam itens de combo"
on public.combo_itens
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Admins gerenciam pedidos"
on public.pedidos
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Admins gerenciam itens de pedidos"
on public.pedido_itens
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Admins gerenciam sabores de pedidos"
on public.pedido_item_sabores
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

create policy "Admins gerenciam adicionais de pedidos"
on public.pedido_item_adicionais
for all
to authenticated
using (public.usuario_admin())
with check (public.usuario_admin());

-- Consulta publica por protocolo sem expor lista de pedidos.
create function public.consultar_pedido_por_protocolo(protocolo_busca text)
returns table (
  protocolo text,
  numero bigint,
  status public.pedido_status,
  tipo_entrega public.entrega_tipo,
  tipo_pedido public.pedido_tipo,
  data_encomenda date,
  hora_encomenda time,
  total_calculado numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pedido.protocolo,
    pedido.numero,
    pedido.status,
    pedido.tipo_entrega,
    pedido.tipo_pedido,
    pedido.data_encomenda,
    pedido.hora_encomenda,
    pedido.total_calculado,
    pedido.created_at,
    pedido.updated_at
  from public.pedidos pedido
  where upper(pedido.protocolo) = upper(trim(protocolo_busca))
  limit 1;
$$;

grant execute on function public.consultar_pedido_por_protocolo(text) to anon, authenticated;

-- Cria pedido vindo da tela publica.
-- O cliente envia IDs e snapshots; o banco recalcula os precos reais.
create function public.criar_pedido_publico(payload jsonb)
returns table (
  id uuid,
  numero bigint,
  protocolo text,
  total_calculado numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido_id uuid;
  item jsonb;
  sabor jsonb;
  adicional jsonb;
  item_id uuid;
  produto_atual record;
  categoria_nome text;
  opcao_atual record;
  borda_atual record;
  adicional_atual record;
  quantidade_item integer;
  preco_item numeric(10,2);
  preco_borda numeric(10,2);
  total_pedido numeric(10,2) := 0;
  telefone_limpo text;
  pedidos_recentes integer;
begin
  telefone_limpo := regexp_replace(coalesce(payload->>'cliente_whatsapp', ''), '\D', '', 'g');

  if jsonb_array_length(coalesce(payload->'itens', '[]'::jsonb)) = 0 then
    raise exception 'Pedido sem itens.';
  end if;

  if length(trim(coalesce(payload->>'cliente_nome', ''))) = 0 then
    raise exception 'Nome do cliente obrigatorio.';
  end if;

  if length(telefone_limpo) not in (10, 11, 12, 13) then
    raise exception 'WhatsApp invalido.';
  end if;

  select count(*)
  into pedidos_recentes
  from public.pedidos pedido
  where pedido.cliente_whatsapp = telefone_limpo
    and pedido.created_at > now() - interval '5 minutes';

  if pedidos_recentes >= 3 then
    raise exception 'Muitos pedidos em sequencia. Tente novamente em alguns minutos.';
  end if;

  insert into public.pedidos (
    protocolo,
    cliente_nome,
    cliente_whatsapp,
    tipo_pedido,
    data_encomenda,
    hora_encomenda,
    tipo_entrega,
    endereco,
    bairro,
    referencia,
    forma_pagamento,
    troco,
    total_calculado,
    total_informado_cliente,
    mensagem_whatsapp,
    user_agent
  )
  values (
    '',
    trim(payload->>'cliente_nome'),
    telefone_limpo,
    coalesce((payload->>'tipo_pedido')::public.pedido_tipo, 'agora'),
    nullif(payload->>'data_encomenda', '')::date,
    nullif(payload->>'hora_encomenda', '')::time,
    coalesce((payload->>'tipo_entrega')::public.entrega_tipo, 'retirada'),
    nullif(trim(coalesce(payload->>'endereco', '')), ''),
    nullif(trim(coalesce(payload->>'bairro', '')), ''),
    nullif(trim(coalesce(payload->>'referencia', '')), ''),
    trim(payload->>'forma_pagamento'),
    nullif(trim(coalesce(payload->>'troco', '')), ''),
    0,
    nullif(payload->>'total_informado_cliente', '')::numeric,
    payload->>'mensagem_whatsapp',
    payload->>'user_agent'
  )
  returning public.pedidos.id into pedido_id;

  for item in select * from jsonb_array_elements(payload->'itens') loop
    quantidade_item := greatest(coalesce((item->>'quantidade')::integer, 1), 1);

    select produto.*, categoria.nome as categoria_nome
    into produto_atual
    from public.produtos produto
    left join public.categorias categoria on categoria.id = produto.categoria_id
    where produto.id = (item->>'produto_id')::uuid
      and produto.ativo = true;

    if produto_atual.id is null then
      raise exception 'Produto indisponivel.';
    end if;

    categoria_nome := coalesce(produto_atual.categoria_nome, item->>'categoria_snapshot');

    select opcao.*
    into opcao_atual
    from public.produto_opcoes opcao
    where opcao.id = nullif(item->>'opcao_id', '')::uuid
      and opcao.produto_id = produto_atual.id
      and opcao.ativo = true;

    if opcao_atual.id is null then
      select opcao.*
      into opcao_atual
      from public.produto_opcoes opcao
      where opcao.produto_id = produto_atual.id
        and opcao.ativo = true
      order by opcao.ordem, opcao.nome
      limit 1;
    end if;

    if opcao_atual.id is null then
      raise exception 'Opcao indisponivel.';
    end if;

    preco_item := opcao_atual.preco;
    preco_borda := 0;

    if nullif(item->>'borda_id', '') is not null then
      select borda.*
      into borda_atual
      from public.bordas borda
      where borda.id = (item->>'borda_id')::uuid
        and borda.ativo = true;

      if borda_atual.id is not null then
        preco_borda := borda_atual.preco;
      end if;
    end if;

    insert into public.pedido_itens (
      pedido_id,
      produto_id,
      produto_opcao_id,
      borda_id,
      nome_snapshot,
      categoria_snapshot,
      opcao_snapshot,
      borda_snapshot,
      quantidade,
      preco_unitario_calculado,
      preco_borda_calculado,
      observacao
    )
    values (
      pedido_id,
      produto_atual.id,
      opcao_atual.id,
      borda_atual.id,
      produto_atual.nome,
      categoria_nome,
      opcao_atual.nome,
      borda_atual.nome,
      quantidade_item,
      preco_item,
      preco_borda,
      nullif(trim(coalesce(item->>'observacao', '')), '')
    )
    returning public.pedido_itens.id into item_id;

    total_pedido := total_pedido + ((preco_item + preco_borda) * quantidade_item);

    for sabor in select * from jsonb_array_elements(coalesce(item->'sabores', '[]'::jsonb)) loop
      insert into public.pedido_item_sabores (
        pedido_item_id,
        produto_id,
        nome_snapshot
      )
      values (
        item_id,
        nullif(sabor->>'produto_id', '')::uuid,
        coalesce(nullif(sabor->>'nome', ''), 'Sabor')
      );
    end loop;

    for adicional in select * from jsonb_array_elements(coalesce(item->'adicionais', '[]'::jsonb)) loop
      select produto.*, opcao.preco as preco_adicional
      into adicional_atual
      from public.produtos produto
      join public.produto_opcoes opcao on opcao.produto_id = produto.id and opcao.ativo = true
      where produto.id = (adicional->>'produto_id')::uuid
        and produto.ativo = true
      order by opcao.ordem, opcao.nome
      limit 1;

      if adicional_atual.id is not null then
        insert into public.pedido_item_adicionais (
          pedido_item_id,
          produto_id,
          nome_snapshot,
          preco_calculado
        )
        values (
          item_id,
          adicional_atual.id,
          adicional_atual.nome,
          adicional_atual.preco_adicional
        );

        total_pedido := total_pedido + (adicional_atual.preco_adicional * quantidade_item);
      end if;
    end loop;
  end loop;

  update public.pedidos
  set total_calculado = total_pedido
  where public.pedidos.id = pedido_id;

  return query
  select pedido.id, pedido.numero, pedido.protocolo, pedido.total_calculado
  from public.pedidos pedido
  where pedido.id = pedido_id;
end;
$$;

grant execute on function public.criar_pedido_publico(jsonb) to anon, authenticated;

-- 9.1) Permissoes SQL para os roles da API.
-- RLS decide o que cada role pode fazer; estes grants apenas permitem que
-- PostgREST chegue nas tabelas/funcoes.
grant usage on schema public to anon, authenticated;

grant select on public.configuracoes to anon, authenticated;
grant select on public.categorias to anon, authenticated;
grant select on public.produtos to anon, authenticated;
grant select on public.produto_opcoes to anon, authenticated;
grant select on public.bordas to anon, authenticated;
grant select on public.combo_config to anon, authenticated;
grant select on public.combo_itens to anon, authenticated;

grant select on public.app_admins to authenticated;

grant all on public.configuracoes to authenticated;
grant all on public.categorias to authenticated;
grant all on public.produtos to authenticated;
grant all on public.produto_opcoes to authenticated;
grant all on public.bordas to authenticated;
grant all on public.combo_config to authenticated;
grant all on public.combo_itens to authenticated;
grant all on public.pedidos to authenticated;
grant all on public.pedido_itens to authenticated;
grant all on public.pedido_item_sabores to authenticated;
grant all on public.pedido_item_adicionais to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- 10) Seed inicial da loja.
insert into public.configuracoes (
  id,
  nome,
  whatsapp,
  endereco,
  status_aberto,
  tempo_entrega_texto,
  permite_encomendas,
  encomenda_hora_inicio,
  encomenda_hora_fim,
  mensagem_aviso
)
values (
  true,
  'Casa Di Lari',
  '',
  null,
  true,
  '30-45 min',
  true,
  '18:00',
  '20:00',
  'Escolha seus sabores e faca seu pedido.'
);

commit;

-- 11) Rode DEPOIS, em outro SQL, trocando pelo UUID do usuario dono:
--
-- insert into public.app_admins (user_id, nome)
-- values ('COLE_AQUI_O_UUID_DO_USUARIO', 'Dono');
