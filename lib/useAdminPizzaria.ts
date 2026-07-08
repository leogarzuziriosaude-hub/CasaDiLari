"use client";

import { useEffect, useState } from "react";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  perfil: string;
  pizzaria_id: string;
};

export type PizzariaAdmin = {
  id: string;
  nome: string;
  slug: string;
  whatsapp: string;
  endereco?: string | null;
  status_aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  tempo_entrega_texto?: string | null;
  permite_encomendas: boolean;
  encomenda_hora_inicio?: string | null;
  encomenda_hora_fim?: string | null;
  mensagem_aviso: string | null;
  imagem_url?: string | null;
};

const usuarioFrontOnly: UsuarioAdmin = {
  id: "front-admin",
  nome: "Administrador",
  perfil: "admin",
  pizzaria_id: "front-pizzaria",
};

const pizzariaFrontOnly: PizzariaAdmin = {
  id: "front-pizzaria",
  nome: "Casa Di Lari",
  slug: "casadilari",
  whatsapp: "",
  endereco: "",
  status_aberto: true,
  tempo_entrega_min: 30,
  tempo_entrega_max: 45,
  tempo_entrega_texto: "30-45 min",
  permite_encomendas: true,
  encomenda_hora_inicio: "18:00",
  encomenda_hora_fim: "20:00",
  mensagem_aviso: "Escolha seus sabores e faca seu pedido.",
  imagem_url: null,
};

export function pizzariaConfigKey(pizzariaId = "front-pizzaria") {
  return `casadilari:config:${pizzariaId}`;
}

export function carregarConfigPizzariaLocal(): PizzariaAdmin {
  if (typeof window === "undefined") return pizzariaFrontOnly;

  try {
    const valor = window.localStorage.getItem(pizzariaConfigKey());
    const config = valor ? { ...pizzariaFrontOnly, ...JSON.parse(valor) } : pizzariaFrontOnly;

    if (config.mensagem_aviso === "Monte o cardapio pelo front.") {
      return {
        ...config,
        mensagem_aviso: pizzariaFrontOnly.mensagem_aviso,
      };
    }

    return config;
  } catch {
    return pizzariaFrontOnly;
  }
}

export function useAdminPizzaria() {
  const [usuario] = useState<UsuarioAdmin | null>(usuarioFrontOnly);
  const [pizzaria, setPizzaria] = useState<PizzariaAdmin | null>(pizzariaFrontOnly);

  useEffect(() => {
    function atualizarConfig() {
      setPizzaria(carregarConfigPizzariaLocal());
    }

    const timerId = window.setTimeout(atualizarConfig, 0);

    window.addEventListener("focus", atualizarConfig);
    window.addEventListener("storage", atualizarConfig);
    window.addEventListener("casadilari:config-updated", atualizarConfig);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("focus", atualizarConfig);
      window.removeEventListener("storage", atualizarConfig);
      window.removeEventListener("casadilari:config-updated", atualizarConfig);
    };
  }, []);

  return { usuario, pizzaria, erro: "", carregando: false };
}
