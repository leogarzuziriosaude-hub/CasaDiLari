"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModalClose } from "@/lib/useModalClose";

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
  ordem?: number | null;
};

type ItemCarrinho = {
  id: string;
  produtoId: string;
  nome: string;
  categoria: string;
  opcao: string;
  preco: number;
  sabores: {
    nome: string;
  }[];
  borda: string;
  precoBorda: number;
  adicionais: {
    nome: string;
    preco: number;
  }[];
  quantidade: number;
  observacao: string;
};

const formasPagamento = ["Pix", "Dinheiro", "Cartao de Credito", "Cartao de Debito"];

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

function resumirSabores(sabores: { nome: string }[]) {
  const contagem = sabores.reduce((mapa, sabor) => {
    mapa.set(sabor.nome, (mapa.get(sabor.nome) ?? 0) + 1);
    return mapa;
  }, new Map<string, number>());

  return Array.from(contagem.entries())
    .map(([nome, quantidade]) => (quantidade > 1 ? `${quantidade}x ${nome}` : nome))
    .join(", ");
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function categoriaEhPizza(categoria: string) {
  return normalizarTexto(categoria).includes("pizza");
}

function categoriaEhAdicional(categoria: string) {
  const palavras = normalizarTexto(categoria).split(/[^a-z0-9]+/).filter(Boolean);
  return palavras.some((palavra) => palavra === "adicional" || palavra === "adicionais");
}

function categoriaEhCombo(categoria: string) {
  const palavras = normalizarTexto(categoria).split(/[^a-z0-9]+/).filter(Boolean);
  return palavras.some((palavra) => palavra === "combo" || palavra === "combos");
}

function produtoEhPizza(produto: Produto | null) {
  return Boolean(produto && categoriaEhPizza(produto.categoria));
}

function produtoEhCombo(produto: Produto | null) {
  return Boolean(produto && categoriaEhCombo(produto.categoria));
}

function carregarCategoriasLocais(): CategoriaBanco[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem("casadilari:categorias:front-pizzaria");
    return valor ? (JSON.parse(valor) as CategoriaBanco[]) : [];
  } catch {
    return [];
  }
}

function carregarProdutosLocais(): Produto[] {
  if (typeof window === "undefined") return [];

  try {
    const categorias = carregarCategoriasLocais();
    const categoriasPorId = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]));
    const valor = window.localStorage.getItem("casadilari:produtos:front-pizzaria");
    const produtosLocais = valor
      ? (JSON.parse(valor) as Array<{
          id: string;
          nome: string;
          categoria_id: string | null;
          categoria?: string;
          descricao: string | null;
          imagem_url?: string | null;
          opcoes: OpcaoProduto[];
        }>)
      : [];

    return produtosLocais
      .map((produto) => ({
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria_id
          ? categoriasPorId.get(produto.categoria_id) ?? produto.categoria ?? "Cardapio"
          : produto.categoria ?? "Cardapio",
        descricao: produto.descricao ?? "",
        destaque: false,
        imagemUrl: produto.imagem_url ?? null,
        opcoes: produto.opcoes ?? [],
      }))
      .filter((produto) => produto.opcoes.length > 0);
  } catch {
    return [];
  }
}

function carregarBordasLocais(): Borda[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem("casadilari:bordas:front-pizzaria");
    const bordasLocais = valor ? (JSON.parse(valor) as Borda[]) : [];

    return bordasLocais.map((borda) => ({
      ...borda,
      preco: Number(borda.preco),
    }));
  } catch {
    return [];
  }
}

const pizzariaFrontOnly: Pizzaria = {
  id: "front-pizzaria",
  nome: "Casa Di Lari",
  whatsapp: "",
  status_aberto: true,
  tempo_entrega_min: 30,
  tempo_entrega_max: 45,
  mensagem_aviso: "Faca seu pedido pelo WhatsApp.",
};

