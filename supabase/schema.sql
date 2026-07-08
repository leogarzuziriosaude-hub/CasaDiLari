-- Casa Di Lari - schema base para Supabase
-- Rode este arquivo no SQL Editor do Supabase somente depois de revisar.
--
-- Este projeto e uma loja unica por enquanto. Se virar SaaS depois,
-- a coluna loja_id ja deixa o caminho preparado.

begin;

create extension if not exists pgcrypto;

-- Reset opcional para ambiente limpo.
-- Descomente apenas se tiver certeza de que pode apagar as tabelas antigas.
/*
drop table if exists public.pedido_item_adicionais cascade;
drop table if exists public.pedido_item_sabores cascade;
drop table if exists public.pedido_itens cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.combo_itens cascade;
drop table if exists public.combo_config cascade;
drop table if exists public.produto_opcoes cascade;
drop table if exists public.produtos cascade;
drop table if exists public.bordas cascade;
drop table if exists public.categorias cascade;
drop table if exists public.loja_config cascade;
drop table if exists public.loja_admins cascade;
drop type if exists public.pedido_status cascade;
drop type if exists public.pedido_tipo cascade;
drop type if exists public.entrega_tipo cascade;
drop type if exists public.produto_tipo cascade;
drop type if exists public.desconto_tipo cascade;
*/

