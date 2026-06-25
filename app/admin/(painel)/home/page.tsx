"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

type Resumo = {
  produtos: number;
  categorias: number;
  bordas: number;
};

export default function AdminHomePage() {
  const { usuario, pizzaria, erro, carregando } = useAdminPizzaria();
  const [resumo, setResumo] = useState<Resumo>({ produtos: 0, categorias: 0, bordas: 0 });
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  useEffect(() => {
    async function carregarResumo() {
      if (!pizzaria) return;

      setCarregandoResumo(true);

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

      setResumo({
        produtos: produtosResult.count ?? 0,
        categorias: categoriasResult.count ?? 0,
        bordas: bordasResult.count ?? 0,
      });
      setCarregandoResumo(false);
    }

    carregarResumo();
  }, [pizzaria]);

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando início...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/10">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Início
        </p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              {pizzaria?.nome ?? "Painel da pizzaria"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Olá, {usuario?.nome ?? "admin"}. Os dados abaixo vêm do banco da pizzaria.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              href="/admin/pedidos"
              className="rounded-2xl bg-[#ff7a3d] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#ff6a26]"
            >
              Ver pedidos
            </Link>
            <Link
              href="/admin/produtos"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black text-zinc-100 transition hover:bg-white/10"
            >
              Ver cardápio
            </Link>
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      {pizzaria && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-zinc-400">Produtos ativos</p>
              <p className="mt-3 text-3xl font-black text-white">
                {carregandoResumo ? "..." : resumo.produtos}
              </p>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-zinc-400">Categorias ativas</p>
              <p className="mt-3 text-3xl font-black text-white">
                {carregandoResumo ? "..." : resumo.categorias}
              </p>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-zinc-400">Bordas ativas</p>
              <p className="mt-3 text-3xl font-black text-white">
                {carregandoResumo ? "..." : resumo.bordas}
              </p>
            </article>

            <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-zinc-400">Loja aberta</p>
              <p className="mt-3 text-3xl font-black text-white">
                {pizzaria.status_aberto ? "Sim" : "Não"}
              </p>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black text-white">Status da loja</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#0f0c0b] p-4">
                  <p className="text-sm text-zinc-400">Entrega</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {pizzaria.tempo_entrega_min}-{pizzaria.tempo_entrega_max} min
                  </p>
                </div>

                <div className="rounded-3xl bg-[#0f0c0b] p-4">
                  <p className="text-sm text-zinc-400">Encomendas</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {pizzaria.permite_encomendas ? "Ativas" : "Inativas"}
                  </p>
                </div>

                <div className="rounded-3xl bg-[#0f0c0b] p-4">
                  <p className="text-sm text-zinc-400">WhatsApp</p>
                  <p className="mt-2 text-lg font-black text-white">{pizzaria.whatsapp}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ffb26a]">
                Aviso público
              </p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-white">
                {pizzaria.mensagem_aviso ?? "Sem aviso cadastrado"}
              </h2>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
