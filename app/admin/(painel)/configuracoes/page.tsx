"use client";

import { useAdminPizzaria } from "@/lib/useAdminPizzaria";

export default function ConfiguracoesPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Configurações
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">
          {pizzaria?.nome ?? "Ajustes da pizzaria"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          Dados atuais cadastrados no banco.
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
            <h2 className="text-lg font-black text-white">Atendimento</h2>
            <p className="mt-3 text-3xl font-black text-white">
              {pizzaria.status_aberto ? "Aberto" : "Fechado"}
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Entrega</h2>
            <p className="mt-3 text-3xl font-black text-white">
              {pizzaria.tempo_entrega_min}-{pizzaria.tempo_entrega_max} min
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Encomendas</h2>
            <p className="mt-3 text-3xl font-black text-white">
              {pizzaria.permite_encomendas ? "Ativas" : "Inativas"}
            </p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
            <h2 className="text-lg font-black text-white">WhatsApp</h2>
            <p className="mt-3 text-2xl font-black text-white">{pizzaria.whatsapp}</p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Slug</h2>
            <p className="mt-3 text-2xl font-black text-white">{pizzaria.slug}</p>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 lg:col-span-3">
            <h2 className="text-lg font-black text-white">Aviso público</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {pizzaria.mensagem_aviso ?? "Sem aviso cadastrado"}
            </p>
          </article>
        </section>
      )}
    </div>
  );
}