do $$
begin
  create type public.pedido_status as enum (
    'recebido',
    'em_preparo',
    'saiu_entrega',
    'disponivel_retirada',
    'encerrado'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pedido_tipo as enum ('agora', 'encomenda');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.entrega_tipo as enum ('entrega', 'retirada');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.produto_tipo as enum ('item', 'combo', 'adicional');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.desconto_tipo as enum ('percentual', 'valor');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.loja_config (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Casa Di Lari',
  whatsapp text not null default '',
  endereco text,
  status_aberto boolean not null default true,
  tempo_entrega_texto text,
  encomenda_hora_inicio time not null default '18:00',
  encomenda_hora_fim time not null default '20:00',
  mensagem_aviso text not null default 'Escolha seus sabores e faça seu pedido.',
  imagem_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loja_admins (
  loja_id uuid not null references public.loja_config(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (loja_id, user_id)
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.loja_config(id) on delete cascade,
  nome text not null,
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id, nome)
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.loja_config(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nome text not null,
  descricao text,
  tipo public.produto_tipo not null default 'item',
  imagem_url text,
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id, nome)
);

create table if not exists public.produto_opcoes (
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

create table if not exists public.bordas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.loja_config(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loja_id, nome)
);

create table if not exists public.combo_config (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  desconto_tipo public.desconto_tipo not null default 'percentual',
  desconto_valor numeric(10,2) not null default 0 check (desconto_valor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.combo_itens (
  id uuid primary key default gen_random_uuid(),
  combo_produto_id uuid not null references public.produtos(id) on delete cascade,
  item_produto_id uuid not null references public.produtos(id) on delete restrict,
  item_opcao_id uuid references public.produto_opcoes(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0),
  ordem integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.loja_config(id) on delete cascade,
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

create table if not exists public.pedido_itens (
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

create table if not exists public.pedido_item_sabores (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_itens(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_snapshot text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pedido_item_adicionais (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references public.pedido_itens(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_snapshot text not null,
  preco_calculado numeric(10,2) not null default 0 check (preco_calculado >= 0),
  created_at timestamptz not null default now()
);

create index if not exists categorias_loja_ordem_idx on public.categorias(loja_id, ativo, ordem);
create index if not exists produtos_loja_categoria_idx on public.produtos(loja_id, categoria_id, ativo, ordem);
create index if not exists produto_opcoes_produto_idx on public.produto_opcoes(produto_id, ativo, ordem);
create index if not exists bordas_loja_ordem_idx on public.bordas(loja_id, ativo, ordem);
create index if not exists pedidos_loja_status_idx on public.pedidos(loja_id, status, created_at desc);
create index if not exists pedidos_protocolo_idx on public.pedidos(protocolo);
create index if not exists pedidos_cliente_whatsapp_created_idx on public.pedidos(cliente_whatsapp, created_at desc);
create index if not exists pedido_itens_pedido_idx on public.pedido_itens(pedido_id);

drop trigger if exists loja_config_set_updated_at on public.loja_config;
create trigger loja_config_set_updated_at
before update on public.loja_config
for each row execute function public.set_updated_at();

drop trigger if exists categorias_set_updated_at on public.categorias;
create trigger categorias_set_updated_at
before update on public.categorias
for each row execute function public.set_updated_at();

drop trigger if exists produtos_set_updated_at on public.produtos;
create trigger produtos_set_updated_at
before update on public.produtos
for each row execute function public.set_updated_at();

drop trigger if exists produto_opcoes_set_updated_at on public.produto_opcoes;
create trigger produto_opcoes_set_updated_at
before update on public.produto_opcoes
for each row execute function public.set_updated_at();

drop trigger if exists bordas_set_updated_at on public.bordas;
create trigger bordas_set_updated_at
before update on public.bordas
for each row execute function public.set_updated_at();

drop trigger if exists combo_config_set_updated_at on public.combo_config;
create trigger combo_config_set_updated_at
before update on public.combo_config
for each row execute function public.set_updated_at();

drop trigger if exists pedidos_set_updated_at on public.pedidos;
create trigger pedidos_set_updated_at
before update on public.pedidos
for each row execute function public.set_updated_at();

create or replace function public.usuario_admin_da_loja(loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.loja_admins admin
    where admin.loja_id = loja
      and admin.user_id = auth.uid()
  );
$$;

create or replace function public.gerar_protocolo_pedido()
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

create or replace function public.set_protocolo_pedido()
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

drop trigger if exists pedidos_set_protocolo on public.pedidos;
create trigger pedidos_set_protocolo
before insert on public.pedidos
for each row execute function public.set_protocolo_pedido();

alter table public.loja_config enable row level security;
alter table public.loja_admins enable row level security;
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

drop policy if exists "Publico le configuracao da loja" on public.loja_config;
create policy "Publico le configuracao da loja"
on public.loja_config
for select
to anon, authenticated
using (true);

drop policy if exists "Admins gerenciam configuracao da loja" on public.loja_config;
create policy "Admins gerenciam configuracao da loja"
on public.loja_config
for all
to authenticated
using (public.usuario_admin_da_loja(id))
with check (public.usuario_admin_da_loja(id));

drop policy if exists "Admins leem vinculos de admin" on public.loja_admins;
create policy "Admins leem vinculos de admin"
on public.loja_admins
for select
to authenticated
using (user_id = auth.uid() or public.usuario_admin_da_loja(loja_id));

drop policy if exists "Publico le categorias ativas" on public.categorias;
create policy "Publico le categorias ativas"
on public.categorias
for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Admins gerenciam categorias" on public.categorias;
create policy "Admins gerenciam categorias"
on public.categorias
for all
to authenticated
using (public.usuario_admin_da_loja(loja_id))
with check (public.usuario_admin_da_loja(loja_id));

drop policy if exists "Publico le produtos ativos" on public.produtos;
create policy "Publico le produtos ativos"
on public.produtos
for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Admins gerenciam produtos" on public.produtos;
create policy "Admins gerenciam produtos"
on public.produtos
for all
to authenticated
using (public.usuario_admin_da_loja(loja_id))
with check (public.usuario_admin_da_loja(loja_id));

drop policy if exists "Publico le opcoes ativas" on public.produto_opcoes;
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

drop policy if exists "Admins gerenciam opcoes" on public.produto_opcoes;
create policy "Admins gerenciam opcoes"
on public.produto_opcoes
for all
to authenticated
using (
  exists (
    select 1
    from public.produtos produto
    where produto.id = produto_opcoes.produto_id
      and public.usuario_admin_da_loja(produto.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.produtos produto
    where produto.id = produto_opcoes.produto_id
      and public.usuario_admin_da_loja(produto.loja_id)
  )
);

drop policy if exists "Publico le bordas ativas" on public.bordas;
create policy "Publico le bordas ativas"
on public.bordas
for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Admins gerenciam bordas" on public.bordas;
create policy "Admins gerenciam bordas"
on public.bordas
for all
to authenticated
using (public.usuario_admin_da_loja(loja_id))
with check (public.usuario_admin_da_loja(loja_id));

drop policy if exists "Publico le combo config" on public.combo_config;
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

drop policy if exists "Admins gerenciam combo config" on public.combo_config;
create policy "Admins gerenciam combo config"
on public.combo_config
for all
to authenticated
using (
  exists (
    select 1
    from public.produtos produto
    where produto.id = combo_config.produto_id
      and public.usuario_admin_da_loja(produto.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.produtos produto
    where produto.id = combo_config.produto_id
      and public.usuario_admin_da_loja(produto.loja_id)
  )
);

drop policy if exists "Publico le itens de combo" on public.combo_itens;
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

drop policy if exists "Admins gerenciam itens de combo" on public.combo_itens;
create policy "Admins gerenciam itens de combo"
on public.combo_itens
for all
to authenticated
using (
  exists (
    select 1
    from public.produtos combo
    where combo.id = combo_itens.combo_produto_id
      and public.usuario_admin_da_loja(combo.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.produtos combo
    where combo.id = combo_itens.combo_produto_id
      and public.usuario_admin_da_loja(combo.loja_id)
  )
);

drop policy if exists "Publico consulta pedido por protocolo" on public.pedidos;
drop policy if exists "Publico cria pedido" on public.pedidos;

drop policy if exists "Admins gerenciam pedidos" on public.pedidos;
create policy "Admins gerenciam pedidos"
on public.pedidos
for all
to authenticated
using (public.usuario_admin_da_loja(loja_id))
with check (public.usuario_admin_da_loja(loja_id));

drop policy if exists "Admins gerenciam itens de pedidos" on public.pedido_itens;
create policy "Admins gerenciam itens de pedidos"
on public.pedido_itens
for all
to authenticated
using (
  exists (
    select 1
    from public.pedidos pedido
    where pedido.id = pedido_itens.pedido_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.pedidos pedido
    where pedido.id = pedido_itens.pedido_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
);

drop policy if exists "Publico le sabores de pedidos" on public.pedido_item_sabores;
drop policy if exists "Publico cria sabores de pedidos" on public.pedido_item_sabores;

drop policy if exists "Publico le adicionais de pedidos" on public.pedido_item_adicionais;
drop policy if exists "Publico cria adicionais de pedidos" on public.pedido_item_adicionais;

drop policy if exists "Admins gerenciam sabores de pedidos" on public.pedido_item_sabores;
create policy "Admins gerenciam sabores de pedidos"
on public.pedido_item_sabores
for all
to authenticated
using (
  exists (
    select 1
    from public.pedido_itens item
    join public.pedidos pedido on pedido.id = item.pedido_id
    where item.id = pedido_item_sabores.pedido_item_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.pedido_itens item
    join public.pedidos pedido on pedido.id = item.pedido_id
    where item.id = pedido_item_sabores.pedido_item_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
);

drop policy if exists "Admins gerenciam adicionais de pedidos" on public.pedido_item_adicionais;
create policy "Admins gerenciam adicionais de pedidos"
on public.pedido_item_adicionais
for all
to authenticated
using (
  exists (
    select 1
    from public.pedido_itens item
    join public.pedidos pedido on pedido.id = item.pedido_id
    where item.id = pedido_item_adicionais.pedido_item_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
)
with check (
  exists (
    select 1
    from public.pedido_itens item
    join public.pedidos pedido on pedido.id = item.pedido_id
    where item.id = pedido_item_adicionais.pedido_item_id
      and public.usuario_admin_da_loja(pedido.loja_id)
  )
);

create or replace function public.consultar_pedido_por_protocolo(protocolo_busca text)
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

-- Seed inicial da loja.
insert into public.loja_config (
  id,
  nome,
  whatsapp,
  endereco,
  status_aberto,
  tempo_entrega_texto,
  encomenda_hora_inicio,
  encomenda_hora_fim,
  mensagem_aviso
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Casa Di Lari',
  '',
  null,
  true,
  '30-45 min',
  '18:00',
  '20:00',
  'Escolha seus sabores e faça seu pedido.'
)
on conflict (id) do nothing;

commit;

-- Depois de rodar o schema, vincule seu usuario do Supabase Auth como admin:
-- insert into public.loja_admins (loja_id, user_id)
-- values ('00000000-0000-0000-0000-000000000001', 'COLE_AQUI_O_UUID_DO_USUARIO');