export default function Home() {
  const pizzaria = pizzariaFrontOnly;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<CategoriaBanco[]>([]);
  const [bordas, setBordas] = useState<Borda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const erro = "";

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todos");

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<OpcaoProduto | null>(null);
  const [saboresSelecionados, setSaboresSelecionados] = useState<string[]>([]);
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
  const carrinhoModalRef = useRef<HTMLDivElement | null>(null);

  const fecharProduto = useCallback(() => {
    setProdutoSelecionado(null);
    setItemEditandoId(null);
  }, []);

  useModalClose(Boolean(produtoSelecionado), fecharProduto, produtoModalRef);
  useModalClose(carrinhoAberto, () => setCarrinhoAberto(false), carrinhoModalRef);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setProdutos(carregarProdutosLocais());
      setCategoriasOrdenadas(carregarCategoriasLocais());
      setBordas(carregarBordasLocais());
      setCarregando(false);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const produtosDeVenda = useMemo(() => {
    return produtos.filter((produto) => !categoriaEhAdicional(produto.categoria));
  }, [produtos]);

  const adicionais = useMemo(() => {
    return produtos.filter((produto) => categoriaEhAdicional(produto.categoria));
  }, [produtos]);

  const saboresPizza = useMemo(() => {
    return produtos.filter((produto) => categoriaEhPizza(produto.categoria));
  }, [produtos]);

  const categorias = useMemo(() => {
    const categoriasComProduto = new Set(
      produtosDeVenda.map((produto) => produto.categoria)
    );
    const filtros: string[] = ["Todos"];

    categoriasOrdenadas.forEach((categoria) => {
      if (!categoriasComProduto.has(categoria.nome)) return;

      filtros.push(categoria.nome);
    });

    Array.from(categoriasComProduto).forEach((categoria) => {
      const jaEntrou = filtros.includes(categoria);
      const existeNaListaOrdenada = categoriasOrdenadas.some(
        (categoriaOrdenada) => categoriaOrdenada.nome === categoria
      );

      if (existeNaListaOrdenada || jaEntrou) return;

      filtros.push(categoria);
    });

    return filtros;
  }, [categoriasOrdenadas, produtosDeVenda]);

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

  const produtoSelecionadoEhPizza = produtoEhPizza(produtoSelecionado);
  const produtoSelecionadoEhCombo = produtoEhCombo(produtoSelecionado);
  const limiteSabores = produtoSelecionadoEhPizza ? quantidade * 2 : 0;

  const saboresDoItem = useMemo(() => {
    return saboresSelecionados
      .map((saborId) => saboresPizza.find((sabor) => sabor.id === saborId))
      .filter((sabor): sabor is Produto => Boolean(sabor));
  }, [saboresPizza, saboresSelecionados]);

  const saboresDisponiveis = useMemo(() => {
    if (!produtoSelecionado || !produtoEhPizza(produtoSelecionado)) return [];

    const categoriaProdutoSelecionado = produtoSelecionado.categoria;
    const saboresDaMesmaCategoria = saboresPizza.filter(
      (sabor) => sabor.categoria === categoriaProdutoSelecionado
    );

    return saboresDaMesmaCategoria.length > 0 ? saboresDaMesmaCategoria : saboresPizza;
  }, [produtoSelecionado, saboresPizza]);

  const precoPizzaSelecionada = useMemo(() => {
    if (!opcaoSelecionada || !produtoEhPizza(produtoSelecionado)) return opcaoSelecionada?.preco ?? 0;
    if (saboresDoItem.length === 0) return opcaoSelecionada.preco;

    return Math.max(
      ...saboresDoItem.map((sabor) => {
        const opcaoEquivalente =
          sabor.opcoes.find((opcao) => opcao.nome === opcaoSelecionada.nome) ?? sabor.opcoes[0];

        return opcaoEquivalente?.preco ?? opcaoSelecionada.preco;
      })
    );
  }, [opcaoSelecionada, produtoSelecionado, saboresDoItem]);

  function abrirProduto(produto: Produto) {
    setProdutoSelecionado(produto);
    setOpcaoSelecionada(produto.opcoes[0] ?? null);
    setSaboresSelecionados(produtoEhPizza(produto) ? [produto.id] : []);
    setBordaSelecionada(null);
    setAdicionaisSelecionados([]);
    setQuantidade(1);
    setObservacao("");
    setItemEditandoId(null);
  }

  function editarItemCarrinho(item: ItemCarrinho) {
    const produto =
      produtos.find((produtoItem) => produtoItem.id === item.produtoId) ??
      produtos.find((produtoItem) => produtoItem.nome === item.nome && produtoItem.categoria === item.categoria);

    if (!produto) return;

    setProdutoSelecionado(produto);
    setOpcaoSelecionada(
      produto.opcoes.find((opcao) => opcao.nome === item.opcao) ?? produto.opcoes[0] ?? null
    );
    setSaboresSelecionados(
      categoriaEhPizza(item.categoria)
        ? (item.sabores.length > 0 ? item.sabores : [{ nome: item.nome }])
            .map((saborItem) => saboresPizza.find((sabor) => sabor.nome === saborItem.nome)?.id)
            .filter((saborId): saborId is string => Boolean(saborId))
        : []
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

    if (produtoSelecionadoEhPizza && saboresSelecionados.length === 0) {
      alert("Escolha pelo menos um sabor.");
      return;
    }

    const borda = produtoSelecionadoEhPizza ? bordaSelecionada : null;
    const saboresDoPedido =
      produtoSelecionadoEhPizza
        ? saboresDoItem.map((sabor) => ({ nome: sabor.nome }))
        : [];
    const adicionaisDoItem =
      produtoSelecionadoEhPizza
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
      nome:
        produtoSelecionadoEhPizza && saboresDoPedido.length > 0
          ? "Pizza"
          : produtoSelecionado.nome,
      categoria: produtoSelecionado.categoria,
      opcao: opcaoSelecionada.nome,
      preco: produtoSelecionadoEhPizza ? precoPizzaSelecionada : opcaoSelecionada.preco,
      sabores: saboresDoPedido,
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

  function adicionarSabor(saborId: string) {
    setSaboresSelecionados((atuais) => {
      if (!produtoEhPizza(produtoSelecionado)) return atuais;
      if (atuais.length >= quantidade * 2) return atuais;

      return [...atuais, saborId];
    });
  }

  function removerSabor(saborId: string) {
    setSaboresSelecionados((atuais) => {
      const index = atuais.lastIndexOf(saborId);
      if (index < 0) return atuais;

      return atuais.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function alterarQuantidadeProduto(proximaQuantidade: number) {
    const quantidadeFinal = Math.max(1, proximaQuantidade);

    setQuantidade(quantidadeFinal);

    if (produtoEhPizza(produtoSelecionado)) {
      setSaboresSelecionados((atuais) => atuais.slice(0, quantidadeFinal * 2));
    }
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
          categoriaEhPizza(item.categoria) && item.sabores.length > 0
            ? `   Sabores: ${resumirSabores(item.sabores)}`
            : null,
          item.opcao && !categoriaEhCombo(item.categoria) ? `   Opcao: ${item.opcao}` : null,
          categoriaEhPizza(item.categoria) ? `   Borda: ${item.borda}` : null,
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
            `Endereco: ${endereco}`,
            `Bairro: ${bairro}`,
            referencia ? `Referencia: ${referencia}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "Tipo: Retirada no balcao";

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
      alert("Informe endereco e bairro para entrega.");
      return;
    }

    const whatsapp = pizzaria?.whatsapp;

    if (!whatsapp) {
      alert("WhatsApp da pizzaria nao encontrado.");
      return;
    }

    const mensagem = montarMensagemWhatsApp();
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`;

    window.location.href = url;
  }

  const carrinhoPainel = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d14f2a]">
            Pedido
          </p>
          <h2 className="mt-1 font-serif text-xl font-black sm:text-3xl">Seu carrinho</h2>
        </div>
        <span className="rounded-full bg-[#fff0d0] px-3 py-1.5 text-xs font-black text-[#8b3b21] sm:py-2 sm:text-sm">
          {totalItens} itens
        </span>
      </div>

      {carrinho.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-[#fff8ea] p-3 text-xs font-semibold leading-5 text-[#8b7866] sm:mt-5 sm:rounded-3xl sm:p-5 sm:text-sm sm:leading-6">
          Seu carrinho esta vazio. Toque em um item do cardapio para escolher opcao, borda e quantidade.
        </div>
      ) : (
        <div className="mt-3 space-y-2 sm:mt-5 sm:space-y-3">
          {carrinho.map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#fff8ea] p-3 sm:rounded-3xl sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black sm:text-base">
                    {item.quantidade}x {item.nome}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#8b7866] sm:text-sm">
                    {categoriaEhCombo(item.categoria) ? item.categoria : item.opcao}
                    {categoriaEhPizza(item.categoria) ? ` / ${item.borda}` : ""}
                  </p>
                  {categoriaEhPizza(item.categoria) && item.sabores.length > 0 && (
                    <p className="mt-1 text-xs font-semibold text-[#a1907f]">
                      Sabores: {resumirSabores(item.sabores)}
                    </p>
                  )}
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

                <div className="grid gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCarrinhoAberto(false);
                      editarItemCarrinho(item);
                    }}
                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#1d1009] shadow-sm sm:py-2 sm:text-xs"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-[#d14f2a] shadow-sm sm:py-2 sm:text-xs"
                  >
                    Remover
                  </button>
                </div>
              </div>

              <p className="mt-2 text-sm font-black sm:mt-3 sm:text-base">
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

      <div className="mt-3 rounded-2xl bg-[#1d1009] p-3 text-white sm:mt-6 sm:rounded-3xl sm:p-5">
        <p className="flex justify-between text-base font-black sm:text-lg">
          <span>Total</span>
          <span>{dinheiro(total)}</span>
        </p>
      </div>

      <div className="mt-3 space-y-2 sm:mt-5 sm:space-y-3">
        <input
          value={nomeCliente}
          onChange={(event) => setNomeCliente(event.target.value)}
          placeholder="Seu nome"
          className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
        />

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#fff8ea] p-1">
          <button
            type="button"
            onClick={() => setTipoEntrega("Entrega")}
            className={`rounded-[18px] px-4 py-2 text-xs font-black sm:py-3 sm:text-sm ${
              tipoEntrega === "Entrega" ? "bg-[#f2552c] text-white" : "text-[#8b7866]"
            }`}
          >
            Entrega
          </button>

          <button
            type="button"
            onClick={() => setTipoEntrega("Retirada")}
            className={`rounded-[18px] px-4 py-2 text-xs font-black sm:py-3 sm:text-sm ${
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
              placeholder="Endereco completo"
              className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
            />

            <input
              value={bairro}
              onChange={(event) => setBairro(event.target.value)}
              placeholder="Bairro"
              className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
            />

            <input
              value={referencia}
              onChange={(event) => setReferencia(event.target.value)}
              placeholder="Ponto de referencia"
              className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
            />
          </>
        )}

        <select
          value={formaPagamento}
          onChange={(event) => setFormaPagamento(event.target.value)}
          className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
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
            className="h-10 w-full rounded-2xl border border-[#eadfcc] bg-[#fffaf2] px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-auto sm:py-3"
          />
        )}

        <button
          type="button"
          onClick={enviarWhatsApp}
          className="w-full rounded-2xl bg-[#22a45d] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#22a45d]/20 transition active:scale-95 sm:py-4"
        >
          Enviar pedido pelo WhatsApp
        </button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1b120c]">
      <div className="mx-auto min-h-screen max-w-6xl bg-[#fffaf2] shadow-[0_24px_90px_rgba(43,23,12,0.08)] lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="pb-6 lg:min-h-screen lg:pb-8">
          <header className="relative overflow-hidden bg-[#ffd65a] px-4 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-5 lg:rounded-br-[56px]">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/80 px-3 py-2 text-[11px] font-black text-[#8b3b21] shadow-sm">
                {pizzaria?.status_aberto ? "Aberto" : "Fechado"}
              </span>

              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b3b21] sm:text-xs sm:tracking-[0.22em]">
                  {pizzaria?.nome ?? "CasaDiLari"}
                </p>
                <h1 className="font-serif text-2xl font-black leading-none sm:text-3xl">Pizza</h1>
              </div>

              <button
                type="button"
                aria-label="Abrir carrinho"
                onClick={() => setCarrinhoAberto(true)}
                className="relative grid h-11 w-11 place-items-center rounded-full bg-[#1d1009] text-white shadow-sm lg:pointer-events-none lg:invisible"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" />
                </svg>
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#f2552c] px-1 text-[10px] font-black">
                  {totalItens}
                </span>
              </button>
            </div>

            <div className="mt-5 grid items-center gap-4 sm:mt-8 sm:grid-cols-[1fr_240px] sm:gap-5">
              <div>
                <p className="hidden text-sm font-bold text-[#8b3b21] sm:block">
                  {pizzaria?.status_aberto ? "Aberto agora" : "Fechado agora"}
                </p>
                <h2 className="mt-1 max-w-sm font-serif text-3xl font-black leading-[1] sm:mt-2 sm:text-5xl sm:leading-[0.95]">
                  {pizzaria?.mensagem_aviso ?? "Faca seu pedido pelo WhatsApp."}
                </h2>
                {pizzaria && (
                  <p className="mt-3 text-xs font-bold text-[#8b3b21] sm:mt-4 sm:text-sm">
                    Entrega estimada: {pizzaria.tempo_entrega_min}-{pizzaria.tempo_entrega_max} min
                  </p>
                )}
              </div>

              <div className="relative mx-auto grid aspect-square w-36 max-w-full place-items-center rounded-full bg-white/70 shadow-inner sm:w-60">
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
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[#1d1009] text-3xl font-black text-white shadow-2xl shadow-[#8b3b21]/30 sm:h-40 sm:w-40 sm:text-5xl">
                    {hero ? iniciais(hero.nome) : "..."}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-8 sm:py-6">
            {carregando && (
              <div className="rounded-[28px] bg-white p-5 text-sm font-bold text-[#8b7866] shadow-sm">
                Carregando cardapio...
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
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:gap-3 sm:px-8">
                  {categorias.map((categoria) => (
                    <button
                      type="button"
                      key={categoria}
                      onClick={() => setCategoriaSelecionada(categoria)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition sm:px-5 sm:py-3 sm:text-sm ${
                        categoriaSelecionada === categoria
                          ? "bg-[#1d1009] text-white shadow-lg shadow-[#1d1009]/15"
                          : "bg-white text-[#6d5a4a] shadow-sm"
                      }`}
                    >
                      {categoria}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-end justify-between gap-4 sm:mt-7">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#d14f2a] sm:text-xs sm:tracking-[0.2em]">
                      Cardapio
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-black sm:text-3xl">Escolha seu pedido</h2>
                  </div>
                  <p className="text-xs font-bold text-[#8b7866] sm:text-sm">{produtosFiltrados.length} itens</p>
                </div>

                <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {produtosFiltrados.map((produto) => (
                    <article
                      key={produto.id}
                      className="group overflow-hidden rounded-3xl bg-white shadow-[0_14px_32px_rgba(43,23,12,0.08)] sm:rounded-[32px] sm:shadow-[0_18px_40px_rgba(43,23,12,0.08)]"
                    >
                      <button
                        type="button"
                        data-testid={`add-${produto.id}`}
                        onClick={() => abrirProduto(produto)}
                        className="block w-full text-left"
                      >
                        <div className="relative grid aspect-[1.45] place-items-center overflow-hidden bg-[#f1e7d8] sm:aspect-[1.15]">
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
                            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#1d1009] text-2xl font-black text-white transition duration-500 group-hover:scale-105 sm:h-24 sm:w-24 sm:text-3xl">
                              {iniciais(produto.nome)}
                            </div>
                          )}
                          {produto.destaque && (
                            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-[#d14f2a] shadow-sm">
                              Destaque
                            </span>
                          )}
                        </div>
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d14f2a]">
                                {produto.categoria}
                              </p>
                              <h3 className="mt-1 font-serif text-xl font-black sm:text-2xl">{produto.nome}</h3>
                              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#8b7866] sm:mt-2 sm:text-sm sm:leading-6">
                                {produto.descricao}
                              </p>
                            </div>
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2552c] text-lg font-black text-white sm:h-10 sm:w-10 sm:text-xl">
                              +
                            </span>
                          </div>
                          <p className="mt-4 text-xs font-bold text-[#8b7866] sm:mt-5">A partir de</p>
                          <p className="text-xl font-black sm:text-2xl">{dinheiro(produto.opcoes[0].preco)}</p>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="hidden border-t border-[#eadfcc] bg-white px-5 py-6 sm:px-8 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:border-l lg:border-t-0">
          {carrinhoPainel}
        </aside>
      </div>

      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-[#1d1009]/55 p-0 backdrop-blur-sm lg:hidden">
          <div
            ref={carrinhoModalRef}
            className="max-h-[84vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-4 pb-5 pt-3 shadow-2xl"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCarrinhoAberto(false)}
                className="rounded-full bg-[#1d1009] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white"
              >
                Fechar
              </button>
            </div>
            {carrinhoPainel}
          </div>
        </div>
      )}

      {produtoSelecionado && opcaoSelecionada && (
        <div
          data-testid="product-modal"
          className="fixed inset-0 z-50 flex items-end bg-[#1d1009]/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
        >
          <div
            ref={produtoModalRef}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffaf2] shadow-2xl sm:max-w-xl sm:rounded-[40px]"
          >
            <div className="relative overflow-hidden bg-[#ffd65a] px-4 pb-4 pt-3 sm:px-5 sm:pb-8 sm:pt-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={fecharProduto}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg font-black shadow-sm sm:h-11 sm:w-11 sm:text-xl"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={fecharProduto}
                  className="rounded-full bg-[#1d1009] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white sm:py-2 sm:text-xs"
                >
                  Fechar
                </button>
              </div>

              <div className="relative mx-auto mt-3 grid aspect-square w-32 max-w-[60vw] place-items-center rounded-full bg-white/70 sm:mt-6 sm:w-64 sm:max-w-[78vw]">
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
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1d1009] text-2xl font-black text-white shadow-2xl shadow-[#8b3b21]/30 sm:h-44 sm:w-44 sm:text-5xl">
                    {iniciais(produtoSelecionado.nome)}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-6">
              <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#d14f2a] sm:text-sm sm:tracking-[0.18em]">
                {produtoSelecionado.categoria}
              </p>
              <h2 className="mt-1 text-center font-serif text-2xl font-black sm:mt-2 sm:text-4xl">
                {produtoSelecionado.nome}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-center text-xs font-semibold leading-5 text-[#8b7866] sm:mt-3 sm:text-sm sm:leading-6">
                {produtoSelecionado.descricao}
              </p>

              {!produtoSelecionadoEhCombo && (!produtoSelecionadoEhPizza || produtoSelecionado.opcoes.length > 1) && (
                <div className="mt-4 sm:mt-6">
                  <p className="mb-2 text-sm font-black sm:mb-3">
                    {produtoSelecionadoEhPizza ? "Tamanho" : "Opcao"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {produtoSelecionado.opcoes.map((opcao) => (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => setOpcaoSelecionada(opcao)}
                        className={`rounded-xl px-2.5 py-2 text-xs font-black sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm ${
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
              )}

              {produtoSelecionadoEhPizza && (
                <div className="mt-4 sm:mt-6">
                  <div className="mb-2 flex items-end justify-between gap-3 sm:mb-3">
                    <div>
                      <p className="text-sm font-black">Sabores</p>
                      <p className="mt-1 text-xs font-semibold text-[#8b7866]">
                        Escolha ate {limiteSabores} {limiteSabores === 1 ? "sabor" : "sabores"}.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8b3b21]">
                      {saboresSelecionados.length}/{limiteSabores}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {saboresDisponiveis.map((sabor) => {
                      const quantidadeSabor = saboresSelecionados.filter(
                        (saborId) => saborId === sabor.id
                      ).length;
                      const atingiuLimite = saboresSelecionados.length >= limiteSabores;
                      const opcaoEquivalente =
                        sabor.opcoes.find((opcao) => opcao.nome === opcaoSelecionada.nome) ??
                        sabor.opcoes[0];

                      return (
                        <div
                          key={sabor.id}
                          className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-3 ${
                            quantidadeSabor > 0 ? "border-[#ffd65a]" : "border-transparent"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{sabor.nome}</p>
                            <p className="mt-1 text-xs font-semibold text-[#8b7866]">
                              {dinheiro(opcaoEquivalente?.preco ?? sabor.opcoes[0]?.preco ?? 0)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => removerSabor(sabor.id)}
                              disabled={quantidadeSabor === 0}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#fff0d0] text-base font-black disabled:opacity-35"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-sm font-black">
                              {quantidadeSabor}
                            </span>
                            <button
                              type="button"
                              onClick={() => adicionarSabor(sabor.id)}
                              disabled={atingiuLimite}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#f2552c] text-base font-black text-white disabled:opacity-35"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {produtoSelecionadoEhPizza && bordas.length > 0 && (
                <div className="mt-3 sm:mt-5">
                  <p className="mb-2 text-sm font-black sm:mb-3">Borda</p>
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
                        className={`rounded-xl px-2.5 py-2 text-xs font-black sm:rounded-2xl sm:px-3 sm:py-3 sm:text-sm ${
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

              <div className="mt-3 grid grid-cols-[auto_1fr] gap-3 sm:mt-5 sm:gap-4">
                <div>
                  <p className="mb-2 text-sm font-black sm:mb-3">Qtd.</p>
                  <div className="flex h-10 items-center gap-2 rounded-full bg-white px-2 sm:h-12">
                    <button
                      type="button"
                      onClick={() => alterarQuantidadeProduto(quantidade - 1)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-[#fff0d0] text-base font-black sm:h-8 sm:w-8 sm:text-lg"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-black">{quantidade}</span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidadeProduto(quantidade + 1)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-[#f2552c] text-base font-black text-white sm:h-8 sm:w-8 sm:text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label>
                  <span className="mb-2 block text-sm font-black sm:mb-3">Observacao</span>
                  <input
                    value={observacao}
                    onChange={(event) => setObservacao(event.target.value)}
                    placeholder="Ex: sem cebola"
                    className="h-10 w-full rounded-full border border-[#eadfcc] bg-white px-4 text-sm font-semibold outline-none focus:border-[#f2552c] sm:h-12"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={adicionarAoCarrinho}
                className="mt-4 flex w-full items-center justify-between rounded-[20px] bg-[#1d1009] px-4 py-3 text-sm font-black text-white shadow-xl shadow-[#1d1009]/20 transition active:scale-95 sm:mt-6 sm:rounded-[24px] sm:px-5 sm:py-4"
              >
                <span>{itemEditandoId ? "Atualizar carrinho" : "Adicionar ao carrinho"}</span>
                <span>
                  {dinheiro(
                    ((produtoSelecionadoEhPizza
                      ? precoPizzaSelecionada
                      : opcaoSelecionada.preco) +
                      (produtoSelecionadoEhPizza ? bordaSelecionada?.preco ?? 0 : 0) +
                      (produtoSelecionadoEhPizza
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
