import { CountUp } from "./CountUp";

/**
 * Инфографика кабинета вуза. В основном чистый SVG (рендер на сервере,
 * легковесно, одинаково в живом /vuz и демо /vuz-demo). Единственный
 * клиентский островок - CountUp в KPI (анимация числа). Палитра - лаймовая
 * дизайн-система CareerLab.
 */

const C = {
  lime: "#c9f135",
  limeSoft: "#e4fa9a",
  dark: "#1e2114",
  ink: "#2c3020",
  track: "#eef0e9",
  muted: "#7c806e",
  grid: "#e7e9df",
};

/** Палитра сегментов для доната/легенд (лайм -> тёмный). */
const SEGMENT_COLORS = [
  "#c9f135",
  "#a8d63a",
  "#7fb62e",
  "#5a8f3f",
  "#3d6b45",
  "#294b32",
];

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

// ── KPI-карточка с крупным числом, дельтой и мини-спарклайном ────────────────

export function KpiCard({
  label,
  value,
  sub,
  spark,
  accent = true,
}: {
  label: string;
  value: number | string;
  sub?: string;
  spark?: number[];
  accent?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${C.track}`,
        background: accent
          ? "linear-gradient(160deg, #fbffe9 0%, #ffffff 55%)"
          : "#fff",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 128,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: C.muted }}>
        {label}
      </span>
      <span style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 32, fontWeight: 800, color: C.dark, lineHeight: 1 }}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </span>
      {sub ? <span style={{ fontSize: 12, color: C.muted }}>{sub}</span> : null}
      {spark && spark.length > 1 ? (
        <Sparkline points={spark} />
      ) : null}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 120;
  const h = 30;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / span) * (h - 4) - 2]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: "auto", alignSelf: "flex-end" }} aria-hidden>
      <path d={area} fill={C.limeSoft} opacity={0.5} />
      <path d={line} fill="none" stroke={C.lime} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Воронка с конверсией между шагами ────────────────────────────────────────

export function FunnelChart({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map((s, i) => {
        const width = Math.max((s.value / max) * 100, s.value > 0 ? 6 : 1.5);
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        const shade = SEGMENT_COLORS[Math.min(i, SEGMENT_COLORS.length - 1)];
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: C.ink }}>{s.label}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                {conv !== null ? (
                  <span style={{ fontSize: 11, color: C.muted }}>{conv}%</span>
                ) : null}
                <strong style={{ fontFamily: '"Unbounded", sans-serif', color: C.dark }}>{fmt(s.value)}</strong>
              </span>
            </div>
            <div style={{ height: 26, borderRadius: 8, background: C.track, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${width}%`,
                  borderRadius: 8,
                  background: `linear-gradient(90deg, ${shade}, ${shade}cc)`,
                  transition: "width .4s",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Донат-распределение (по курсам) с легендой ───────────────────────────────
// stroke-dasharray на кольце: корректно рисует и один сегмент на 100%, и много.

export function DonutChart({
  segments,
  centerLabel,
}: {
  segments: { label: string; value: number }[];
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;
  const thickness = 26;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  const rings = segments.map((seg, i) => {
    const len = (seg.value / total) * circ;
    const ring = { len, offset: cum, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], ...seg };
    cum += len;
    return ring;
  });
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Распределение по курсам">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={thickness} />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {rings.map((rg) => (
            <circle
              key={rg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={rg.color}
              strokeWidth={thickness}
              strokeDasharray={`${rg.len.toFixed(2)} ${circ.toFixed(2)}`}
              strokeDashoffset={(-rg.offset).toFixed(2)}
            />
          ))}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 26, fontWeight: 800, fill: C.dark }}>
          {fmt(total)}
        </text>
        {centerLabel ? (
          <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: C.muted }}>
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 120 }}>
        {rings.map((rg) => (
          <div key={rg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: rg.color, flexShrink: 0 }} />
            <span style={{ color: C.ink }}>{rg.label}</span>
            <strong style={{ marginLeft: "auto", color: C.dark }}>{fmt(rg.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Тренд по неделям (две серии: активность area + новые студенты line) ───────

export function TrendChart({
  labels,
  series,
}: {
  labels: string[];
  series: { name: string; color: string; points: number[]; fill?: boolean }[];
}) {
  const w = 660;
  const h = 220;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const allVals = series.flatMap((s) => s.points);
  const max = Math.max(...allVals, 1);
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + innerH - f * innerH);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Динамика по неделям" style={{ minWidth: 480 }}>
        <defs>
          <linearGradient id="vuz-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.lime} stopOpacity="0.45" />
            <stop offset="100%" stopColor={C.lime} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines.map((gy, i) => (
          <line key={i} x1={padL} y1={gy} x2={w - padR} y2={gy} stroke={C.grid} strokeWidth={1} />
        ))}
        {series.map((s) => {
          const line = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p).toFixed(1)}`)
            .join(" ");
          const area = `${line} L${x(s.points.length - 1).toFixed(1)} ${padT + innerH} L${x(0).toFixed(1)} ${padT + innerH} Z`;
          return (
            <g key={s.name}>
              {s.fill ? <path d={area} fill="url(#vuz-area)" /> : null}
              <path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {s.points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p)} r={3} fill="#fff" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {labels.map((lab, i) => (
          <text key={i} x={x(i)} y={h - 8} textAnchor="middle" style={{ fontSize: 10, fill: C.muted }}>
            {lab}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Бенчмарк: вуз против среднего по платформе ───────────────────────────────
// Обезличенное сравнение - главная продающая метрика (дизайн-док §4.1).

export type BenchmarkItem = {
  label: string;
  vuzValue: number;
  platformValue: number;
  deltaPct: number;
  suffix?: string;
};

export function BenchmarkBars({ items }: { items: BenchmarkItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {items.map((it) => {
        const max = Math.max(it.vuzValue, it.platformValue, 0.001);
        const vuzW = Math.max((it.vuzValue / max) * 100, 4);
        const platW = Math.max((it.platformValue / max) * 100, 4);
        const up = it.deltaPct > 0;
        const flat = it.deltaPct === 0;
        const pill = flat
          ? { bg: "#eef0e9", fg: "#5c604e", text: "на уровне среднего" }
          : up
            ? { bg: "#e4fa9a", fg: "#3d6b45", text: `+${it.deltaPct}% к среднему` }
            : { bg: "#fdecea", fg: "#9a3b31", text: `${it.deltaPct}% к среднему` };
        const fmtVal = (v: number) =>
          `${Number.isInteger(v) ? v : v.toFixed(1)}${it.suffix ?? ""}`;
        return (
          <div key={it.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#2c3020", fontWeight: 600 }}>{it.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: pill.bg, color: pill.fg, whiteSpace: "nowrap" }}>
                {pill.text}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#7c806e", width: 92, flexShrink: 0 }}>Ваш вуз</span>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: "#f4f5ef", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${vuzW}%`, borderRadius: 8, background: "linear-gradient(90deg,#a8d63a,#c9f135)" }} />
              </div>
              <span style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 13, fontWeight: 700, color: "#1e2114", width: 52, textAlign: "right" }}>
                {fmtVal(it.vuzValue)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#7c806e", width: 92, flexShrink: 0 }}>Среднее</span>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: "#f4f5ef", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${platW}%`, borderRadius: 8, background: "#cfd3c4" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#7c806e", width: 52, textAlign: "right" }}>
                {fmtVal(it.platformValue)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
