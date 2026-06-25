"use client";

import { useCallback, useRef } from "react";
import { useModalClose } from "@/lib/useModalClose";

type ConfirmDialogProps = {
  aberto: boolean;
  titulo: string;
  descricao: string;
  confirmando?: boolean;
  textoCancelar?: string;
  textoConfirmar?: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  confirmando = false,
  textoCancelar = "Cancelar",
  textoConfirmar = "Excluir",
  onCancelar,
  onConfirmar,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fechar = useCallback(() => {
    if (!confirmando) {
      onCancelar();
    }
  }, [confirmando, onCancelar]);

  useModalClose(aberto, fechar, dialogRef);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
      <div
        ref={dialogRef}
        className="w-full rounded-t-[28px] border border-white/10 bg-[#140f0d] p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ffb26a]">
          Confirmação
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">{titulo}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{descricao}</p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={confirmando}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-100 disabled:opacity-60"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={confirmando}
            className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-black text-red-100 disabled:opacity-60"
          >
            {confirmando ? "Excluindo..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
