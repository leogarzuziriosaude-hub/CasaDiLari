"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.push("/admin/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#2b1511_0%,#120c0a_45%,#0b0908_100%)] px-4 text-zinc-100">
      <div className="w-full max-w-sm rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#ffb74d] via-[#ff7a3d] to-[#b8362b] p-5 text-[#210f0b] shadow-2xl shadow-black/20">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3a170d]">
            Pizza SaaS
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight">
            Acesso do dono
          </h1>
          <p className="mt-2 text-sm font-medium text-[#3a170d]/85">
            Entre para ver pedidos, produtos e preços da pizzaria.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">
              E-mail
            </label>

            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="email@exemplo.com"
              className="w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 py-3 text-sm outline-none transition focus:border-[#ff7a3d]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">
              Senha
            </label>

            <input
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              type="password"
              placeholder="Digite sua senha"
              className="w-full rounded-2xl border border-white/10 bg-[#0f0c0b] px-4 py-3 text-sm outline-none transition focus:border-[#ff7a3d]"
            />
          </div>

          {erro && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
              {erro}
            </p>
          )}

          <button
            type="button"
            onClick={entrar}
            disabled={carregando}
            className="w-full rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#ff6a26] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">
          Sistema de cardápio online
        </p>
      </div>
    </main>
  );
}
