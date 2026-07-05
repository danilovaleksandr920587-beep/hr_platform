"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function InviteAcceptClient({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Принимаем приглашение...");
  const [companyName, setCompanyName] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/company-invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          error?: string;
          companyName?: string;
        };
        if (!res.ok) {
          setState("error");
          setMessage(data.error ?? "Не удалось принять приглашение.");
          return;
        }
        setState("ok");
        setCompanyName(data.companyName ?? "");
      } catch {
        setState("error");
        setMessage("Ошибка сети. Обновите страницу.");
      }
    })();
  }, [token]);

  if (state === "loading") {
    return <p className="hero-text">{message}</p>;
  }
  if (state === "error") {
    return (
      <div className="panel">
        <p style={{ margin: "0 0 10px", color: "#c0392b" }}>{message}</p>
        <Link className="text-link" href="/">
          На главную
        </Link>
      </div>
    );
  }
  return (
    <div className="panel">
      <p style={{ margin: "0 0 10px" }}>
        Вы в команде{companyName ? ` компании "${companyName}"` : ""}. Теперь вам доступны вакансии
        и отклики.
      </p>
      <Link className="btn-dark" href="/company" style={{ textDecoration: "none" }}>
        Перейти в кабинет компании
      </Link>
    </div>
  );
}
