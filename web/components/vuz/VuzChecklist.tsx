import Link from "next/link";

export type ChecklistItem = {
  label: string;
  done: boolean;
  href: string;
  cta: string;
  hint?: string;
};

/**
 * Онбординг-чеклист кабинета вуза: активационная петля для ЦКС. Показывает
 * готовность кабинета (N из M) и следующий шаг. Состояние вычисляется на
 * сервере из реальных данных (витрина, команда, студенты) - не хранится.
 */
export function VuzChecklist({
  items,
  title = "Активация кабинета",
}: {
  items: ChecklistItem[];
  title?: string;
}) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="panel" style={{ background: "linear-gradient(160deg,#fbffe9,#ffffff 60%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <p className="co-about-label" style={{ margin: 0 }}>{title}</p>
        <span style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 14, fontWeight: 700, color: "#1e2114" }}>
          {done} из {items.length}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: "#eef0e9", overflow: "hidden", margin: "10px 0 16px" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 6, background: "linear-gradient(90deg,#a8d63a,#c9f135)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((it, i) => (
          <div
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,.06)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                background: it.done ? "#c9f135" : "transparent",
                border: it.done ? "none" : "2px solid #cfd3c4",
                color: "#1e2114",
              }}
            >
              {it.done ? "✓" : ""}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: it.done ? "#7c806e" : "#1e2114" }}>
                {it.label}
              </p>
              {it.hint ? (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#7c806e" }}>{it.hint}</p>
              ) : null}
            </div>
            {!it.done ? (
              /^(mailto:|https?:)/.test(it.href) ? (
                <a
                  href={it.href}
                  className="btn-dark"
                  style={{ flexShrink: 0, padding: "8px 14px", fontSize: 13 }}
                >
                  {it.cta}
                </a>
              ) : (
                <Link
                  href={it.href}
                  className="btn-dark"
                  style={{ flexShrink: 0, padding: "8px 14px", fontSize: 13 }}
                >
                  {it.cta}
                </Link>
              )
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
