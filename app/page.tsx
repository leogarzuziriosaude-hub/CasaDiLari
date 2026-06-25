"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useModalClose } from "@/lib/useModalClose";

type TipoProduto = "pizza" | "bebida" | "sobremesa" | "combo" | "adicional";

type OpcaoProduto = {
  id: string;
  nome: string;
  preco: number;
};

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: TipoProduto;
  destaque: boolean;
  imagemUrl: string | null;
  opcoes: OpcaoProduto[];
};

type Borda = {
  id: string;
  nome: string;
  preco: number;
};

type Pizzaria = {
  id: string;
  nome: string;
  whatsapp: string;
  status_aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  mensagem_aviso: string | null;
};

type CategoriaBanco = {
  id: string;
  nome: string;
};

type ProdutoBanco = {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  destaque: boolean | null;
  imagem_url?: string | null;
};

type OpcaoBanco = {
  id: string;
  produto_id: string;
  nome: string;
  preco: number;
};

type ItemCarrinho = {
  id: string;
  produtoId: string;
  nome: string;
  tipo: TipoProduto;
  opcao: string;
  preco: number;
  borda: string;
  precoBorda: number;
  adicionais: {
    nome: string;
    preco: number;
  }[];
  quantidade: number;
  observacao: string;
};

const formasPagamento = ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"];

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarTipo(tipo: string | null): TipoProduto {
  if (
    tipo === "bebida" ||
    tipo === "sobremesa" ||
    tipo === "combo" ||
    tipo === "adicional"
  ) {
    return tipo;
  }

  return "pizza";
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export default function Home() {
  const [pizzaria, setPizzaria] = useState<Pizzaria | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [bordas, setBordas] = useState<Borda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todos");

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<OpcaoProduto | null>(null);
  const [bordaSelecionada, setBordaSelecionada] = useState<Borda | null>(null);
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null);

  const [nomeCliente, setNomeCliente] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"Entrega" | "Retirada">("Entrega");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [troco, setTroco] = useState("");
  const produtoModalRef = useRef<HTMLDivElement | null>(null);

  const fecharProduto = useCallback(() => {
    setProdutoSelecionado(null);
    setItemEditandoId(null);
  }, []);

  useModalClose(Boolean(produtoSelecionado), fecharProduto, produtoModalRef);

  useEffect(() => {
    async function carregarCardapio() {
      setCarregando(true);
      setErro("");

      const { data: pizzariaData, error: pizzariaError } = await supabase
        .from("pizzarias")
        .select("id, nome, whatsapp, status_aberto, tempo_entrega_min, tempo_entrega_max, mensagem_aviso")
        .eq("slug", "casadilari")
        .single();

      if (pizzariaError || !pizzariaData) {
        setErro("Não foi possível carregar os dados da pizzaria.");
        setCarregando(false);
        return;
      }

      setPizzaria(pizzariaData);

      const [categoriasResult, produtosComImagemResult, opcoesResult, bordasResult] = await Promise.all([
        supabase
          .from("categorias")
          .select("id, nome")
          .eq("pizzaria_id", pizzariaData.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("produtos")
          .select("id, categoria_id, nome, descricao, tipo, destaque, imagem_url")
          .eq("pizzaria_id", pizzariaData.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("produto_opcoes")
          .select("id, produto_id, nome, preco")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
        supabase
          .from("bordas")
          .select("id, nome, preco")
          .eq("pizzaria_id", pizzariaData.id)
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
      ]);

      const produtosResult = produtosComImagemResult.error?.message.includes("imagem_url")
        ? await supabase
            .from("produtos")
            .select("id, categoria_id, nome, descricao, tipo, destaque")
            .eq("pizzaria_id", pizzariaData.id)
            .eq("ativo", true)
            .order("ordem", { ascending: true })
        : produtosComImagemResult;

      const erroConsulta =
        categoriasResult.error || produtosResult.error || opcoesResult.error || bordasResult.error;

      if (erroConsulta) {
        setErro("Não foi possível carregar o cardápio do banco de dados.");
        setCarregando(false);
        return;
      }

      const categoriasPorId = new Map(
        ((categoriasResult.data ?? []) as CategoriaBanco[]).map((categoria) => [
          categoria.id,
          categoria.nome,
        ])
      );

      const opcoesPorProduto = ((opcoesResult.data ?? []) as OpcaoBanco[]).reduce(
        (mapa, opcao) => {
          const opcoes = mapa.get(opcao.produto_id) ?? [];
          opcoes.push({
            id: opcao.id,
            nome: opcao.nome,
            preco: Number(opcao.preco),
          });
          mapa.set(opcao.produto_id, opcoes);
          return mapa;
        },
        new Map<string, OpcaoProduto[]>()
      );

      const produtosMontados = ((produtosResult.data ?? []) as ProdutoBanco[])
        .map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          categoria: produto.categoria_id
            ? categoriasPorId.get(produto.categoria_id) ?? "Cardápio"
            : "Cardápio",
          descricao: produto.descricao ?? "",
          tipo: normalizarTipo(produto.tipo),
          destaque: Boolean(produto.destaque),
          imagemUrl: produto.imagem_url ?? null,
          opcoes: opcoesPorProduto.get(produto.id) ?? [],
        }))
        .filter((produto) => produto.opcoes.length > 0);

      setProdutos(produtosMontados);
      setBordas(((bordasResult.data ?? []) as Borda[]).map((borda) => ({
        ...borda,
        preco: Number(borda.preco),
      })));
      setCarregando(false);
    }

    carregarCardapio();
  }, []);

  const produtosDeVenda = useMemo(() => {
    return produtos.filter((produto) => produto.tipo !== "adicional");
  }, [produtos]);

  const adicionais = useMemo(() => {
    return produtos.filter((produto) => produto.tipo === "adicional");
  }, [produtos]);

  const categorias = useMemo(() => {
    return ["Todos", ...Array.from(new Set(produtosDeVenda.map((produto) => produto.categoria)))];
  }, [produtosDeVenda]);

  const hero = produtosDeVenda[0] ?? null;

  const produtosFiltrados = useMemo(() => {
    if (categoriaSelecionada === "Todos") return produtosDeVenda;
    return produtosDeVenda.filter((produto) => produto.categoria === categoriaSelecionada);
  }, [categoriaSelecionada, produtosDeVenda]);

  const total = useMemo(() => {
    return carrinho.reduce((soma, item) => {
      const totalAdicionais = item.adicionais.reduce(
        (subtotal, adicional) => subtotal + adicional.preco,
        0
      );
      return soma + (item.preco + item.precoBorda + totalAdicionais) * item.quantidade;
    }, 0);
  }, [carrinho]);

  const totalItens = useMemo(() => {
    return carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  }, [carrinho]);

  function abrirProduto(produto: Produto) {
    setProdutoSelecionado(produto);
    setOpcaoSelecionada(produto.opcoes[0] ?? null);
    setBordaSelecionada(null);
    setAdicionaisSelecionados([]);
    setQuantidade(1);
    setObservacao("");
    setItemEditandoId(null);
  }

  function editarItemCarrinho(item: ItemCarrinho) {
    const produto =
      produtos.find((produtoItem) => produtoItem.id === item.produtoId) ??
      produtos.find((produtoItem) => produtoItem.nome === item.nome && produtoItem.tipo === item.tipo);

    if (!produto) return;

    setProdutoSelecionado(produto);
    setOpcaoSelecionada(
      produto.opcoes.find((opcao) => opcao.nome === item.opcao) ?? produto.opcoes[0] ?? null
    );
    setBordaSelecionada(bordas.find((borda) => borda.nome === item.borda) ?? null);
    setAdicionaisSelecionados(
      adicionais
        .filter((adicional) => item.adicionais.some((itemAdicional) => itemAdicional.nome === adicional.nome))
        .map((adicional) => adicional.id)
    );
    setQuantidade(item.quantidade);
    setObservacao(item.observacao);
    setItemEditandoId(item.id);
  }

  function adicionarAoCarrinho() {
    if (!produtoSelecionado || !opcaoSelecionada) return;

    const borda = produtoSelecionado.tipo === "pizza" ? bordaSelecionada : null;
    const adicionaisDoItem =
      produtoSelecionado.tipo === "pizza"
        ? adicionais
            .filter((adicional) => adicionaisSelecionados.includes(adicional.id))
            .map((adicional) => ({
              nome: adicional.nome,
              preco: adicional.opcoes[0]?.preco ?? 0,
            }))
        : [];

    const novoItem: ItemCarrinho = {
      id: itemEditandoId ?? crypto.randomUUID(),
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      tipo: produtoSelecionado.tipo,
      opcao: opcaoSelecionada.nome,
      preco: opcaoSelecionada.preco,
      borda: borda?.nome ?? "Sem borda",
      precoBorda: borda?.preco ?? 0,
      adicionais: adicionaisDoItem,
      quantidade,
      observacao,
    };

    setCarrinho((atual) =>
      itemEditandoId
        ? atual.map((item) => (item.id === itemEditandoId ? novoItem : item))
        : [...atual, novoItem]
    );
    fecharProduto();
  }

  function removerItem(id: string) {
    setCarrinho((atual) => atual.filter((item) => item.id !== id));
  }

  function montarMensagemWhatsApp() {
    const itens = carrinho
      .map((item, index) => {
        const totalAdicionais = item.adicionais.reduce(
          (soma, adicional) => soma + adicional.preco,
          0
        );
        const subtotal = (item.preco + item.precoBorda + totalAdicionais) * item.quantidade;

        return [
          `${index + 1}. ${item.quantidade}x ${item.nome}`,
          `   Opção: ${item.opcao}`,
          item.tipo === "pizza" ? `   Borda: ${item.borda}` : null,
          item.adicionais.length > 0
            ? `   Adicionais: ${item.adicionais.map((adicional) => adicional.nome).join(", ")}`
            : null,
          item.observacao ? `   Obs: ${item.observacao}` : null,
          `   Subtotal: ${dinheiro(subtotal)}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const entrega =
      tipoEntrega === "Entrega"
        ? [
            "Tipo: Entrega",
            `Endereço: ${endereco}`,
            `Bairro: ${bairro}`,
            referencia ? `Referência: ${referencia}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "Tipo: Retirada no balcão";

    const pagamento =
      formaPagamento === "Dinheiro" && troco
        ? `Pagamento: ${formaPagamento}\nTroco para: ${troco}`
        : `Pagamento: ${formaPagamento}`;

    return [
      `*NOVO PEDIDO - ${pizzaria?.nome ?? "CasaDiLari"}*`,
      "",
      `Cliente: ${nomeCliente}`,
      "",
      "*Itens do pedido:*",
      itens,
      "",
      "*Entrega/Retirada:*",
      entrega,
      "",
      "*Pagamento:*",
      pagamento,
      "",
      `*Total: ${dinheiro(total)}*`,
    ].join("\n");
  }

  function enviarWhatsApp() {
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um item ao carrinho.");
      return;
    }

    if (!nomeCliente.trim()) {
      alert("Informe seu nome.");
      return;
    }

    if (tipoEntrega === "Entrega" && (!endereco.trim() || !bairro.trim())) {
      alert("Informe endereço e bairro para entrega.");
      return;
    }

    const whatsapp = pizzaria?.whatsapp;

    if (!whatsapp) {
      alert("WhatsApp da pizzaria não encontrado.");
      return;
    }

    const mensagem = montarMensagemWhatsApp();
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`;

    window.location.href = url;
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1b120c]">
      <div className="mx-auto min-h-screen max-w-6xl bg-[#fffaf2] shadow-[0_24px_90px_rgba(43,23,12,0.08)] lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="pb-8 lg:min-h-screen">
          <header className="relative overflow-hidden bg-[#ffd65a] px-5 pb-8 pt-5 sm:px-8 lg:rounded-br-[56px]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Menu"
                className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-2xl leading-none shadow-sm"
              >
                =
              </button>

              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b3b21]">
                  {pizzaria?.nome ?? "CasaDiLari"}
                </p>
                <h1 className="font-serif text-3xl font-black leading-none">Pizza</h1>
              </div>

              <div className="relative grid h-11 w-11 place-items-center rounded-full bg-[#1d1009] text-sm font-black text-white shadow-sm">
                {totalItens}
                <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#f2552c]" />
              </div>
            </div>

            <div className="mt-8 grid items-center gap-5 sm:grid-cols-[1fr_240px]">
              <div>
                <p className="text-sm font-bold text-[#8b3b21]">
                  {pizzaria?.status_aberto ? "Aberto agora" : "Fechado agora"}
                </p>
                <h2 className="mt-2 max-w-sm font-serif text-5xl font-black leading-[0.95]">
                  {pizzaria?.mensagem_aviso ?? "Faça seu pedido pelo WhatsApp."}
                </h2>
                {pizzaria && (
                  <p className="mt-4 text-sm font-bold text-[#8b3b21]">
                    Entrega estimada: {pizzaria.tempo_entrega_min}-{pizzaria.tempo_entrega_max} min
                  </p>
                )}
              </div>

              <div className="relative mx-auto grid aspect-square w-56 max-w-full place-items-center rounded-full bg-white/70 shadow-inner sm:w-60">
                {hero?.imagemUrl ? (
                  <Image
                    src={hero.imagemUrl}
                    alt={hero.nome}
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 240px, 224px"
                    className="h-full w-full rounded-full object-cover shadow-2xl shadow-[#8b3b21]/30"
                  />
                ) : (
                  <div className="grid h-40 w-40 place-items-center rounded-full bg-[#1d1009] text-5xl font-black text-white shadow-2xl shadow-[#8b3b21]/30">
                    {hero ? iniciais(hero.nome) : "..."}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8">
            {carregando && (
              <div className="rounded-[28px] bg-white p-5 text-sm font-bold text-[#8b7866] shadow-sm">
                Carregando cardápio...
              </div>
            )}

            {erro && (
              <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
                {erro}
              </div>
            )}

            {!carregando && !erro && produtos.length === 0 && (
              <div className="rounded-[28px] bg-white p-5 text-sm font-bold text-[#8b7866] shadow-sm">
                Nenhum produto ativo encontrado no banco de dados.
              </div>
            )}

            {produtos.length > 0 && (
              <>
                <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8">
                  {categorias.map((categoria) => (
                    <button
                      type="button"
                      key={categoria}
                      onClick={() => setCategoriaSelecionada(categoria)}
                      className={`shrink-0 rounded-full px-5 py-3 text-sm font-black transition ${
                        categoriaSelecionada === categoria
                          ? "bg-[#1d1009] text-white shadow-lg shadow-[#1d1009]/15"
                          : "bg-white text-[#6d5a4a] shadow-sm"
                      }`}
                    >
                      {categoria}
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d14f2a]">
                      Cardápio
                    </p>
                    <h2 className="mt-1 font-serif text-3xl font-black">Escolha seu pedido</h2>
                  </div>
                  <p className="text-sm font-bold text-[#8b7866]">{produtosFiltrados.length} itens</p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {produtosFiltrados.map((produto) => (
                    <article
                      key={produto.id}
                      className="group overflow-hidden rounded-[32px] bg-white shadow-[0_18px_40px_rgba(43,23,12,0.08)]"
                    >
                      <button
                        type="button"
                        data-testid={`add-${produto.id}`}
                        onClick={() => abrirProduto(produto)}
                        className="block w-full text-left"
                      >
                        <div className="relative grid aspect-[1.15] place-items-center overflow-hidden bg-[#f1e7d8]">
                          {produto.imagemUrl ? (
                            <Image
                              src={produto.imagemUrl}
                              alt={produto.nome}
                              fill
                              unoptimized
                              sizes="(min-width: 1280px) 260px, (min-width: 640px) 45vw, 100vw"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1d1009] text-3xl font-black text-white transition duration-500 group-hover:scale-105">
                              {iniciais(produto.nome)}
                            </div>
                          )}
                          {produto.destaque && (
                            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-[#d14f2a] shadow-sm">
                              Destaque
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d14f2a]">
                                {produto.categoria}
                              </p>
                              <h3 className="mt-1 font-serif text-2xl font-black">{produto.nome}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8b7866]">
                                {produto.descricao}
                              </p>
                            </div>
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2552c] text-xl font-black text-white">
                              +
                            </span>
                          </div>
                          <p className="mt-5 text-xs font-bold text-[#8b7866]">A partir de</p>
                          <p className="text-2xl font-black">{dinheiro(produto.opcoes[0].preco)}</p>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="border-t border-[#eadfcc] bg-white px-5 py-6 sm:px-8 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d14f2a]">
                Pedido
              </p>
              <h2 className="mt-1 font-serif text-3xl font-black">Seu carrinho</h2>
            </div>
            <span className="rounded-full bg-[#fff0d0] px-3 py-2 text-sm font-black text-[#8b3b21]">
              {totalItens} itens
            </span>
          </div>

          {carrinho.length === 0 ? (
            <div className="mt-5 rounded-[28px] bg-[#fff8ea] p-5 text-sm font-semibold leading-6 text-[#8b7866]">
              Seu carrinho está vazio. Toque em um item do cardápio para escolher opção, borda e quantidade.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {carrinho.map((item) => (
                <div key={item.id} className="rounded-[24px] bg-[#fff8ea] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {item.quantidade}x {item.nome}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#8b7866]">
                        {item.opcao}
                        {item.tipo === "pizza" ? ` / ${item.borda}` : ""}
                      </p>
                      {item.adicionais.length > 0 && (
                        <p className="mt-1 text-xs font-semibold text-[#a1907f]">
                          Adicionais: {item.adicionais.map((adicional) => adicional.nome).join(", ")}
                        </p>
                      )}
                      {item.observacao && (
                        <p className="mt-1 text-xs font-semibold text-[#a1907f]">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => editarItemCarrinho(item)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#1d1009] shadow-sm"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#d14f2a] shadow-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 font-black">
                    {dinheiro(
                      (item.preco +
                        item.precoBorda +
                        item.adicionais.reduce((soma, adicional) => soma + adicional.preco, 0)) *
                        item.quantidade
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-[28px] bg-[#1d1009] p-5 text-white">
            <p className="flex justify-between text-lg font-black">
              <span>Total</span>
              <span>{dinheiro(total)}</span>
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={nomeCliente}
              onChange={(event) => setNomeCliente(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
            />

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#fff8ea] p-1">
              <button
                type="button"
                onClick={() => setTipoEntrega("Entrega")}
                className={`rounded-[18px] px-4 py-3 text-sm font-black ${
                  tipoEntrega === "Entrega" ? "bg-[#f2552c] text-white" : "text-[#8b7866]"
                }`}
              >
                Entrega
              </button>

              <button
                type="button"
                onClick={() => setTipoEntrega("Retirada")}
                className={`rounded-[18px] px-4 py-3 text-sm font-black ${
                  tipoEntrega === "Retirada" ? "bg-[#f2552c] text-white" : "text-[#8b7866]"
                }`}
              >
                Retirada
              </button>
            </div>

            {tipoEntrega === "Entrega" && (
              <>
                <input
                  value={endereco}
                  onChange={(event) => setEndereco(event.target.value)}
                  placeholder="Endereço completo"
                  className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
                />

                <input
                  value={bairro}
                  onChange={(event) => setBairro(event.target.value)}
                  placeholder="Bairro"
                  className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
                />

                <input
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  placeholder="Ponto de referência"
                  className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
                />
              </>
            )}

            <select
              value={formaPagamento}
              onChange={(event) => setFormaPagamento(event.target.value)}
              className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
            >
              {formasPagamento.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>

            {formaPagamento === "Dinheiro" && (
              <input
                value={troco}
                onChange={(event) => setTroco(event.target.value)}
                placeholder="Troco para quanto?"
                className="w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 py-3 text-sm font-semibold outline-none focus:border-[#f2552c]"
              />
            )}

            <button
              type="button"
              onClick={enviarWhatsApp}
              className="w-full rounded-2xl bg-[#22a45d] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#22a45d]/20 transition active:scale-95"
            >
              Enviar pedido pelo WhatsApp
            </button>
          </div>
        </aside>
      </div>

      {produtoSelecionado && opcaoSelecionada && (
        <div
          data-testid="product-modal"
          className="fixed inset-0 z-50 flex items-end bg-[#1d1009]/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
        >
          <div
            ref={produtoModalRef}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[40px] bg-[#fffaf2] shadow-2xl sm:max-w-xl sm:rounded-[40px]"
          >
            <div className="relative overflow-hidden bg-[#ffd65a] px-5 pb-8 pt-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={fecharProduto}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-xl font-black shadow-sm"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={fecharProduto}
                  className="rounded-full bg-[#1d1009] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white"
                >
                  Fechar
                </button>
              </div>

              <div className="relative mx-auto mt-6 grid aspect-square w-64 max-w-[78vw] place-items-center rounded-full bg-white/70">
                {produtoSelecionado.imagemUrl ? (
                  <Image
                    src={produtoSelecionado.imagemUrl}
                    alt={produtoSelecionado.nome}
                    fill
                    unoptimized
                    sizes="256px"
                    className="h-full w-full rounded-full object-cover shadow-2xl shadow-[#8b3b21]/30"
                  />
                ) : (
                  <div className="grid h-44 w-44 place-items-center rounded-full bg-[#1d1009] text-5xl font-black text-white shadow-2xl shadow-[#8b3b21]/30">
                    {iniciais(produtoSelecionado.nome)}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-6 pt-6">
              <p className="text-center text-sm font-black uppercase tracking-[0.18em] text-[#d14f2a]">
                {produtoSelecionado.categoria}
              </p>
              <h2 className="mt-2 text-center font-serif text-4xl font-black">
                {produtoSelecionado.nome}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm font-semibold leading-6 text-[#8b7866]">
                {produtoSelecionado.descricao}
              </p>

              <div className="mt-6">
                <p className="mb-3 text-sm font-black">Opção</p>
                <div className="grid grid-cols-3 gap-2">
                  {produtoSelecionado.opcoes.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => setOpcaoSelecionada(opcao)}
                      className={`rounded-2xl px-3 py-3 text-sm font-black ${
                        opcaoSelecionada.id === opcao.id
                          ? "bg-[#ffd65a] text-[#1d1009] shadow-sm"
                          : "bg-white text-[#8b7866]"
                      }`}
                    >
                      <span className="block">{opcao.nome}</span>
                      <span className="mt-1 block text-xs">{dinheiro(opcao.preco)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {produtoSelecionado.tipo === "pizza" && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-black">Borda</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bordas.map((borda) => (
                      <button
                        key={borda.id}
                        type="button"
                        onClick={() =>
                          setBordaSelecionada((atual) =>
                            atual?.id === borda.id ? null : borda
                          )
                        }
                        className={`rounded-2xl px-3 py-3 text-sm font-black ${
                          bordaSelecionada?.id === borda.id
                            ? "bg-[#1d1009] text-white"
                            : "bg-white text-[#8b7866]"
                        }`}
                      >
                        {borda.nome}
                        <span className="ml-1 text-xs">
                          {borda.preco === 0 ? "" : `+ ${dinheiro(borda.preco)}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {produtoSelecionado.tipo === "pizza" && adicionais.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-black">Adicionais</p>
                  <div className="grid grid-cols-2 gap-2">
                    {adicionais.map((adicional) => {
                      const selecionado = adicionaisSelecionados.includes(adicional.id);
                      const preco = adicional.opcoes[0]?.preco ?? 0;

                      return (
                        <button
                          key={adicional.id}
                          type="button"
                          onClick={() =>
                            setAdicionaisSelecionados((atuais) =>
                              selecionado
                                ? atuais.filter((id) => id !== adicional.id)
                                : [...atuais, adicional.id]
                            )
                          }
                          className={`rounded-2xl px-3 py-3 text-sm font-black ${
                            selecionado ? "bg-[#1d1009] text-white" : "bg-white text-[#8b7866]"
                          }`}
                        >
                          {adicional.nome}
                          <span className="ml-1 text-xs">+ {dinheiro(preco)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-[auto_1fr] gap-4">
                <div>
                  <p className="mb-3 text-sm font-black">Qtd.</p>
                  <div className="flex h-12 items-center gap-2 rounded-full bg-white px-2">
                    <button
                      type="button"
                      onClick={() => setQuantidade((atual) => Math.max(1, atual - 1))}
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#fff0d0] text-lg font-black"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-black">{quantidade}</span>
                    <button
                      type="button"
                      onClick={() => setQuantidade((atual) => atual + 1)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#f2552c] text-lg font-black text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label>
                  <span className="mb-3 block text-sm font-black">Observação</span>
                  <input
                    value={observacao}
                    onChange={(event) => setObservacao(event.target.value)}
                    placeholder="Ex: sem cebola"
                    className="h-12 w-full rounded-full border border-[#eadfcc] bg-white px-4 text-sm font-semibold outline-none focus:border-[#f2552c]"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={adicionarAoCarrinho}
                className="mt-6 flex w-full items-center justify-between rounded-[24px] bg-[#1d1009] px-5 py-4 text-sm font-black text-white shadow-xl shadow-[#1d1009]/20 transition active:scale-95"
              >
                <span>{itemEditandoId ? "Atualizar carrinho" : "Adicionar ao carrinho"}</span>
                <span>
                  {dinheiro(
                    (opcaoSelecionada.preco +
                      (produtoSelecionado.tipo === "pizza" ? bordaSelecionada?.preco ?? 0 : 0) +
                      (produtoSelecionado.tipo === "pizza"
                        ? adicionais
                            .filter((adicional) => adicionaisSelecionados.includes(adicional.id))
                            .reduce((soma, adicional) => soma + (adicional.opcoes[0]?.preco ?? 0), 0)
                        : 0)) *
                      quantidade
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
