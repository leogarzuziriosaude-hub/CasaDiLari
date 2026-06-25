"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export function useAdminPizzaria() {
  const [usuario, setUsuario] = useState<UsuarioAdmin | null>(null);
  const [pizzaria, setPizzaria] = useState<PizzariaAdmin | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setCarregando(false);
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, nome, perfil, pizzaria_id")
        .eq("id", session.user.id)
        .single();

      if (usuarioError || !usuarioData) {
        setErro("Usuário não vinculado a nenhuma pizzaria.");
        setCarregando(false);
        return;
      }

      setUsuario(usuarioData);

      const { data: pizzariaData, error: pizzariaError } = await supabase
        .from("pizzarias")
        .select(
          "id, nome, slug, whatsapp, status_aberto, tempo_entrega_min, tempo_entrega_max, permite_encomendas, mensagem_aviso"
        )
        .eq("id", usuarioData.pizzaria_id)
        .single();

      if (pizzariaError || !pizzariaData) {
        setErro("Não foi possível carregar os dados da pizzaria.");
        setCarregando(false);
        return;
      }

      setPizzaria(pizzariaData);
      setCarregando(false);
    }

    carregarDados();
  }, []);

  return { usuario, pizzaria, erro, carregando };
}
