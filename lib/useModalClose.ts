"use client";

import { RefObject, useEffect } from "react";

export function useModalClose<T extends HTMLElement>(
  aberto: boolean,
  onClose: () => void,
  contentRef: RefObject<T | null>
) {
  useEffect(() => {
    if (!aberto) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handleMouseDown(event: MouseEvent) {
      if (
        contentRef.current &&
        event.target instanceof Node &&
        !contentRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [aberto, contentRef, onClose]);
}
