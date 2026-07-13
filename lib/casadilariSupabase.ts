import { supabase } from "@/lib/supabase";

export type ConfiguracaoLoja = {
  id: string;
  nome: string;
  slug: string;
  whatsapp: string;
  endereco?: string | null;
  status_aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  tempo_entrega_texto?: string | null;
  permite_encomendas: boolean;
  encomenda_hora_inicio?: string | null;
  encomenda_hora_fim?: string | null;
  mensagem_aviso: string | null;
  imagem_url?: string | null;
};

export type CategoriaCardapio = {
  id: string;
  nome: string;
  ordem?: number | null;
};

export type OpcaoCardapio = {
  id: string;
  produto_id: string;
  nome: string;
  preco: number;
};

export type ProdutoCardapio = {
  id: string;
  categoria_id: string | null;
  categoria: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean | null;
  imagem_url?: string | null;
  precoInicial: number | null;
  opcoes: OpcaoCardapio[];
  comboProdutoIds?: string[];
  comboProdutoOpcoes?: Record<string, string>;
  comboDescontoTipo?: "percentual" | "valor";
  comboDescontoValor?: number | null;
  comboPrecoOriginal?: number | null;
};

export type BordaCardapio = {
  id: string;
  nome: string;
  preco: number;
  ordem: number | null;
};

export type ItemPedidoApp = {
  id: string;
  produtoId?: string;
  nome: string;
  categoria: string;
  opcao: string;
  preco: number;
  sabores: { nome: string; produtoId?: string }[];
  borda: string;
  precoBorda: number;
  adicionais: { nome: string; preco: number; produtoId?: string }[];
  quantidade: number;
  observacao: string;
};

export type PedidoStatusApp =
  | "Recebido"
  | "Em preparo"
  | "Saiu pra entrega"
  | "Disponivel para retirada"
  | "Encerrado";

export type PedidoApp = {
  id: string;
  numero: number;
  protocolo?: string;
  cliente: string;
  telefone?: string;
  status: PedidoStatusApp;
  criadoEm: string;
  tipoPedido?: "Agora" | "Encomenda";
  dataEncomenda?: string | null;
  horaEncomenda?: string | null;
  tipoEntrega: "Entrega" | "Retirada";
  endereco: string;
  bairro: string;
  referencia: string;
  formaPagamento: string;
  troco: string;
  itens: ItemPedidoApp[];
  total: number;
  mensagem?: string;
};

type ConfiguracaoRow = {
  nome: string;
  whatsapp: string | null;
  endereco: string | null;
  status_aberto: boolean;
  tempo_entrega_texto: string | null;
  permite_encomendas: boolean | null;
  encomenda_hora_inicio: string | null;
  encomenda_hora_fim: string | null;
  mensagem_aviso: string | null;
  imagem_url: string | null;
};

type ProdutoRow = {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  ativo: boolean | null;
  imagem_url: string | null;
  ordem?: number | null;
  categorias?: { nome: string | null } | { nome: string | null }[] | null;
  produto_opcoes?: Array<{
    id: string;
    produto_id: string;
    nome: string;
    preco: number | string;
    ativo?: boolean | null;
    ordem?: number | null;
  }>;
};

type ComboConfigRow = {
  produto_id: string;
  desconto_tipo: "percentual" | "valor";
  desconto_valor: number | string;
};

type ComboItemRow = {
  combo_produto_id: string;
  item_produto_id: string;
  item_opcao_id: string | null;
};

