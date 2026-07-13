"use client";

import { useEffect, useState } from "react";
import {
  carregarConfiguracaoLoja,
  configuracaoPadrao,
  type ConfiguracaoLoja,
} from "@/lib/casadilariSupabase";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  perfil: string;
  pizzaria_id: string;
};

export type PizzariaAdmin = ConfiguracaoLoja;

const usuarioFrontOnly: UsuarioAdmin = {
  id: "admin",
  nome: "Administrador",
  perfil: "admin",
  pizzaria_id: configuracaoPadrao.id,
};

export function pizzariaConfigKey(pizzariaId = configuracaoPadrao.id) {
  return `casadilari:config:${pizzariaId}`;
}

export function carregarConfigPizzariaLocal(): PizzariaAdmin {
  return configuracaoPadrao;
}

export function useAdminPizzaria() {
  const [usuario] = useState<UsuarioAdmin | null>(usuarioFrontOnly);
  const [pizzaria, setPizzaria] = useState<PizzariaAdmin | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const config = await carregarConfiguracaoLoja();
        if (!ativo) return;

        setPizzaria(config);
        setErro("");
      } catch {
        if (!ativo) return;

        setPizzaria(configuracaoPadrao);
        setErro("Não foi possível carregar as configurações da loja.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    function atualizarConfig() {
      void carregar();
    }

    window.addEventListener("focus", atualizarConfig);
    window.addEventListener("casadilari:config-updated", atualizarConfig);

    return () => {
      ativo = false;
      window.removeEventListener("focus", atualizarConfig);
      window.removeEventListener("casadilari:config-updated", atualizarConfig);
    };
  }, []);

  return { usuario, pizzaria, erro, carregando };
}
