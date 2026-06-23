"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Usuario = {
  id: string;
  nome: string;
  perfil: string;
  pizzaria_id: string;
};

type Pizzaria = {
  id: string;
  nome: string;
  slug: string;
  whatsapp: string;
  status_aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  permite_encomendas: boolean;
};

const resumo = [
  {
    titulo: "Pedidos do dia",
    valor: "18",
    detalhe: "4 aguardando confirmação",
  },
  {
    titulo: "Produtos ativos",
    valor: "42",
    detalhe: "Sabores, bebidas e combos",
  },
  {
    titulo: "Tempo médio",
    valor: "38 min",
    detalhe: "Entrega estimada ao cliente",
  },
  {
    titulo: "Faturamento",
    valor: "R$ 3.480",
    detalhe: "Simulação para o painel",
  },
];

export default function AdminHomePage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pizzaria, setPizzaria] = useState<Pizzaria | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setCarregando(false);
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, nome, perfil, pizzaria_id")
        .eq("id", session.user.id)
        .single();

      if (usuarioError || !usuarioData) {
        setErro("Usuário não vinculado a nenhuma pizzaria.");
        setCarregando(false);
        return;
      }

      setUsuario(usuarioData);

      const { data: pizzariaData, error: pizzariaError } = await supabase
        .from("pizzarias")
        .select(
          "id, nome, slug, whatsapp, status_aberto, tempo_entrega_min, tempo_entrega_max, permite_encomendas"
        )
        .eq("id", usuarioData.pizzaria_id)
        .single();

      if (pizzariaError || !pizzariaData) {
        setErro("Não foi possível carregar os dados da pizzaria.");
        setCarregando(false);
        return;
      }

      setPizzaria(pizzariaData);
      setCarregando(false);
    }

    carregarDados();
  }, []);

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
              Olá, {usuario?.nome ?? "admin"}. Aqui você acompanha pedidos, ajusta
              cardápio, mexe em preços e deixa tudo pronto para vender mais pizza.
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
              Editar cardápio
            </Link>
          </div>
        </div>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {resumo.map((item) => (
          <article
            key={item.titulo}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
          >
            <p className="text-sm text-zinc-400">{item.titulo}</p>
            <p className="mt-3 text-3xl font-black text-white">{item.valor}</p>
            <p className="mt-2 text-sm text-zinc-300">{item.detalhe}</p>
          </article>
        ))}
      </section>

      {pizzaria && (
        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black text-white">Status da loja</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-[#0f0c0b] p-4">
                <p className="text-sm text-zinc-400">Aberta agora</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {pizzaria.status_aberto ? "Sim" : "Não"}
                </p>
              </div>

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
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#ffb74d] via-[#ff7a3d] to-[#b8362b] p-6 text-[#230f0c] shadow-2xl shadow-black/15">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#421c10]">
              Próximo passo
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">
              Deixar o painel pronto para operação real.
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#421c10]/90">
              Agora a base já tem navegação de verdade. O próximo passo é ligar os
              CRUDs de produtos, pedidos e preço ao banco da pizzaria.
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href="/admin/pedidos"
                className="rounded-2xl bg-[#1f120d] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-black"
              >
                Abrir fila de pedidos
              </Link>
              <Link
                href="/admin/configuracoes"
                className="rounded-2xl border border-[#3d1a11]/15 bg-white/30 px-4 py-3 text-center text-sm font-black text-[#1f120d] transition hover:bg-white/40"
              >
                Ajustar configurações
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