type PedidoRow = {
  id: string;
  numero: number;
  protocolo: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  status: string;
  tipo_pedido: string;
  data_encomenda: string | null;
  hora_encomenda: string | null;
  tipo_entrega: string;
  endereco: string | null;
  bairro: string | null;
  referencia: string | null;
  forma_pagamento: string;
  troco: string | null;
  total_calculado: number | string;
  mensagem_whatsapp: string | null;
  created_at: string;
  pedido_itens?: Array<{
    id: string;
    produto_id: string | null;
    produto_opcao_id: string | null;
    borda_id: string | null;
    nome_snapshot: string;
    categoria_snapshot: string | null;
    opcao_snapshot: string | null;
    borda_snapshot: string | null;
    quantidade: number;
    preco_unitario_calculado: number | string;
    preco_borda_calculado: number | string;
    observacao: string | null;
    pedido_item_sabores?: Array<{
      id: string;
      produto_id: string | null;
      nome_snapshot: string;
    }>;
    pedido_item_adicionais?: Array<{
      id: string;
      produto_id: string | null;
      nome_snapshot: string;
      preco_calculado: number | string;
    }>;
  }>;
};

export const configuracaoPadrao: ConfiguracaoLoja = {
  id: "casa-di-lari",
  nome: "Casa Di Lari",
  slug: "casadilari",
  whatsapp: "",
  endereco: "",
  status_aberto: true,
  tempo_entrega_min: 30,
  tempo_entrega_max: 45,
  tempo_entrega_texto: "30-45 min",
  permite_encomendas: true,
  encomenda_hora_inicio: "18:00",
  encomenda_hora_fim: "20:00",
  mensagem_aviso: "Escolha seus sabores e faça seu pedido.",
  imagem_url: null,
};

function horaCurta(valor?: string | null) {
  return valor ? valor.slice(0, 5) : null;
}

function mapConfig(row: ConfiguracaoRow | null): ConfiguracaoLoja {
  if (!row) return configuracaoPadrao;

  return {
    ...configuracaoPadrao,
    nome: row.nome ?? configuracaoPadrao.nome,
    slug: row.nome ?? configuracaoPadrao.slug,
    whatsapp: row.whatsapp ?? "",
    endereco: row.endereco ?? "",
    status_aberto: Boolean(row.status_aberto),
    tempo_entrega_texto: row.tempo_entrega_texto,
    permite_encomendas: row.permite_encomendas ?? true,
    encomenda_hora_inicio: horaCurta(row.encomenda_hora_inicio) ?? "18:00",
    encomenda_hora_fim: horaCurta(row.encomenda_hora_fim) ?? "20:00",
    mensagem_aviso: row.mensagem_aviso ?? configuracaoPadrao.mensagem_aviso,
    imagem_url: row.imagem_url,
  };
}

export async function carregarConfiguracaoLoja() {
  const { data, error } = await supabase
    .from("configuracoes")
    .select(
      "nome, whatsapp, endereco, status_aberto, tempo_entrega_texto, permite_encomendas, encomenda_hora_inicio, encomenda_hora_fim, mensagem_aviso, imagem_url"
    )
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;
  return mapConfig(data as ConfiguracaoRow | null);
}

export async function salvarConfiguracaoLoja(config: ConfiguracaoLoja) {
  const { data, error } = await supabase
    .from("configuracoes")
    .upsert({
      id: true,
      nome: config.nome,
      whatsapp: config.whatsapp,
      endereco: config.endereco || null,
      status_aberto: config.status_aberto,
      tempo_entrega_texto: config.tempo_entrega_texto || null,
      permite_encomendas: config.permite_encomendas,
      encomenda_hora_inicio: config.encomenda_hora_inicio || "18:00",
      encomenda_hora_fim: config.encomenda_hora_fim || "20:00",
      mensagem_aviso: config.mensagem_aviso || configuracaoPadrao.mensagem_aviso,
      imagem_url: config.imagem_url || null,
    })
    .select(
      "nome, whatsapp, endereco, status_aberto, tempo_entrega_texto, permite_encomendas, encomenda_hora_inicio, encomenda_hora_fim, mensagem_aviso, imagem_url"
    )
    .single();

  if (error) throw error;
  return mapConfig(data as ConfiguracaoRow);
}

