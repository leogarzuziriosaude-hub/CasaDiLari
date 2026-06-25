"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { useModalClose } from "@/lib/useModalClose";
import { ConfirmDialog } from "@/lib/ConfirmDialog";

type Borda = {
  id: string;
  nome: string;
  preco: number;
  ordem: number | null;
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function precoNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function precoInput(valor: number) {
  return String(valor).replace(".", ",");
}

export default function BordasPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [bordas, setBordas] = useState<Borda[]>([]);
  const [bordaEditando, setBordaEditando] = useState<Borda | null>(null);
  const [bordaParaExcluir, setBordaParaExcluir] = useState<Borda | null>(null);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroBordas, setErroBordas] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const modalRef = useRef<HTMLFormElement | null>(null);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setBordaEditando(null);
    setNome("");
    setPreco("");
    setSalvando(false);
  }, []);

  useModalClose(modalAberto, fecharModal, modalRef);

  useEffect(() => {
    async function carregarBordas() {
      if (!pizzaria) return;

      const { data, error } = await supabase
        .from("bordas")
        .select("id, nome, preco, ordem")
        .eq("pizzaria_id", pizzaria.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        setErroBordas("Não foi possível carregar as bordas.");
        return;
      }

      setBordas(((data ?? []) as Borda[]).map((borda) => ({ ...borda, preco: Number(borda.preco) })));
    }

    carregarBordas();
  }, [pizzaria, refreshKey]);

  function abrirNovo() {
    setBordaEditando(null);
    setNome("");
    setPreco("");
    setModalAberto(true);
  }

  function abrirEdicao(borda: Borda) {
    setBordaEditando(borda);
    setNome(borda.nome);
    setPreco(precoInput(borda.preco));
    setModalAberto(true);
  }

  async function salvarBorda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizzaria || !nome.trim()) return;

    const precoFinal = precoNumero(preco || "0");

    if (!Number.isFinite(precoFinal) || precoFinal < 0) {
      setErroBordas("Informe um preço válido.");
      return;
    }

    setSalvando(true);
    setErroBordas("");

    if (bordaEditando) {
      const { error } = await supabase
        .from("bordas")
        .update({
          nome: nome.trim(),
          preco: precoFinal,
        })
        .eq("id", bordaEditando.id)
        .eq("pizzaria_id", pizzaria.id);

      if (error) {
        setErroBordas("Não foi possível editar a borda.");
        setSalvando(false);
        return;
      }
    } else {
      const { count } = await supabase
        .from("bordas")
        .select("id", { count: "exact", head: true })
        .eq("pizzaria_id", pizzaria.id);

      const { error } = await supabase.from("bordas").insert({
        pizzaria_id: pizzaria.id,
        nome: nome.trim(),
        preco: precoFinal,
        ativo: true,
        ordem: (count ?? 0) + 1,
      });

      if (error) {
        setErroBordas("Não foi possível salvar a borda.");
        setSalvando(false);
        return;
      }
    }

    fecharModal();
    setRefreshKey((atual) => atual + 1);
  }

  async function confirmarExclusaoBorda() {
    if (!pizzaria || !bordaParaExcluir) return;

    setExcluindo(true);
    const { error } = await supabase
      .from("bordas")
      .update({ ativo: false })
      .eq("id", bordaParaExcluir.id)
      .eq("pizzaria_id", pizzaria.id);

    if (error) {
      setErroBordas("Não foi possível excluir a borda.");
      setExcluindo(false);
      return;
    }

    setBordaParaExcluir(null);
    setExcluindo(false);
    setRefreshKey((atual) => atual + 1);
  }

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando bordas...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
              Produtos
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">Bordas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Cadastre as bordas disponíveis para pizzas.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
          >
            + Adicionar borda
          </button>
        </div>
      </section>

      {(erro || erroBordas) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro || erroBordas}
        </div>
      )}

      <section className="grid gap-3">
        {bordas.map((borda) => (
          <article
            key={borda.id}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Ordem {borda.ordem ?? "-"}
                </p>
                <h2 className="mt-2 text-xl font-black text-white">{borda.nome}</h2>
                <p className="mt-2 text-2xl font-black text-white">{dinheiro(borda.preco)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => abrirEdicao(borda)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setBordaParaExcluir(borda)}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        ))}

        {bordas.length === 0 && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-zinc-300">
            Nenhuma borda cadastrada.
          </div>
        )}
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            ref={modalRef}
            onSubmit={salvarBorda}
            className="w-full rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  {bordaEditando ? "Editar borda" : "Nova borda"}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {bordaEditando ? "Editar borda" : "Adicionar borda"}
                </h2>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_140px]">
              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">Nome</span>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">Preço</span>
                <input
                  value={preco}
                  onChange={(event) => setPreco(event.target.value)}
                  placeholder="8,00"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar borda"}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(bordaParaExcluir)}
        titulo="Excluir borda?"
        descricao={`A borda "${bordaParaExcluir?.nome ?? ""}" deixará de aparecer para novas pizzas.`}
        confirmando={excluindo}
        onCancelar={() => setBordaParaExcluir(null)}
        onConfirmar={confirmarExclusaoBorda}
      />
    </div>
  );
}
