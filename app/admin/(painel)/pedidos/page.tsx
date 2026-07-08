"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

type ItemPedido = {
  id: string;
  nome: string;
  categoria: string;
  opcao: string;
  preco: number;
  sabores: { nome: string }[];
  borda: string;
  precoBorda: number;
  adicionais: { nome: string; preco: number }[];
  quantidade: number;
  observacao: string;
};

type PedidoStatus =
  | "Recebido"
  | "Em preparo"
  | "Saiu pra entrega"
  | "Disponivel para retirada"
  | "Encerrado";

type PedidoLocal = {
  id: string;
  numero: number;
  protocolo?: string;
  cliente: string;
  telefone?: string;
  status: PedidoStatus;
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
  itens: ItemPedido[];
  total: number;
  mensagem: string;
};

const statusPedido: PedidoStatus[] = [
  "Recebido",
  "Em preparo",
  "Saiu pra entrega",
  "Disponivel para retirada",
  "Encerrado",
];
const statusAtivos: PedidoStatus[] = [
  "Recebido",
  "Em preparo",
  "Saiu pra entrega",
  "Disponivel para retirada",
];

function pedidosLocaisKey(pizzariaId: string) {
  return `casadilari:pedidos:${pizzariaId}`;
}

function historicoPedidosLocaisKey(pizzariaId: string) {
  return `casadilari:pedidos-historico:${pizzariaId}`;
}

function carregarPedidosLocais(pizzariaId: string): PedidoLocal[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(pedidosLocaisKey(pizzariaId));
    const pedidos = valor
      ? (JSON.parse(valor) as Array<Omit<PedidoLocal, "status"> & { status: string }>)
      : [];

    return pedidos.map((pedido) => ({
      ...pedido,
      protocolo: pedido.protocolo ?? `PED-${String(pedido.numero).padStart(4, "0")}`,
      status: statusPedido.includes(pedido.status as PedidoStatus)
        ? (pedido.status as PedidoStatus)
        : pedido.status === "Finalizado"
          ? pedido.tipoEntrega === "Retirada"
            ? "Disponivel para retirada"
            : "Saiu pra entrega"
          : "Recebido",
    }));
  } catch {
    return [];
  }
}

function carregarHistoricoPedidosLocais(pizzariaId: string): PedidoLocal[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(historicoPedidosLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as PedidoLocal[]) : [];
  } catch {
    return [];
  }
}