export async function carregarCardapio() {
  const [categoriasResult, produtosResult, bordasResult, comboConfigResult, comboItensResult] =
    await Promise.all([
      supabase.from("categorias").select("id, nome, ordem").eq("ativo", true).order("ordem"),
      supabase
        .from("produtos")
        .select(
          "id, categoria_id, nome, descricao, tipo, ativo, imagem_url, ordem, categorias(nome), produto_opcoes(id, produto_id, nome, preco, ativo, ordem)"
        )
        .eq("ativo", true)
        .order("ordem"),
      supabase.from("bordas").select("id, nome, preco, ordem").eq("ativo", true).order("ordem"),
      supabase.from("combo_config").select("produto_id, desconto_tipo, desconto_valor"),
      supabase.from("combo_itens").select("combo_produto_id, item_produto_id, item_opcao_id"),
    ]);

  if (categoriasResult.error) throw categoriasResult.error;
  if (produtosResult.error) throw produtosResult.error;
  if (bordasResult.error) throw bordasResult.error;
  if (comboConfigResult.error) throw comboConfigResult.error;
  if (comboItensResult.error) throw comboItensResult.error;

  const comboConfigs = new Map(
    ((comboConfigResult.data ?? []) as ComboConfigRow[]).map((config) => [
      config.produto_id,
      config,
    ])
  );
  const comboItens = ((comboItensResult.data ?? []) as ComboItemRow[]).reduce(
    (mapa, item) => {
      const atuais = mapa.get(item.combo_produto_id) ?? [];
      atuais.push(item);
      mapa.set(item.combo_produto_id, atuais);
      return mapa;
    },
    new Map<string, ComboItemRow[]>()
  );

  const categorias = ((categoriasResult.data ?? []) as CategoriaCardapio[]).sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
  );

  const produtos = ((produtosResult.data ?? []) as unknown as ProdutoRow[]).map((produto) => {
    const categoriaRelacao = Array.isArray(produto.categorias)
      ? produto.categorias[0]
      : produto.categorias;
    const opcoes = (produto.produto_opcoes ?? [])
      .filter((opcao) => opcao.ativo !== false)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((opcao) => ({
        id: opcao.id,
        produto_id: opcao.produto_id,
        nome: opcao.nome,
        preco: Number(opcao.preco),
      }));
    const precos = opcoes.map((opcao) => opcao.preco);
    const comboConfig = comboConfigs.get(produto.id);
    const itensCombo = comboItens.get(produto.id) ?? [];

    return {
      id: produto.id,
      categoria_id: produto.categoria_id,
      categoria: categoriaRelacao?.nome ?? "Cardápio",
      nome: produto.nome,
      descricao: produto.descricao,
      tipo: produto.tipo,
      ativo: produto.ativo,
      imagem_url: produto.imagem_url,
      precoInicial: precos.length > 0 ? Math.min(...precos) : null,
      opcoes,
      comboProdutoIds: itensCombo.map((item) => item.item_produto_id),
      comboProdutoOpcoes: Object.fromEntries(
        itensCombo
          .filter((item) => item.item_opcao_id)
          .map((item) => [item.item_produto_id, item.item_opcao_id as string])
      ),
      comboDescontoTipo: comboConfig?.desconto_tipo,
      comboDescontoValor: comboConfig ? Number(comboConfig.desconto_valor) : null,
    } satisfies ProdutoCardapio;
  });

  const bordas = ((bordasResult.data ?? []) as BordaCardapio[]).map((borda) => ({
    ...borda,
    preco: Number(borda.preco),
  }));

  return { categorias, produtos, bordas };
}

export async function criarCategoria(nome: string, ordem: number) {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nome, ordem, ativo: true })
    .select("id, nome, ordem")
    .single();

  if (error) throw error;
  return data as CategoriaCardapio;
}

