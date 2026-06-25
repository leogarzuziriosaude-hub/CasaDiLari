"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

type Pedido = Record<string, unknown> & {
  id?: string;
  status?: string;
  total?: number;
  valor_total?: number;
  criado_em?: string;
  created_at?: string;
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataPedido(pedido: Pedido) {
  const data = pedido.criado_em ?? pedido.created_at;
  if (typeof data !== "string") return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function totalPedido(pedido: Pedido) {
  const total = pedido.total ?? pedido.valor_total;
  return typeof total === "number" ? dinheiro(total) : "Sem total";
}

export default function PedidosPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [erroPedidos, setErroPedidos] = useState("");

  useEffect(() => {
    async function carregarPedidos() {
      if (!pizzaria) return;

      setCarregandoPedidos(true);
      setErroPedidos("");

      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("pizzaria_id", pizzaria.id)
        .order("criado_em", { ascending: false })
        .limit(20);

      if (error) {
        setErroPedidos("Não foi possível carregar pedidos do banco.");
        setCarregandoPedidos(false);
        return;
      }

      setPedidos((data ?? []) as Pedido[]);
      setCarregandoPedidos(false);
    }

    carregarPedidos();
  }, [pizzaria]);

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando pedidos...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Pedidos
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Fila de pedidos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Pedidos carregados diretamente da tabela vinculada a {pizzaria?.nome ?? "esta pizzaria"}.
        </p>
      </section>

      {(erro || erroPedidos) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro || erroPedidos}
        </div>
      )}

      {pizzaria && (
        <section className="space-y-3">
          {carregandoPedidos && <p className="text-sm text-zinc-400">Carregando fila...</p>}

          {!carregandoPedidos && pedidos.length === 0 && !erroPedidos && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-zinc-300">
              Nenhum pedido encontrado no banco.
            </div>
          )}

          {pedidos.map((pedido, index) => (
            <article
              key={pedido.id ?? index}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffb26a]">
                    {typeof pedido.status === "string" ? pedido.status : "Pedido"}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">
                    {pedido.id ? `Pedido ${pedido.id}` : `Pedido ${index + 1}`}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">{dataPedido(pedido)}</p>
                </div>

                <p className="text-2xl font-black text-white">{totalPedido(pedido)}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
