"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: "pizza" | "bebida" | "combo";
  imagem: string;
  destaque: string;
  opcoes: {
    nome: string;
    preco: number;
  }[];
};

type ItemCarrinho = {
  id: string;
  nome: string;
  tipo: "pizza" | "bebida" | "combo";
  opcao: string;
  preco: number;
  borda: string;
  precoBorda: number;
  quantidade: number;
  observacao: string;
};

const WHATSAPP_PIZZARIA = "5521994073006";

const produtos: Produto[] = [
  {
    id: 1,
    nome: "Calabresa",
    categoria: "Tradicionais",
    descricao: "Molho de tomate, muçarela, calabresa, cebola e orégano.",
    tipo: "pizza",
    imagem:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85",
    destaque: "A queridinha da casa",
    opcoes: [
      { nome: "Média", preco: 39.9 },
      { nome: "Grande", preco: 49.9 },
      { nome: "Família", preco: 64.9 },
    ],
  },
  {
    id: 2,
    nome: "Muçarela",
    categoria: "Tradicionais",
    descricao: "Molho de tomate, muçarela, tomate e orégano.",
    tipo: "pizza",
    imagem:
      "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=900&q=85",
    destaque: "Clássica e cremosa",
    opcoes: [
      { nome: "Média", preco: 36.9 },
      { nome: "Grande", preco: 46.9 },
      { nome: "Família", preco: 61.9 },
    ],
  },
  {
    id: 3,
    nome: "Frango com Catupiry",
    categoria: "Tradicionais",
    descricao: "Molho de tomate, muçarela, frango desfiado, catupiry e orégano.",
    tipo: "pizza",
    imagem:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=900&q=85",
    destaque: "Bem recheada",
    opcoes: [
      { nome: "Média", preco: 42.9 },
      { nome: "Grande", preco: 54.9 },
      { nome: "Família", preco: 69.9 },
    ],
  },
  {
    id: 4,
    nome: "Portuguesa",
    categoria: "Tradicionais",
    descricao: "Molho de tomate, muçarela, presunto, ovo, cebola, pimentão e orégano.",
    tipo: "pizza",
    imagem:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",
    destaque: "Completa no capricho",
    opcoes: [
      { nome: "Média", preco: 43.9 },
      { nome: "Grande", preco: 55.9 },
      { nome: "Família", preco: 70.9 },
    ],
  },
  {
    id: 5,
    nome: "Quatro Queijos",
    categoria: "Especiais",
    descricao: "Muçarela, provolone, parmesão, catupiry e orégano.",
    tipo: "pizza",
    imagem:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85",
    destaque: "Derretida e intensa",
    opcoes: [
      { nome: "Média", preco: 46.9 },
      { nome: "Grande", preco: 59.9 },
      { nome: "Família", preco: 74.9 },
    ],
  },
  {
    id: 6,
    nome: "Coca-Cola 2L",
    categoria: "Bebidas",
    descricao: "Refrigerante Coca-Cola 2 litros.",
    tipo: "bebida",
    imagem:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=85",
    destaque: "Gelada para acompanhar",
    opcoes: [{ nome: "Unidade", preco: 14.9 }],
  },
  {
    id: 7,
    nome: "Guaraná 2L",
    categoria: "Bebidas",
    descricao: "Refrigerante Guaraná 2 litros.",
    tipo: "bebida",
    imagem:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=85",
    destaque: "Sabor brasileiro",
    opcoes: [{ nome: "Unidade", preco: 12.9 }],
  },
  {
    id: 8,
    nome: "Combo Família",
    categoria: "Combos",
    descricao: "1 pizza família tradicional + 1 refrigerante 2L.",
    tipo: "combo",
    imagem:
      "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?auto=format&fit=crop&w=900&q=85",
    destaque: "Pedido pronto para dividir",
    opcoes: [{ nome: "Combo", preco: 74.9 }],
  },
];

const bordas = [
  { nome: "Sem borda", preco: 0 },
  { nome: "Catupiry", preco: 8 },
  { nome: "Cheddar", preco: 8 },
  { nome: "Chocolate", preco: 10 },
];

