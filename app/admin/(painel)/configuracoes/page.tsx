"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { salvarConfiguracaoLoja } from "@/lib/casadilariSupabase";

function arquivoParaDataUrl(arquivo: File) {
  return new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error("Não foi possível ler a foto."));
    leitor.readAsDataURL(arquivo);
  });
}

export default function ConfiguracoesPage() {
  const { pizzaria, erro, carregando } = useAdminPizzaria();
  const [nomeLoja, setNomeLoja] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [tempoEntrega, setTempoEntrega] = useState("");
  const [horaEncomendaInicio, setHoraEncomendaInicio] = useState("18:00");
  const [horaEncomendaFim, setHoraEncomendaFim] = useState("20:00");
  const [lojaAberta, setLojaAberta] = useState(true);
  const [fotoLoja, setFotoLoja] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sucessoVisivel, setSucessoVisivel] = useState(false);
  const sucessoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pizzaria) return;

    const timerId = window.setTimeout(() => {
      setNomeLoja(pizzaria.nome ?? "");
      setWhatsapp(pizzaria.whatsapp ?? "");
      setEnderecoLoja(pizzaria.endereco ?? "");
      setTempoEntrega(pizzaria.tempo_entrega_texto ?? "");
      setHoraEncomendaInicio(pizzaria.encomenda_hora_inicio ?? "18:00");
      setHoraEncomendaFim(pizzaria.encomenda_hora_fim ?? "20:00");
      setLojaAberta(Boolean(pizzaria.status_aberto));
      setFotoLoja(pizzaria.imagem_url ?? "");
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [pizzaria]);

  useEffect(() => {
    return () => {
      if (sucessoTimerRef.current) {
        window.clearTimeout(sucessoTimerRef.current);
      }
    };
  }, []);

  function mostrarSucesso() {
    setSucessoVisivel(true);

    if (sucessoTimerRef.current) {
      window.clearTimeout(sucessoTimerRef.current);
    }

    sucessoTimerRef.current = window.setTimeout(() => {
      setSucessoVisivel(false);
      sucessoTimerRef.current = null;
    }, 2000);
  }

  function montarConfig(statusAberto = lojaAberta) {
    return {
      ...(pizzaria ?? {
        id: "casa-di-lari",
        slug: "casadilari",
        tempo_entrega_min: 30,
        tempo_entrega_max: 45,
        permite_encomendas: true,
        mensagem_aviso: "Escolha seus sabores e faça seu pedido.",
        whatsapp: "",
        nome: "Casa Di Lari",
        status_aberto: true,
      }),
      nome: nomeLoja.trim() || "Minha pizzaria",
      slug: nomeLoja.trim() || "Minha pizzaria",
      whatsapp: whatsapp.trim(),
      endereco: enderecoLoja.trim(),
      status_aberto: statusAberto,
      tempo_entrega_texto: tempoEntrega.trim() || null,
      encomenda_hora_inicio: horaEncomendaInicio || "18:00",
      encomenda_hora_fim: horaEncomendaFim || "20:00",
      imagem_url: fotoLoja || null,
    };
  }

  async function alternarLojaAberta() {
    if (!pizzaria || salvando) return;

    const proximoStatus = !lojaAberta;
    setLojaAberta(proximoStatus);

    try {
      await salvarConfiguracaoLoja(montarConfig(proximoStatus));
      window.dispatchEvent(new Event("casadilari:config-updated"));
    } catch {
      setLojaAberta(!proximoStatus);
      setFeedback("Não foi possível alterar o status da loja.");
    }
  }

  async function selecionarFoto(arquivo: File | null) {
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setFeedback("Selecione uma imagem válida.");
      return;
    }

    try {
      setFotoLoja(await arquivoParaDataUrl(arquivo));
    } catch {
      setFeedback("Não foi possível carregar a foto.");
    }
  }

  async function salvarConfiguracoes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pizzaria || salvando) return;

    setSalvando(true);
    setFeedback("");

    try {
      await salvarConfiguracaoLoja(montarConfig());
      window.dispatchEvent(new Event("casadilari:config-updated"));
      mostrarSucesso();
    } catch {
      setFeedback("Não foi possível salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#f0d6bf] bg-[#fff7ed] p-6 text-[#1f120d] shadow-[0_18px_45px_rgba(31,18,13,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#9d4d20]">
          Configurações
        </p>
        <h1 className="mt-3 text-3xl font-black">Loja</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a5942]">
          Ajuste as informações que aparecem no cardápio do cliente.
        </p>
      </section>

      {erro && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {erro}
        </div>
      )}

      {feedback && (
        <div className="rounded-2xl border border-[#ffb26a]/30 bg-[#ff7a3d]/10 p-4 text-sm font-black text-[#ffb26a]">
          {feedback}
        </div>
      )}

      {sucessoVisivel && (
        <button
          type="button"
          onClick={() => setSucessoVisivel(false)}
          className="fixed right-4 top-4 z-50 rounded-2xl border border-[#22a45d]/30 bg-[#e9f8ef] px-5 py-3 text-sm font-black text-[#176f40] shadow-2xl shadow-black/20"
        >
          Configurações salvas com sucesso
        </button>
      )}

      {pizzaria && (
        <form onSubmit={salvarConfiguracoes} className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0f0c0b] p-4">
              <div>
                <h2 className="text-lg font-black text-white">Loja aberta</h2>
                <p className="mt-1 text-sm font-bold text-zinc-400">
                  Quando estiver fechada, o cliente não consegue finalizar pedido.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={lojaAberta}
                onClick={alternarLojaAberta}
                className={`relative h-9 w-16 shrink-0 rounded-full p-1 transition ${
                  lojaAberta ? "bg-[#22a45d]" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`block h-7 w-7 rounded-full bg-white shadow-sm transition ${
                    lojaAberta ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p
              className={`mt-3 rounded-2xl px-4 py-3 text-sm font-black ${
                lojaAberta
                  ? "bg-[#22a45d]/10 text-[#7ee0a8]"
                  : "bg-red-500/10 text-red-200"
              }`}
            >
              Status atual: {lojaAberta ? "Aberta para pedidos" : "Fechada para pedidos"}
            </p>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Nome da loja
                </span>
                <input
                  value={nomeLoja}
                  onChange={(event) => setNomeLoja(event.target.value)}
                  placeholder="Ex: Casa Di Lari"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  WhatsApp
                </span>
                <input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  placeholder="Ex: (21) 99999-9999"
                  inputMode="tel"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Endereço
                </span>
                <input
                  value={enderecoLoja}
                  onChange={(event) => setEnderecoLoja(event.target.value)}
                  placeholder="Ex: Rua das Pizzas, 123"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-zinc-200">
                  Tempo de entrega
                </span>
                <input
                  value={tempoEntrega}
                  onChange={(event) => setTempoEntrega(event.target.value)}
                  placeholder="Ex: 30 a 45 min"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                />
                <span className="mt-2 block text-xs font-bold text-zinc-500">
                  Se deixar vazio, essa informação não aparece para o cliente.
                </span>
              </label>

              <div className="rounded-3xl border border-white/10 bg-[#0f0c0b] p-4">
                <h2 className="text-lg font-black text-white">Horário de encomenda</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-zinc-400">
                  Quando a loja estiver fechada, o cliente só pode reservar dentro desse horário.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Abertura
                    </span>
                    <input
                      type="time"
                      value={horaEncomendaInicio}
                      onChange={(event) => setHoraEncomendaInicio(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#15100e] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-zinc-200">
                      Fechamento
                    </span>
                    <input
                      type="time"
                      value={horaEncomendaFim}
                      onChange={(event) => setHoraEncomendaFim(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#15100e] px-4 text-sm font-bold text-white outline-none focus:border-[#ff7a3d]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-black text-white">Foto da loja</h2>
            <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-[#0f0c0b] p-3">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-3xl bg-white/[0.04]">
                {fotoLoja ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoLoja}
                    alt="Foto da loja"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-4 text-center text-sm font-bold leading-6 text-zinc-500">
                    Sem foto
                  </span>
                )}
              </div>

              <label className="grid h-11 cursor-pointer place-items-center rounded-2xl bg-[#ff7a3d] px-4 text-sm font-black text-white transition hover:bg-[#ff6a26]">
                Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => selecionarFoto(event.target.files?.[0] ?? null)}
                />
              </label>

              {fotoLoja && (
                <button
                  type="button"
                  onClick={() => setFotoLoja("")}
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-zinc-200"
                >
                  Remover foto
                </button>
              )}
            </div>
          </aside>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff7a3d] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ff6a26] disabled:opacity-70"
            >
              {salvando && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {salvando ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