function salvarPedidosLocais(pizzariaId: string, pedidos: PedidoLocal[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(pedidosLocaisKey(pizzariaId), JSON.stringify(pedidos));
}

function salvarHistoricoPedidosLocais(pizzariaId: string, pedidos: PedidoLocal[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(historicoPedidosLocaisKey(pizzariaId), JSON.stringify(pedidos));
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataPedido(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function dataEncomenda(valor?: string | null) {
  if (!valor) return "";

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, (mes ?? 1) - 1, dia ?? 1);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(data);
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

function normalizarTelefone(telefone?: string) {
  const numeros = telefone?.replace(/\D/g, "") ?? "";
  if (!numeros) return "";
  if (numeros.startsWith("55")) return numeros;
  return `55${numeros}`;
}

function mensagemStatus(pedido: PedidoLocal, status: PedidoStatus) {
  if (status === "Em preparo") {
    return `Oi, ${pedido.cliente}! Seu pedido ${pedido.protocolo ?? `#${pedido.numero}`} ja esta em preparo. Ta no forno.`;
  }

  if (status === "Encerrado") {
    return `Oi, ${pedido.cliente}! Seu pedido ${pedido.protocolo ?? `#${pedido.numero}`} foi encerrado. Obrigado pela preferencia.`;
  }

  if (status === "Disponivel para retirada") {
    return `Oi, ${pedido.cliente}! Seu pedido ${pedido.protocolo ?? `#${pedido.numero}`} esta pronto. Pode vir buscar.`;
  }

  return `Oi, ${pedido.cliente}! Seu pedido ${pedido.protocolo ?? `#${pedido.numero}`} saiu pra entrega. Estamos indo ate voce.`;
}

function abrirWhatsAppCliente(pedido: PedidoLocal, status: PedidoStatus) {
  const telefone = normalizarTelefone(pedido.telefone);
  const mensagem = encodeURIComponent(mensagemStatus(pedido, status));

  if (!telefone) {
    window.open(`https://wa.me/?text=${mensagem}`, "_blank", "noopener,noreferrer");
    return;
  }

  window.open(`https://wa.me/${telefone}?text=${mensagem}`, "_blank", "noopener,noreferrer");
}

export default function PedidosPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [pedidos, setPedidos] = useState<PedidoLocal[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<PedidoStatus | "Todos">("Todos");

  useEffect(() => {
    if (!pizzaria) return;

    const timerId = window.setTimeout(() => {
      setPedidos(carregarPedidosLocais(pizzaria.id));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [pizzaria]);

  const pedidosFiltrados = useMemo(() => {
    if (statusFiltro === "Todos") {
      return pedidos.filter((pedido) => pedido.status !== "Encerrado");
    }
    return pedidos.filter((pedido) => pedido.status === statusFiltro);
  }, [pedidos, statusFiltro]);

  const totaisPorStatus = useMemo(() => {
    return statusPedido.reduce(
      (mapa, status) => ({
        ...mapa,
        [status]: pedidos.filter((pedido) => pedido.status === status).length,
      }),
      {} as Record<PedidoStatus, number>
    );
  }, [pedidos]);

  function atualizarStatus(pedidoId: string, status: PedidoStatus) {
    if (!pizzaria) return;

    const pedidoAtual = pedidos.find((pedido) => pedido.id === pedidoId);
    const proximosPedidos = pedidos.map((pedido) =>
      pedido.id === pedidoId ? { ...pedido, status } : pedido
    );

    setPedidos(proximosPedidos);
    salvarPedidosLocais(pizzaria.id, proximosPedidos);

    if (
      pedidoAtual &&
      (status === "Saiu pra entrega" || status === "Disponivel para retirada")
    ) {
      abrirWhatsAppCliente(pedidoAtual, status);
    }
  }

  function limparFinalizados() {
    if (!pizzaria) return;

    const pedidosEncerrados = pedidos.filter((pedido) => pedido.status === "Encerrado");
    const proximosPedidos = pedidos.filter((pedido) => pedido.status !== "Encerrado");
    const historicoAtual = carregarHistoricoPedidosLocais(pizzaria.id);
    const historicoSemDuplicados = historicoAtual.filter(
      (pedidoHistorico) =>
        !pedidosEncerrados.some((pedidoEncerrado) => pedidoEncerrado.id === pedidoHistorico.id)
    );

    setPedidos(proximosPedidos);
    salvarPedidosLocais(pizzaria.id, proximosPedidos);
    salvarHistoricoPedidosLocais(pizzaria.id, [
      ...pedidosEncerrados.map((pedido) => ({
        ...pedido,
        status: "Encerrado" as const,
      })),
      ...historicoSemDuplicados,
    ]);
  }

  function recarregarPedidos() {
    if (!pizzaria) return;
    setPedidos(carregarPedidosLocais(pizzaria.id));
  }

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando pedidos...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
              Pedidos
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">Fila de pedidos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Os pedidos feitos na tela do cliente aparecem aqui em tempo de prototipo.
            </p>
          </div>

          <div className="grid gap-2 sm:flex">
            <button
              type="button"
              onClick={recarregarPedidos}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-zinc-100"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={limparFinalizados}
              className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white"
            >
              Limpar encerrados
            </button>
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-6">
        {(["Todos", ...statusAtivos, "Encerrado"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFiltro(status)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              statusFiltro === status
                ? "border-[#ff7a3d] bg-[#ff7a3d] text-white"
                : "border-white/10 bg-white/[0.04] text-zinc-300"
            }`}
          >
            <span className="block text-xs font-black uppercase tracking-[0.14em]">
              {status === "Encerrado" ? "Encerrados" : status}
            </span>
            <span className="mt-2 block text-2xl font-black">
              {status === "Todos"
                ? pedidos.filter((pedido) => pedido.status !== "Encerrado").length
                : totaisPorStatus[status]}
            </span>
          </button>
        ))}
      </section>

      <section className="space-y-3">
        {pedidosFiltrados.length === 0 && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-zinc-300">
            Nenhum pedido nessa fila.
          </div>
        )}

        {pedidosFiltrados.map((pedido) => (
          <article
            key={pedido.id}
            className="rounded-[28px] border border-[#f5d8bd] bg-[#fff7ed] p-5 text-[#1f120d] shadow-xl shadow-black/10"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb26a]">
                  {pedido.status}
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#1f120d]">
                  Pedido #{pedido.numero}
                </h2>
                <p className="mt-2 text-sm font-bold text-[#7a5942]">
                  {pedido.cliente} - {dataPedido(pedido.criadoEm)}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#a0643f]">
                  Protocolo {pedido.protocolo ?? `PED-${String(pedido.numero).padStart(4, "0")}`}
                </p>
                {pedido.tipoPedido === "Encomenda" && (
                  <p className="mt-3 inline-flex rounded-full bg-[#ff7a3d] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                    Encomenda para {dataEncomenda(pedido.dataEncomenda)} as {pedido.horaEncomenda}
                  </p>
                )}
                {pedido.telefone && (
                  <p className="mt-1 text-sm font-bold text-[#a0643f]">
                    {pedido.telefone}
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:flex">
                <select
                  value={pedido.status}
                  onChange={(event) => atualizarStatus(pedido.id, event.target.value as PedidoStatus)}
                  className="h-12 rounded-2xl border border-[#edc7aa] bg-white px-4 text-sm font-bold text-[#1f120d] outline-none"
                >
                  {statusPedido.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <p className="grid h-12 place-items-center rounded-2xl bg-[#1f120d] px-4 text-lg font-black text-white">
                  {dinheiro(pedido.total)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                {pedido.itens.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#f0d6bf] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#1f120d]">
                          {item.quantidade}x {item.nome}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#8c725d]">
                          {item.categoria}
                          {item.opcao ? ` / ${item.opcao}` : ""}
                        </p>
                      </div>
                      <p className="text-sm font-black text-[#1f120d]">
                        {dinheiro((item.preco + item.precoBorda) * item.quantidade)}
                      </p>
                    </div>

                    {item.sabores.length > 0 && (
                      <p className="mt-2 text-xs font-bold text-[#7a5942]">
                        Sabores: {resumirSabores(item.sabores)}
                      </p>
                    )}
                    {item.borda && item.borda !== "Sem borda" && (
                      <p className="mt-1 text-xs font-bold text-[#7a5942]">
                        Borda: {item.borda}
                      </p>
                    )}
                    {item.observacao && (
                      <p className="mt-1 text-xs font-bold text-[#7a5942]">
                        Obs: {item.observacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[#f0d6bf] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a0643f]">
                  Entrega
                </p>
                <p className="mt-2 text-sm font-bold text-[#1f120d]">{pedido.tipoEntrega}</p>
                {pedido.tipoEntrega === "Entrega" && (
                  <p className="mt-1 text-sm leading-6 text-[#7a5942]">
                    {pedido.endereco}
                    <br />
                    {pedido.bairro}
                    {pedido.referencia ? (
                      <>
                        <br />
                        Ref: {pedido.referencia}
                      </>
                    ) : null}
                  </p>
                )}

                <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#a0643f]">
                  Pagamento
                </p>
                <p className="mt-2 text-sm font-bold text-[#1f120d]">{pedido.formaPagamento}</p>
                {pedido.troco && (
                  <p className="mt-1 text-sm text-[#7a5942]">Troco para {pedido.troco}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