const formasPagamento = ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"];

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Home() {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todos");

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(produtos[0].opcoes[0]);
  const [bordaSelecionada, setBordaSelecionada] = useState(bordas[0]);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  const [nomeCliente, setNomeCliente] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState<"Entrega" | "Retirada">("Entrega");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [troco, setTroco] = useState("");

  const categorias = ["Todos", ...Array.from(new Set(produtos.map((produto) => produto.categoria)))];
  const hero = produtos[0];

  const produtosFiltrados = useMemo(() => {
    if (categoriaSelecionada === "Todos") return produtos;
    return produtos.filter((produto) => produto.categoria === categoriaSelecionada);
  }, [categoriaSelecionada]);

  const total = useMemo(() => {
    return carrinho.reduce((soma, item) => {
      return soma + (item.preco + item.precoBorda) * item.quantidade;
    }, 0);
  }, [carrinho]);

  const totalItens = useMemo(() => {
    return carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  }, [carrinho]);

  function abrirProduto(produto: Produto) {
    setProdutoSelecionado(produto);
    setOpcaoSelecionada(produto.opcoes[0]);
    setBordaSelecionada(bordas[0]);
    setQuantidade(1);
    setObservacao("");
  }

  function fecharProduto() {
    setProdutoSelecionado(null);
  }

  function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;

    const novoItem: ItemCarrinho = {
      id: crypto.randomUUID(),
      nome: produtoSelecionado.nome,
      tipo: produtoSelecionado.tipo,
      opcao: opcaoSelecionada.nome,
      preco: opcaoSelecionada.preco,
      borda: produtoSelecionado.tipo === "pizza" ? bordaSelecionada.nome : "Sem borda",
      precoBorda: produtoSelecionado.tipo === "pizza" ? bordaSelecionada.preco : 0,
      quantidade,
      observacao,
    };

    setCarrinho((atual) => [...atual, novoItem]);
    fecharProduto();
  }

  function removerItem(id: string) {
    setCarrinho((atual) => atual.filter((item) => item.id !== id));
  }

  function montarMensagemWhatsApp() {
    const itens = carrinho
      .map((item, index) => {
        const subtotal = (item.preco + item.precoBorda) * item.quantidade;

        return [
          `${index + 1}. ${item.quantidade}x ${item.nome}`,
          `   Opção: ${item.opcao}`,
          item.tipo === "pizza" ? `   Borda: ${item.borda}` : null,
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
      "*NOVO PEDIDO - CasaDiLari*",
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

    const mensagem = montarMensagemWhatsApp();
    const url = `https://wa.me/${WHATSAPP_PIZZARIA}?text=${encodeURIComponent(mensagem)}`;

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
                  CasaDiLari
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
                <p className="text-sm font-bold text-[#8b3b21]">Aberto agora</p>
                <h2 className="mt-2 max-w-sm font-serif text-5xl font-black leading-[0.95]">
                  Seu pedido favorito em poucos toques.
                </h2>
                <button
                  type="button"
                  onClick={() => abrirProduto(hero)}
                  className="mt-6 rounded-full bg-[#1d1009] px-6 py-3 text-sm font-black text-white shadow-xl shadow-[#8b3b21]/20 transition active:scale-95"
                >
                  Pedir calabresa
                </button>
              </div>

              <div className="relative mx-auto aspect-square w-56 max-w-full sm:w-60">
                <div className="absolute inset-7 rounded-full bg-white/60 shadow-inner" />
                <Image
                  src={hero.imagem}
                  alt={hero.nome}
                  fill
                  sizes="(min-width: 640px) 240px, 224px"
                  className="relative h-full w-full rounded-full object-cover shadow-2xl shadow-[#8b3b21]/30"
                />
              </div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8">
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
                <h2 className="mt-1 font-serif text-3xl font-black">
                  Escolha sua pizza
                </h2>
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
                    <div className="relative aspect-[1.15] overflow-hidden bg-[#f1e7d8]">
                      <Image
                        src={produto.imagem}
                        alt={produto.nome}
                        fill
                        sizes="(min-width: 1280px) 260px, (min-width: 640px) 45vw, 100vw"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-[#d14f2a] shadow-sm">
                        {produto.destaque}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-2xl font-black">{produto.nome}</h3>
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
              Seu carrinho está vazio. Toque em uma pizza para escolher tamanho, borda e quantidade.
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
                      {item.observacao && (
                        <p className="mt-1 text-xs font-semibold text-[#a1907f]">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removerItem(item.id)}
                      className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#d14f2a] shadow-sm"
                    >
                      Remover
                    </button>
                  </div>

                  <p className="mt-3 font-black">
                    {dinheiro((item.preco + item.precoBorda) * item.quantidade)}
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

      {produtoSelecionado && (
        <div
          data-testid="product-modal"
          className="fixed inset-0 z-50 flex items-end bg-[#1d1009]/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[40px] bg-[#fffaf2] shadow-2xl sm:max-w-xl sm:rounded-[40px]">
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

              <div className="relative mx-auto mt-6 aspect-square w-64 max-w-[78vw]">
                <Image
                  src={produtoSelecionado.imagem}
                  alt={produtoSelecionado.nome}
                  fill
                  sizes="256px"
                  className="h-full w-full rounded-full object-cover shadow-2xl shadow-[#8b3b21]/30"
                />
              </div>
            </div>

            <div className="px-5 pb-6 pt-6">
              <p className="text-center text-sm font-black uppercase tracking-[0.18em] text-[#d14f2a]">
                {produtoSelecionado.destaque}
              </p>
              <h2 className="mt-2 text-center font-serif text-4xl font-black">
                {produtoSelecionado.nome}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm font-semibold leading-6 text-[#8b7866]">
                {produtoSelecionado.descricao}
              </p>

              <div className="mt-6">
                <p className="mb-3 text-sm font-black">Tamanho</p>
                <div className="grid grid-cols-3 gap-2">
                  {produtoSelecionado.opcoes.map((opcao) => (
                    <button
                      key={opcao.nome}
                      type="button"
                      onClick={() => setOpcaoSelecionada(opcao)}
                      className={`rounded-2xl px-3 py-3 text-sm font-black ${
                        opcaoSelecionada.nome === opcao.nome
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
                        key={borda.nome}
                        type="button"
                        onClick={() => setBordaSelecionada(borda)}
                        className={`rounded-2xl px-3 py-3 text-sm font-black ${
                          bordaSelecionada.nome === borda.nome
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
                <span>Adicionar ao carrinho</span>
                <span>
                  {dinheiro(
                    (opcaoSelecionada.preco +
                      (produtoSelecionado.tipo === "pizza" ? bordaSelecionada.preco : 0)) *
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
