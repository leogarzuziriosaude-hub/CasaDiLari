"use client";

import { useCallback, useRef } from "react";
import { useModalClose } from "@/lib/useModalClose";

type FeedbackDialogProps = {
  aberto: boolean;
  titulo: string;
  descricao: string;
  onFechar: () => void;
};

export function FeedbackDialog({ aberto, titulo, descricao, onFechar }: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fechar = useCallback(() => onFechar(), [onFechar]);

  useModalClose(aberto, fechar, dialogRef);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
      <div
        ref={dialogRef}
        className="w-full rounded-t-[28px] border border-red-500/20 bg-[#140f0d] p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]"
      >
        <p className="text-sm font-black uppercase tracking-[0.22em] text-red-200">
          Atenção
        </p>
        <h2 className="mt-3 text-2xl font-black text-white">{titulo}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{descricao}</p>

        <button
          type="button"
          onClick={onFechar}
          className="mt-6 w-full rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white transition hover:bg-[#ff6a26]"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
