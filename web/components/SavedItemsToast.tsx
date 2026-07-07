"use client";

import { useEffect, useState } from "react";
import {
  SAVED_ITEMS_ERROR,
  type SavedItemsErrorDetail,
} from "@/lib/client/saved-items";

type Toast = { id: number; text: string };

/**
 * Показывает уведомление, когда запись сохранёнки в БД не прошла и UI откатан
 * (B-3). Слушает `SAVED_ITEMS_ERROR` из lib/client/saved-items.ts. Смонтирован
 * один раз в корневом layout - покрывает все карточки/страницы сразу.
 */
export function SavedItemsToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let counter = 0;
    function onError(e: Event) {
      const detail = (e as CustomEvent<SavedItemsErrorDetail>).detail;
      const noun = detail?.kind === "article" ? "статью" : "вакансию";
      const text = detail?.shouldSave
        ? `Не удалось сохранить ${noun}. Проверьте соединение и попробуйте снова.`
        : `Не удалось убрать ${noun} из сохранённого. Проверьте соединение.`;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, text }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
    window.addEventListener(SAVED_ITEMS_ERROR, onError);
    return () => window.removeEventListener(SAVED_ITEMS_ERROR, onError);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="saved-toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="saved-toast">
          <span className="saved-toast-icon" aria-hidden="true">
            ⚠
          </span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
