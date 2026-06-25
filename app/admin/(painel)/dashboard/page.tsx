"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

type Metricas = {
  produtos: number;
  categorias: number;
  bordas: number;
};

export default function DashboardPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [metricas, setMetricas] = useState<Metricas>({ produtos: 0, categorias: 0, bordas: 0 });
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);

  useEffect(() => {
    async function carregarMetricas() {
      if (!pizzaria) return;

      setCarregandoMetricas(true);

      const [produtosResult, categoriasResult, bordasResult] = await Promise.all([
        supabase
          .from("produtos")
          .select("id", { count: "exact", head: true })
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true),
        supabase
          .from("categorias")
          .select("id", { count: "exact", head: true })
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true),
        supabase
          .from("bordas")
          .select("id", { count: "exact", head: true })
          .eq("pizzaria_id", pizzaria.id)
          .eq("ativo", true),
      ]);

      setMetricas({
        produtos: produtosResult.count ?? 0,
        categorias: categoriasResult.count ?? 0,
        bordas: bordasResult.count ?? 0,
      });
      setCarregandoMetricas(false);
    }

    carregarMetricas();
  }, [pizzaria]);

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {pizzaria?.nome ?? "Pizzaria"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Indicadores carregados diretamente do banco.
        </p>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      {pizzaria && (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Produtos ativos</h2>
            <p className="mt-3 text-4xl font-black text-white">
              {carregandoMetricas ? "..." : metricas.produtos}
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Categorias ativas</h2>
            <p className="mt-3 text-4xl font-black text-white">
              {carregandoMetricas ? "..." : metricas.categorias}
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Bordas ativas</h2>
            <p className="mt-3 text-4xl font-black text-white">
              {carregandoMetricas ? "..." : metricas.bordas}
            </p>
          </article>
        </section>
      )}
    </div>
  );
}
