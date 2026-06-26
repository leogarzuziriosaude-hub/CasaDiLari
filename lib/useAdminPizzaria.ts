"use client";

import { useState } from "react";

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
  permite_encomendas: boolean;
  mensagem_aviso: string | null;
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
  permite_encomendas: true,
  mensagem_aviso: "Monte o cardapio pelo front.",
};

export function useAdminPizzaria() {
  const [usuario] = useState<UsuarioAdmin | null>(usuarioFrontOnly);
  const [pizzaria] = useState<PizzariaAdmin | null>(pizzariaFrontOnly);

  return { usuario, pizzaria, erro: "", carregando: false };
}
