"use client";

import { useMemo, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: "pizza" | "bebida" | "combo";
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
    categoria: "Pizzas Tradicionais",
    descricao: "Molho de tomate, muçarela, calabresa, cebola e orégano.",
    tipo: "pizza",
    opcoes: [
      { nome: "Média", preco: 39.9 },
      { nome: "Grande", preco: 49.9 },
      { nome: "Família", preco: 64.9 },
    ],
  },
  {
    id: 2,
    nome: "Muçarela",
    categoria: "Pizzas Tradicionais",
    descricao: "Molho de tomate, muçarela, tomate e orégano.",
    tipo: "pizza",
    opcoes: [
      { nome: "Média", preco: 36.9 },
      { nome: "Grande", preco: 46.9 },
      { nome: "Família", preco: 61.9 },
    ],
  },
  {
    id: 3,
    nome: "Frango com Catupiry",
    categoria: "Pizzas Tradicionais",
    descricao: "Molho de tomate, muçarela, frango desfiado, catupiry e orégano.",
    tipo: "pizza",
    opcoes: [
      { nome: "Média", preco: 42.9 },
      { nome: "Grande", preco: 54.9 },
      { nome: "Família", preco: 69.9 },
    ],
  },
  {
    id: 4,
    nome: "Portuguesa",
    categoria: "Pizzas Tradicionais",
    descricao: "Molho de tomate, muçarela, presunto, ovo, cebola, pimentão e orégano.",
    tipo: "pizza",
    opcoes: [
      { nome: "Média", preco: 43.9 },
      { nome: "Grande", preco: 55.9 },
      { nome: "Família", preco: 70.9 },
    ],
  },
  {
    id: 5,
    nome: "Quatro Queijos",
    categoria: "Pizzas Especiais",
    descricao: "Muçarela, provolone, parmesão, catupiry e orégano.",
    tipo: "pizza",
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
    opcoes: [{ nome: "Unidade", preco: 14.9 }],
  },
  {
    id: 7,
    nome: "Guaraná 2L",
    categoria: "Bebidas",
    descricao: "Refrigerante Guaraná 2 litros.",
    tipo: "bebida",
    opcoes: [{ nome: "Unidade", preco: 12.9 }],
  },
  {
    id: 8,
    nome: "Combo Família",
    categoria: "Combos",
    descricao: "1 pizza família tradicional + 1 refrigerante 2L.",
    tipo: "combo",
    opcoes: [{ nome: "Combo", preco: 74.9 }],
  },
];

