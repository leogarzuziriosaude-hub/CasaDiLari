"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminPizzaria } from "@/lib/useAdminPizzaria";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  label: string;
  href: string;
  children?: {
    label: string;
    href: string;
  }[];
};

const menuItems: MenuItem[] = [
  { label: "Pedidos", href: "/admin/pedidos" },
  { label: "Cardápio", href: "/admin/produtos" },
  { label: "Configurações", href: "/admin/configuracoes" },
  { label: "Histórico", href: "/admin/historico" },
];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function MarcaLoja({ compacta = false }: { compacta?: boolean }) {
  const { pizzaria } = useAdminPizzaria();
  const nome = pizzaria?.nome ?? "Loja";

  return (
    <div className={`flex flex-col items-center text-center ${compacta ? "gap-2" : "gap-4"}`}>
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#ff7a3d] text-[#210f0b] shadow-xl shadow-black/25 ${
          compacta ? "h-12 w-12 text-base" : "h-32 w-32 text-4xl"
        }`}
      >
        {pizzaria?.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pizzaria.imagem_url}
            alt={nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-black">{iniciais(nome)}</span>
        )}
      </div>
      <div>
        <p className={`${compacta ? "text-sm" : "text-sm"} font-black text-white`}>
          {nome}
        </p>
      </div>
    </div>
  );
}

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

function MenuLinks({
  pathname,
  fechar,
  mobile = false,
}: {
  pathname: string;
  fechar: () => void;
  mobile?: boolean;
}) {
  const [itensAbertos, setItensAbertos] = useState<string[]>([]);

  return (
    <>
      {menuItems.map((item) => {
        const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const expandido = ativo || itensAbertos.includes(item.href);

        return (
          <div key={item.href}>
            {item.children && mobile ? (
              <button
                type="button"
                onClick={() =>
                  setItensAbertos((atuais) =>
                    atuais.includes(item.href)
                      ? atuais.filter((href) => href !== item.href)
                      : [...atuais, item.href]
                  )
                }
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  ativo
                    ? "border-[#ff7a3d] bg-[#ff7a3d] text-white shadow-lg shadow-[#ff7a3d]/20"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span className={`transition ${expandido ? "rotate-180" : ""}`}>v</span>
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={fechar}
                className={`block rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                  ativo
                    ? "border-[#ff7a3d] bg-[#ff7a3d] text-white shadow-lg shadow-[#ff7a3d]/20"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )}

            {item.children && expandido && (
              <div className="mt-2 grid gap-1 pl-4">
                {item.children.map((child) => {
                  const childAtivo = pathname === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={fechar}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                        childAtivo
                          ? "bg-white text-[#1f120d]"
                          : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function AdminPainelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { pizzaria } = useAdminPizzaria();

  const [menuAberto, setMenuAberto] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();
      const temSessao = Boolean(data.session);

      if (!ativo) return;

      if (!temSessao) {
        setAutorizado(false);
        setVerificandoSessao(false);
        router.replace("/admin/login");
        return;
      }

      setAutorizado(true);
      setVerificandoSessao(false);
    }

    void verificarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!ativo) return;

      if (!session) {
        setAutorizado(false);
        router.replace("/admin/login");
        return;
      }

      setAutorizado(true);
      setVerificandoSessao(false);
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
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
    router.replace("/admin/login");
  }

  if (verificandoSessao || !autorizado) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#2b1511_0%,#140f0d_48%,#0b0908_100%)] px-4 text-zinc-100">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-5 text-center shadow-2xl shadow-black/20">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-[#ff7a3d]" />
          <p className="mt-4 text-sm font-black">Verificando acesso...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2b1511_0%,#140f0d_48%,#0b0908_100%)] text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-80 flex-col border-r border-white/10 bg-white/[0.04] px-5 py-6 backdrop-blur lg:flex">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20">
            <MarcaLoja />
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-2">
            <MenuLinks pathname={pathname} fechar={() => setMenuAberto(false)} />
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
              <h1 className="truncate text-sm font-black text-zinc-100">
                {pizzaria?.nome ?? "Loja"}
              </h1>
              <p className="text-xs font-bold text-zinc-400">Painel de pizzaria</p>
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
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/20">
            <MarcaLoja />
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-2">
            <MenuLinks pathname={pathname} fechar={() => setMenuAberto(false)} mobile />
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
