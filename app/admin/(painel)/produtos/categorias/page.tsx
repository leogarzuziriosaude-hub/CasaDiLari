"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { useModalClose } from "@/lib/useModalClose";
import { ConfirmDialog } from "@/lib/ConfirmDialog";

type Categoria = {
  id: string;
  nome: string;
  ordem: number | null;
};

export default function CategoriasPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);
  const [nome, setNome] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroCategorias, setErroCategorias] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const modalRef = useRef<HTMLFormElement | null>(null);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setCategoriaEditando(null);
    setNome("");
    setSalvando(false);
  }, []);

  useModalClose(modalAberto, fecharModal, modalRef);

  useEffect(() => {
    async function carregarCategorias() {
      if (!pizzaria) return;

      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome, ordem")
        .eq("pizzaria_id", pizzaria.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        setErroCategorias("Não foi possível carregar as categorias.");
        return;
      }

      setCategorias((data ?? []) as Categoria[]);
    }

    carregarCategorias();
  }, [pizzaria, refreshKey]);

  function abrirNovo() {
    setCategoriaEditando(null);
    setNome("");
    setModalAberto(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setCategoriaEditando(categoria);
    setNome(categoria.nome);
    setModalAberto(true);
  }

  async function salvarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizzaria || !nome.trim()) return;

    setSalvando(true);
    setErroCategorias("");

    if (categoriaEditando) {
      const { error } = await supabase
        .from("categorias")
        .update({ nome: nome.trim() })
        .eq("id", categoriaEditando.id)
        .eq("pizzaria_id", pizzaria.id);

      if (error) {
        setErroCategorias("Não foi possível editar a categoria.");
        setSalvando(false);
        return;
      }
    } else {
      const { count } = await supabase
        .from("categorias")
        .select("id", { count: "exact", head: true })
        .eq("pizzaria_id", pizzaria.id);

      const { error } = await supabase.from("categorias").insert({
        pizzaria_id: pizzaria.id,
        nome: nome.trim(),
        ativo: true,
        ordem: (count ?? 0) + 1,
      });

      if (error) {
        setErroCategorias("Não foi possível salvar a categoria.");
        setSalvando(false);
        return;
      }
    }

    fecharModal();
    setRefreshKey((atual) => atual + 1);
  }

  async function confirmarExclusaoCategoria() {
    if (!pizzaria || !categoriaParaExcluir) return;

    setExcluindo(true);
    const { error } = await supabase
      .from("categorias")
      .update({ ativo: false })
      .eq("id", categoriaParaExcluir.id)
      .eq("pizzaria_id", pizzaria.id);

    if (error) {
      setErroCategorias("Não foi possível excluir a categoria.");
      setExcluindo(false);
      return;
    }

    setCategoriaParaExcluir(null);
    setExcluindo(false);
    setRefreshKey((atual) => atual + 1);
  }

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando categorias...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
              Produtos
            </p>
            <h1 className="mt-3 text-3xl font-black text-white">Categorias</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Organize o cardápio em grupos como tradicionais, especiais, bebidas e combos.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
          >
            + Adicionar categoria
          </button>
        </div>
      </section>

      {(erro || erroCategorias) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro || erroCategorias}
        </div>
      )}

      <section className="grid gap-3">
        {categorias.map((categoria) => (
          <article
            key={categoria.id}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Ordem {categoria.ordem ?? "-"}
                </p>
                <h2 className="mt-2 text-xl font-black text-white">{categoria.nome}</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => abrirEdicao(categoria)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaParaExcluir(categoria)}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200"
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        ))}

        {categorias.length === 0 && (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm font-bold text-zinc-300">
            Nenhuma categoria cadastrada.
          </div>
        )}
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <form
            ref={modalRef}
            onSubmit={salvarCategoria}
            className="w-full rounded-t-[32px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
                  {categoriaEditando ? "Editar categoria" : "Nova categoria"}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {categoriaEditando ? "Editar categoria" : "Adicionar categoria"}
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

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-zinc-200">Nome</span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
              />
            </label>

            <button
              type="submit"
              disabled={salvando}
              className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar categoria"}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        aberto={Boolean(categoriaParaExcluir)}
        titulo="Excluir categoria?"
        descricao={`A categoria "${categoriaParaExcluir?.nome ?? ""}" será removida das opções ativas do cardápio.`}
        confirmando={excluindo}
        onCancelar={() => setCategoriaParaExcluir(null)}
        onConfirmar={confirmarExclusaoCategoria}
      />
    </div>
  );
}