const bordas = [
  { nome: "Sem borda", preco: 0 },
  { nome: "Borda de Catupiry", preco: 8 },
  { nome: "Borda de Cheddar", preco: 8 },
  { nome: "Borda de Chocolate", preco: 10 },
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

  const categorias = Array.from(new Set(produtos.map((produto) => produto.categoria)));

  const total = useMemo(() => {
    return carrinho.reduce((soma, item) => {
      return soma + (item.preco + item.precoBorda) * item.quantidade;
    }, 0);
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
      id: `${Date.now()}-${Math.random()}`,
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
      "🍕 *NOVO PEDIDO - CasaDiLari*",
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-400">Cardápio Online</p>
            <h1 className="text-4xl font-black tracking-tight">CasaDiLari</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Monte seu pedido e envie direto pelo WhatsApp.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm">
            <p className="font-bold text-green-400">Aberto agora</p>
            <p className="text-zinc-400">Entrega estimada: 40 a 60 min</p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_370px]">
        <div className="space-y-8">
          {categorias.map((categoria) => (
            <section key={categoria}>
              <h2 className="mb-4 text-2xl font-black">{categoria}</h2>

              <div className="grid gap-4 md:grid-cols-2">
                {produtos
                  .filter((produto) => produto.categoria === categoria)
                  .map((produto) => (
                    <div
                      key={produto.id}
                      className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg"
                    >
                      <div className="flex min-h-40 flex-col justify-between gap-5">
                        <div>
                          <h3 className="text-xl font-bold">{produto.nome}</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">
                            {produto.descricao}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-zinc-500">A partir de</p>
                            <p className="text-xl font-black text-red-400">
                              {dinheiro(produto.opcoes[0].preco)}
                            </p>
                          </div>

                          <button
                            type="button"
                            data-testid={`add-${produto.id}`}
                            onClick={() => abrirProduto(produto)}
                            className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 active:scale-95"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="h-fit rounded-3xl border border-zinc-800 bg-zinc-900 p-5 lg:sticky lg:top-4">
          <h2 className="text-2xl font-black">Seu carrinho</h2>

          {carrinho.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-zinc-950 p-4 text-sm text-zinc-400">
              Seu carrinho está vazio.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {carrinho.map((item) => (
                <div key={item.id} className="rounded-2xl bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {item.quantidade}x {item.nome}
                      </p>
                      <p className="text-sm text-zinc-400">{item.opcao}</p>

                      {item.tipo === "pizza" && (
                        <p className="text-sm text-zinc-400">{item.borda}</p>
                      )}

                      {item.observacao && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removerItem(item.id)}
                      className="text-sm font-bold text-red-400 hover:text-red-300"
                    >
                      Remover
                    </button>
                  </div>

                  <p className="mt-3 text-sm font-black">
                    {dinheiro((item.preco + item.precoBorda) * item.quantidade)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-zinc-800 pt-5">
            <p className="flex justify-between text-xl font-black">
              <span>Total</span>
              <span>{dinheiro(total)}</span>
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={nomeCliente}
              onChange={(event) => setNomeCliente(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoEntrega("Entrega")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  tipoEntrega === "Entrega"
                    ? "bg-red-500 text-white"
                    : "bg-zinc-950 text-zinc-400"
                }`}
              >
                Entrega
              </button>

              <button
                type="button"
                onClick={() => setTipoEntrega("Retirada")}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${
                  tipoEntrega === "Retirada"
                    ? "bg-red-500 text-white"
                    : "bg-zinc-950 text-zinc-400"
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
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
                />

                <input
                  value={bairro}
                  onChange={(event) => setBairro(event.target.value)}
                  placeholder="Bairro"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
                />

                <input
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  placeholder="Ponto de referência"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
                />
              </>
            )}

            <select
              value={formaPagamento}
              onChange={(event) => setFormaPagamento(event.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
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
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
              />
            )}

            <button
              type="button"
              onClick={enviarWhatsApp}
              className="w-full rounded-2xl bg-green-500 px-4 py-4 text-sm font-black text-white shadow-lg transition hover:bg-green-600 active:scale-95"
            >
              Enviar pedido pelo WhatsApp
            </button>
          </div>
        </aside>
      </section>

      {produtoSelecionado && (
        <div
          data-testid="product-modal"
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 md:items-center md:justify-center"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{produtoSelecionado.nome}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {produtoSelecionado.descricao}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharProduto}
                className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-black text-zinc-300 hover:bg-zinc-700"
              >
                X
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-sm font-black">Escolha uma opção</p>

                <div className="grid gap-2">
                  {produtoSelecionado.opcoes.map((opcao) => (
                    <button
                      key={opcao.nome}
                      type="button"
                      onClick={() => setOpcaoSelecionada(opcao)}
                      className={`flex justify-between rounded-2xl border px-4 py-3 text-sm ${
                        opcaoSelecionada.nome === opcao.nome
                          ? "border-red-500 bg-red-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-300"
                      }`}
                    >
                      <span>{opcao.nome}</span>
                      <span className="font-black">{dinheiro(opcao.preco)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {produtoSelecionado.tipo === "pizza" && (
                <div>
                  <p className="mb-2 text-sm font-black">Borda</p>

                  <div className="grid gap-2">
                    {bordas.map((borda) => (
                      <button
                        key={borda.nome}
                        type="button"
                        onClick={() => setBordaSelecionada(borda)}
                        className={`flex justify-between rounded-2xl border px-4 py-3 text-sm ${
                          bordaSelecionada.nome === borda.nome
                            ? "border-red-500 bg-red-500/10 text-white"
                            : "border-zinc-800 bg-zinc-950 text-zinc-300"
                        }`}
                      >
                        <span>{borda.nome}</span>
                        <span className="font-black">
                          {borda.preco === 0 ? "Grátis" : dinheiro(borda.preco)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-black">Quantidade</p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidade((atual) => Math.max(1, atual - 1))}
                    className="h-10 w-10 rounded-full bg-zinc-800 text-lg font-black"
                  >
                    -
                  </button>

                  <span className="w-8 text-center text-lg font-black">
                    {quantidade}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQuantidade((atual) => atual + 1)}
                    className="h-10 w-10 rounded-full bg-zinc-800 text-lg font-black"
                  >
                    +
                  </button>
                </div>
              </div>

              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                placeholder="Observação. Ex: sem cebola, pouco queijo..."
                className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-red-500"
              />

              <button
                type="button"
                onClick={adicionarAoCarrinho}
                className="w-full rounded-2xl bg-red-500 px-4 py-4 text-sm font-black text-white transition hover:bg-red-600 active:scale-95"
              >
                Adicionar ao carrinho —{" "}
                {dinheiro(
                  (opcaoSelecionada.preco +
                    (produtoSelecionado.tipo === "pizza"
                      ? bordaSelecionada.preco
                      : 0)) *
                    quantidade
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
