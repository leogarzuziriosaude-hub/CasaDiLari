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

type PedidoHistorico = {
  id: string;
  numero: number;
  protocolo?: string;
  cliente: string;
  telefone?: string;
  status: string;
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
};

function historicoPedidosLocaisKey(pizzariaId: string) {
  return `casadilari:pedidos-historico:${pizzariaId}`;
}

function carregarHistoricoPedidosLocais(pizzariaId: string): PedidoHistorico[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(historicoPedidosLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as PedidoHistorico[]) : [];
  } catch {
    return [];
  }
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

export default function HistoricoPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [pedidos, setPedidos] = useState<PedidoHistorico[]>([]);

  useEffect(() => {
    if (!pizzaria) return;

    const timerId = window.setTimeout(() => {
      setPedidos(carregarHistoricoPedidosLocais(pizzaria.id));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [pizzaria]);

  const totalHistorico = useMemo(() => {
    return pedidos.reduce((soma, pedido) => soma + pedido.total, 0);
  }, [pedidos]);

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando histórico...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#f0d6bf] bg-[#fff7ed] p-6 text-[#1f120d] shadow-[0_18px_45px_rgba(31,18,13,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#9d4d20]">
          Histórico
        </p>
        <h1 className="mt-3 text-3xl font-black">Pedidos arquivados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a5942]">
          Pedidos encerrados saem da fila principal e ficam guardados aqui.
        </p>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffb26a]">
            Total arquivado
          </p>
          <p className="mt-2 text-3xl font-black text-white">{pedidos.length}</p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffb26a]">
            Valor registrado
          </p>
          <p className="mt-2 text-3xl font-black text-white">{dinheiro(totalHistorico)}</p>
        </div>
      </section>

      <section className="space-y-3">
        {pedidos.length === 0 && (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-zinc-300">
            Nenhum pedido no histórico ainda.
          </div>
        )}

        {pedidos.map((pedido) => (
          <article
            key={pedido.id}
            className="rounded-[28px] border border-[#f5d8bd] bg-[#fff7ed] p-5 text-[#1f120d] shadow-xl shadow-black/10"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a0643f]">
                  Encerrado
                </p>
                <h2 className="mt-2 text-2xl font-black">Pedido #{pedido.numero}</h2>
                <p className="mt-2 text-sm font-bold text-[#7a5942]">
                  {pedido.cliente} - {dataPedido(pedido.criadoEm)}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#a0643f]">
                  Protocolo {pedido.protocolo ?? `PED-${String(pedido.numero).padStart(4, "0")}`}
                </p>
                {pedido.tipoPedido === "Encomenda" && (
                  <p className="mt-3 inline-flex rounded-full bg-[#ff7a3d] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                    Encomenda para {dataEncomenda(pedido.dataEncomenda)} às {pedido.horaEncomenda}
                  </p>
                )}
              </div>

              <p className="grid h-12 place-items-center rounded-2xl bg-[#1f120d] px-4 text-lg font-black text-white">
                {dinheiro(pedido.total)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#f0d6bf] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a0643f]">
                  Itens
                </p>
                <div className="mt-2 space-y-1">
                  {pedido.itens.map((item) => (
                    <p key={item.id} className="text-sm font-bold text-[#1f120d]">
                      {item.quantidade}x {item.nome}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#f0d6bf] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a0643f]">
                  Entrega
                </p>
                <p className="mt-2 text-sm font-bold text-[#1f120d]">{pedido.tipoEntrega}</p>
                {pedido.telefone && (
                  <p className="mt-1 text-sm font-bold text-[#7a5942]">{pedido.telefone}</p>
                )}
                {pedido.tipoEntrega === "Entrega" && (
                  <p className="mt-1 text-sm leading-6 text-[#7a5942]">
                    {pedido.endereco}
                    <br />
                    {pedido.bairro}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
