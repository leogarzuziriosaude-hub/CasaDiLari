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
  status_aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  tempo_entrega_texto?: string | null;
  permite_encomendas: boolean;
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
  status_aberto: true,
  tempo_entrega_min: 30,
  tempo_entrega_max: 45,
  tempo_entrega_texto: "30-45 min",
  permite_encomendas: true,
  mensagem_aviso: "Monte o cardapio pelo front.",
  imagem_url: null,
};

export function pizzariaConfigKey(pizzariaId = "front-pizzaria") {
  return `casadilari:config:${pizzariaId}`;
}

export function carregarConfigPizzariaLocal(): PizzariaAdmin {
  if (typeof window === "undefined") return pizzariaFrontOnly;

  try {
    const valor = window.localStorage.getItem(pizzariaConfigKey());
    return valor ? { ...pizzariaFrontOnly, ...JSON.parse(valor) } : pizzariaFrontOnly;
  } catch {
    return pizzariaFrontOnly;
  }
}

export function useAdminPizzaria() {
  const [usuario] = useState<UsuarioAdmin | null>(usuarioFrontOnly);
  const [pizzaria, setPizzaria] = useState<PizzariaAdmin | null>(pizzariaFrontOnly);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setPizzaria(carregarConfigPizzariaLocal());
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  return { usuario, pizzaria, erro: "", carregando: false };
}
