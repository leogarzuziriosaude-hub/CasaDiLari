"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { label: "Início", href: "/admin/home" },
  { label: "Pedidos", href: "/admin/pedidos" },
  { label: "Produtos", href: "/admin/produtos" },
  { label: "Encomendas", href: "/admin/encomendas" },
  { label: "Configurações", href: "/admin/configuracoes" },
  { label: "Dashboard", href: "/admin/dashboard" },
];

function MenuIcon({ aberto }: { aberto: boolean }) {
  return (
    <span className="flex flex-col gap-1">
      <span
        className={`h-0.5 w-5 rounded-full bg-current transition ${
          aberto ? "translate-y-1.5 rotate-45" : ""
        }`}
      />
      <span
        className={`h-0.5 w-5 rounded-full bg-current transition ${
          aberto ? "opacity-0" : ""
        }`}
      />
      <span
        className={`h-0.5 w-5 rounded-full bg-current transition ${
          aberto ? "-translate-y-1.5 -rotate-45" : ""
        }`}
      />
    </span>
  );
}

export default function AdminPainelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    async function verificarLogin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      setCarregando(false);
    }

    verificarLogin();
  }, [router]);

  useEffect(() => {
    if (!menuAberto) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    function fecharNoEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuAberto(false);
      }
    }

    window.addEventListener("keydown", fecharNoEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", fecharNoEscape);
    };
  }, [menuAberto]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#2b1511_0%,#120c0a_45%,#0b0908_100%)] text-zinc-100">
        <p className="text-sm text-zinc-400">Carregando painel...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2b1511_0%,#140f0d_48%,#0b0908_100%)] text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-white/10 bg-white/[0.04] px-5 py-6 backdrop-blur lg:flex">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#ffb74d] via-[#ff7a3d] to-[#b8362b] p-5 text-[#210f0b] shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3a170d]">
              Pizza SaaS
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight">
              Painel da pizzaria
            </h1>
            <p className="mt-2 max-w-xs text-sm font-medium text-[#3a170d]/85">
              Controle pedidos, preços, cardápio e configurações num só lugar.
            </p>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-2">
            {menuItems.map((item) => {
              const ativo = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    ativo
                      ? "border-[#ff7a3d] bg-[#ff7a3d] text-white shadow-lg shadow-[#ff7a3d]/20"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={sair}
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Sair
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0f0c0b]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              onClick={() => setMenuAberto((atual) => !atual)}
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg shadow-black/15"
            >
              <MenuIcon aberto={menuAberto} />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ffb26a]">
                Pizza SaaS
              </p>
              <h1 className="truncate text-sm font-bold text-zinc-100">
                Painel da pizzaria
              </h1>
            </div>

            <button
              type="button"
              onClick={sair}
              className="ml-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-200"
            >
              Sair
            </button>
          </header>

          <div className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 transition lg:hidden ${
          menuAberto ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!menuAberto}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className={`absolute inset-0 bg-black/60 transition ${
            menuAberto ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-[86vw] max-w-sm flex-col border-r border-white/10 bg-[#120e0d] px-5 py-6 shadow-2xl shadow-black/40 transition duration-300 ${
            menuAberto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#ffb74d] via-[#ff7a3d] to-[#b8362b] p-5 text-[#210f0b] shadow-2xl shadow-black/20">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#3a170d]">
              Pizza SaaS
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight">
              Painel da pizzaria
            </h2>
            <p className="mt-2 text-sm font-medium text-[#3a170d]/85">
              Menu rápido para pedidos, produtos e ajustes de preço.
            </p>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-2">
            {menuItems.map((item) => {
              const ativo = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    ativo
                      ? "border-[#ff7a3d] bg-[#ff7a3d] text-white shadow-lg shadow-[#ff7a3d]/20"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={sair}
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Sair
          </button>
        </aside>
      </div>
    </main>
  );
}
