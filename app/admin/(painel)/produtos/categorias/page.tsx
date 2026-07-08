"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { useModalClose } from "@/lib/useModalClose";
import { ConfirmDialog } from "@/lib/ConfirmDialog";

type Categoria = {
  id: string;
  nome: string;
  ordem: number | null;
};

function categoriasLocaisKey(pizzariaId: string) {
  return `casadilari:categorias:${pizzariaId}`;
}

function carregarCategoriasLocais(pizzariaId: string): Categoria[] {
  if (typeof window === "undefined") return [];

  try {
    const valor = window.localStorage.getItem(categoriasLocaisKey(pizzariaId));
    return valor ? (JSON.parse(valor) as Categoria[]) : [];
  } catch {
    return [];
  }
}

function salvarCategoriasLocais(pizzariaId: string, categorias: Categoria[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    categoriasLocaisKey(pizzariaId),
    JSON.stringify(categorias)
  );
}

function ordenarCategorias(categorias: Categoria[]) {
  return [...categorias].sort((categoriaA, categoriaB) => {
    const ordemA = categoriaA.ordem ?? Number.MAX_SAFE_INTEGER;
    const ordemB = categoriaB.ordem ?? Number.MAX_SAFE_INTEGER;

    if (ordemA !== ordemB) return ordemA - ordemB;
    return categoriaA.nome.localeCompare(categoriaB.nome);
  });
}


