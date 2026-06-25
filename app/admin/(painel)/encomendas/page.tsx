"use client";

import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

export default function EncomendasPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando encomendas...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Encomendas
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Pedidos programados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Status real de encomendas cadastrado para {pizzaria?.nome ?? "a pizzaria"}.
        </p>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      {pizzaria && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Encomendas</h2>
            <p className="mt-3 text-4xl font-black text-white">
              {pizzaria.permite_encomendas ? "Ativas" : "Inativas"}
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Canal de atendimento</h2>
            <p className="mt-3 text-2xl font-black text-white">{pizzaria.whatsapp}</p>
          </article>
        </section>
      )}
    </div>
  );
}