export async function salvarOrdemCategoriasBanco(categorias: CategoriaCardapio[]) {
  const { error } = await supabase.from("categorias").upsert(
    categorias.map((categoria, index) => ({
      id: categoria.id,
      nome: categoria.nome,
      ordem: index + 1,
      ativo: true,
    }))
  );

  if (error) throw error;
}

export async function salvarBordaBanco(borda: Partial<BordaCardapio> & { nome: string; preco: number }) {
  const payload = {
    nome: borda.nome,
    preco: borda.preco,
    ordem: borda.ordem ?? 1,
    ativo: true,
  };

  const query = borda.id
    ? supabase.from("bordas").update(payload).eq("id", borda.id)
    : supabase.from("bordas").insert(payload);
  const { data, error } = await query.select("id, nome, preco, ordem").single();

  if (error) throw error;
  return { ...(data as BordaCardapio), preco: Number((data as BordaCardapio).preco) };
}

export async function excluirBordaBanco(id: string) {
  const { error } = await supabase.from("bordas").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

export async function salvarProdutoBanco(produto: ProdutoCardapio) {
  const tipo = produto.comboProdutoIds?.length ? "combo" : produto.tipo === "adicional" ? "adicional" : "produto";
  const produtoPayload = {
    categoria_id: produto.categoria_id,
    nome: produto.nome,
    descricao: produto.descricao,
    tipo,
    imagem_url: produto.imagem_url ?? null,
    ativo: true,
  };

  const produtoResult = produto.id
    ? await supabase.from("produtos").update(produtoPayload).eq("id", produto.id).select("id").single()
    : await supabase.from("produtos").insert(produtoPayload).select("id").single();

  if (produtoResult.error) throw produtoResult.error;
  const produtoId = (produtoResult.data as { id: string }).id;

  await supabase.from("produto_opcoes").delete().eq("produto_id", produtoId);
  if (produto.opcoes.length > 0) {
    const { error } = await supabase.from("produto_opcoes").insert(
      produto.opcoes.map((opcao, index) => ({
        produto_id: produtoId,
        nome: opcao.nome,
        preco: opcao.preco,
        ordem: index + 1,
        ativo: true,
      }))
    );
    if (error) throw error;
  }

  await supabase.from("combo_config").delete().eq("produto_id", produtoId);
  await supabase.from("combo_itens").delete().eq("combo_produto_id", produtoId);
  if (tipo === "combo") {
    const { error: comboConfigError } = await supabase.from("combo_config").insert({
      produto_id: produtoId,
      desconto_tipo: produto.comboDescontoTipo ?? "percentual",
      desconto_valor: produto.comboDescontoValor ?? 0,
    });
    if (comboConfigError) throw comboConfigError;

    if (produto.comboProdutoIds?.length) {
      const { error: comboItensError } = await supabase.from("combo_itens").insert(
        produto.comboProdutoIds.map((itemProdutoId, index) => ({
          combo_produto_id: produtoId,
          item_produto_id: itemProdutoId,
          item_opcao_id: produto.comboProdutoOpcoes?.[itemProdutoId] ?? null,
          ordem: index + 1,
        }))
      );
      if (comboItensError) throw comboItensError;
    }
  }

  return produtoId;
}

export async function excluirProdutoBanco(id: string) {
  const { error } = await supabase.from("produtos").update({ ativo: false }).eq("id", id);
  if (error) throw error;
}

function mapStatusParaBanco(status: PedidoStatusApp) {
  if (status === "Em preparo") return "em_preparo";
  if (status === "Saiu pra entrega") return "saiu_entrega";
  if (status === "Disponivel para retirada") return "disponivel_retirada";
  if (status === "Encerrado") return "encerrado";
  return "recebido";
}

function mapStatusDoBanco(status: string): PedidoStatusApp {
  if (status === "em_preparo") return "Em preparo";
  if (status === "saiu_entrega") return "Saiu pra entrega";
  if (status === "disponivel_retirada") return "Disponivel para retirada";
  if (status === "encerrado") return "Encerrado";
  return "Recebido";
}

function mapPedido(row: PedidoRow): PedidoApp {
  return {
    id: row.id,
    numero: Number(row.numero),
    protocolo: row.protocolo,
    cliente: row.cliente_nome,
    telefone: row.cliente_whatsapp,
    status: mapStatusDoBanco(row.status),
    criadoEm: row.created_at,
    tipoPedido: row.tipo_pedido === "encomenda" ? "Encomenda" : "Agora",
    dataEncomenda: row.data_encomenda,
    horaEncomenda: horaCurta(row.hora_encomenda),
    tipoEntrega: row.tipo_entrega === "entrega" ? "Entrega" : "Retirada",
    endereco: row.endereco ?? "",
    bairro: row.bairro ?? "",
    referencia: row.referencia ?? "",
    formaPagamento: row.forma_pagamento,
    troco: row.troco ?? "",
    total: Number(row.total_calculado),
    mensagem: row.mensagem_whatsapp ?? "",
    itens: (row.pedido_itens ?? []).map((item) => ({
      id: item.id,
      produtoId: item.produto_id ?? undefined,
      nome: item.nome_snapshot,
      categoria: item.categoria_snapshot ?? "",
      opcao: item.opcao_snapshot ?? "",
      preco: Number(item.preco_unitario_calculado),
      sabores: (item.pedido_item_sabores ?? []).map((sabor) => ({
        nome: sabor.nome_snapshot,
        produtoId: sabor.produto_id ?? undefined,
      })),
      borda: item.borda_snapshot ?? "Sem borda",
      precoBorda: Number(item.preco_borda_calculado),
      adicionais: (item.pedido_item_adicionais ?? []).map((adicional) => ({
        nome: adicional.nome_snapshot,
        preco: Number(adicional.preco_calculado),
        produtoId: adicional.produto_id ?? undefined,
      })),
      quantidade: item.quantidade,
      observacao: item.observacao ?? "",
    })),
  };
}

export async function carregarPedidosBanco(status?: PedidoStatusApp) {
  let query = supabase
    .from("pedidos")
    .select(
      "*, pedido_itens(*, pedido_item_sabores(*), pedido_item_adicionais(*))"
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", mapStatusParaBanco(status));

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as PedidoRow[]).map(mapPedido);
}

export async function atualizarStatusPedidoBanco(id: string, status: PedidoStatusApp) {
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: mapStatusParaBanco(status),
      encerrado_em: status === "Encerrado" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function criarPedidoPublico(payload: unknown) {
  const { data, error } = await supabase.rpc("criar_pedido_publico", { payload });
  if (error) throw error;
  const pedido = Array.isArray(data) ? data[0] : data;
  return pedido as { id: string; numero: number; protocolo: string; total_calculado: number };
}

export async function consultarPedidoPorProtocolo(protocolo: string) {
  const { data, error } = await supabase.rpc("consultar_pedido_por_protocolo", {
    protocolo_busca: protocolo,
  });

  if (error) throw error;
  const pedido = Array.isArray(data) ? data[0] : null;
  if (!pedido) return null;

  return {
    id: pedido.protocolo,
    numero: Number(pedido.numero),
    protocolo: pedido.protocolo,
    cliente: "",
    telefone: "",
    status: mapStatusDoBanco(pedido.status),
    criadoEm: pedido.created_at,
    tipoPedido: pedido.tipo_pedido === "encomenda" ? "Encomenda" : "Agora",
    dataEncomenda: pedido.data_encomenda,
    horaEncomenda: horaCurta(pedido.hora_encomenda),
    tipoEntrega: pedido.tipo_entrega === "entrega" ? "Entrega" : "Retirada",
    endereco: "",
    bairro: "",
    referencia: "",
    formaPagamento: "",
    troco: "",
    itens: [],
    total: Number(pedido.total_calculado),
    mensagem: "",
  } satisfies PedidoApp;
}