export default function CategoriasPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);
  const [nome, setNome] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [ordenando, setOrdenando] = useState(false);
  const [categoriaArrastandoId, setCategoriaArrastandoId] = useState<string | null>(null);
  const [erroCategorias, setErroCategorias] = useState("");
  const modalRef = useRef<HTMLFormElement | null>(null);
  const categoriasRef = useRef<Categoria[]>([]);
  const arrastandoIdRef = useRef<string | null>(null);
  const mudouOrdemRef = useRef(false);

  useEffect(() => {
    categoriasRef.current = categorias;
  }, [categorias]);

  const fecharModal = useCallback(() => {
    setModalAberto(false);
    setCategoriaEditando(null);
    setNome("");
    setSalvando(false);
  }, []);

  useModalClose(modalAberto, fecharModal, modalRef);

  useEffect(() => {
    if (!pizzaria) return;

    const timerId = window.setTimeout(() => {
      setCategorias(carregarCategoriasLocais(pizzaria.id));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [pizzaria]);

  function salvarCategoriasNoFront(proximasCategorias: Categoria[]) {
    if (!pizzaria) return;

    const categoriasOrdenadas = ordenarCategorias(
      proximasCategorias.map((categoria, index) => ({
        ...categoria,
        ordem: categoria.ordem ?? index + 1,
      }))
    ).map((categoria, index) => ({
      ...categoria,
      ordem: index + 1,
    }));

    categoriasRef.current = categoriasOrdenadas;
    setCategorias(categoriasOrdenadas);
    salvarCategoriasLocais(pizzaria.id, categoriasOrdenadas);
  }

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

  function salvarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizzaria || !nome.trim()) return;

    setSalvando(true);
    setErroCategorias("");

    const nomeFinal = nome.trim();
    const categoriasAtuais = categoriasRef.current;
    const nomeJaExiste = categoriasAtuais.some(
      (categoria) =>
        categoria.id !== categoriaEditando?.id &&
        categoria.nome.trim().toLowerCase() === nomeFinal.toLowerCase()
    );

    if (nomeJaExiste) {
      setErroCategorias("Já existe uma categoria com esse nome.");
      setSalvando(false);
      return;
    }

    if (categoriaEditando) {
      salvarCategoriasNoFront(
        categoriasAtuais.map((categoria) =>
          categoria.id === categoriaEditando.id
            ? { ...categoria, nome: nomeFinal }
            : categoria
        )
      );
    } else {
      const proximaOrdem =
        categoriasAtuais.reduce(
          (maiorOrdem, categoria) => Math.max(maiorOrdem, categoria.ordem ?? 0),
          0
        ) + 1;

      salvarCategoriasNoFront([
        ...categoriasAtuais,
        {
          id: `local-${crypto.randomUUID()}`,
          nome: nomeFinal,
          ordem: proximaOrdem,
        },
      ]);
    }

    setSalvando(false);
    fecharModal();
  }

  function confirmarExclusaoCategoria() {
    if (!categoriaParaExcluir) return;

    setExcluindo(true);
    salvarCategoriasNoFront(
      categoriasRef.current.filter(
        (categoria) => categoria.id !== categoriaParaExcluir.id
      )
    );
    setCategoriaParaExcluir(null);
    setExcluindo(false);
  }

  function reordenarLocal(origemId: string, destinoId: string) {
    if (origemId === destinoId) return;

    const lista = categoriasRef.current;
    const origemIndex = lista.findIndex((categoria) => categoria.id === origemId);
    const destinoIndex = lista.findIndex((categoria) => categoria.id === destinoId);

    if (origemIndex < 0 || destinoIndex < 0) return;

    const novaLista = [...lista];
    const [movida] = novaLista.splice(origemIndex, 1);
    novaLista.splice(destinoIndex, 0, movida);

    const normalizada = novaLista.map((categoria, index) => ({
      ...categoria,
      ordem: index + 1,
    }));

    mudouOrdemRef.current = true;
    categoriasRef.current = normalizada;
    setCategorias(normalizada);
  }

  function salvarOrdemCategorias(lista: Categoria[]) {
    if (!pizzaria || lista.length === 0) return;

    setOrdenando(true);
    setErroCategorias("");
    salvarCategoriasNoFront(
      lista.map((categoria, index) => ({
        ...categoria,
        ordem: index + 1,
      }))
    );
    setOrdenando(false);
  }

  function moverCategoria(categoriaId: string, direcao: -1 | 1) {
    const atual = categoriasRef.current;
    const index = atual.findIndex((categoria) => categoria.id === categoriaId);
    const destinoIndex = index + direcao;

    if (index < 0 || destinoIndex < 0 || destinoIndex >= atual.length) return;

    reordenarLocal(categoriaId, atual[destinoIndex].id);
    salvarOrdemCategorias(categoriasRef.current);
  }

  function iniciarArraste(categoriaId: string) {
    arrastandoIdRef.current = categoriaId;
    mudouOrdemRef.current = false;
    setCategoriaArrastandoId(categoriaId);
  }

  function moverArraste(clientX: number, clientY: number) {
    const origemId = arrastandoIdRef.current;
    if (!origemId) return;

    const elemento = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(
      "[data-categoria-id]"
    );
    const destinoId = elemento?.dataset.categoriaId;

    if (destinoId) {
      reordenarLocal(origemId, destinoId);
    }
  }

  function finalizarArraste() {
    arrastandoIdRef.current = null;
    setCategoriaArrastandoId(null);

    if (mudouOrdemRef.current) {
      mudouOrdemRef.current = false;
      salvarOrdemCategorias(categoriasRef.current);
    }
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
            <p className="mt-2 text-xs font-bold text-zinc-500">
              Arraste pela alça para mudar a ordem ou use as setas.
            </p>
          </div>

          <div className="grid gap-2 sm:flex">
            <button
              type="button"
              onClick={abrirNovo}
              className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
            >
              + Adicionar categoria
            </button>
          </div>
        </div>
      </section>

      {(erro || erroCategorias) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro || erroCategorias}
        </div>
      )}

      <section className="grid gap-3">
        {ordenando && (
          <div className="rounded-2xl border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 p-3 text-sm font-bold text-[#ffcfb3]">
            Salvando nova ordem...
          </div>
        )}

        {categorias.map((categoria, index) => (
          <article
            key={categoria.id}
            data-categoria-id={categoria.id}
            draggable
            onDragStart={(event) => {
              iniciarArraste(categoria.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              event.preventDefault();
              reordenarLocal(categoria.id === categoriaArrastandoId ? categoria.id : categoriaArrastandoId ?? "", categoria.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              finalizarArraste();
            }}
            onDragEnd={() => finalizarArraste()}
            className={`rounded-[24px] border p-4 transition sm:p-5 ${
              categoriaArrastandoId === categoria.id
                ? "border-[#ff7a3d]/60 bg-[#ff7a3d]/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Arrastar categoria ${categoria.nome}`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    iniciarArraste(categoria.id);
                  }}
                  onPointerMove={(event) => moverArraste(event.clientX, event.clientY)}
                  onPointerUp={(event) => {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    finalizarArraste();
                  }}
                  onPointerCancel={() => finalizarArraste()}
                  className="grid h-11 w-11 shrink-0 touch-none place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-zinc-300"
                >
                  ::
                </button>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                    Ordem {index + 1}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-white">{categoria.nome}</h2>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => moverCategoria(categoria.id, -1)}
                  disabled={index === 0 || ordenando}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-black text-zinc-100 disabled:opacity-35"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moverCategoria(categoria.id, 1)}
                  disabled={index === categorias.length - 1 || ordenando}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-black text-zinc-100 disabled:opacity-35"
                >
                  ↓
                </button>
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
