/**
 * Инфографика кабинета вуза. Чистые SVG server-компоненты (без клиентского JS):
 * рендерятся на сервере, легковесны, одинаково выглядят в живом /vuz и в
 * демо /vuz-demo. Палитра - лаймовая дизайн-система CareerLab.
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
        {typeof value === "number" ? fmt(value) : value}
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

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, rOuter, end);
  const [x2, y2] = polar(cx, cy, rOuter, start);
  const [x3, y3] = polar(cx, cy, rInner, start);
  const [x4, y4] = polar(cx, cy, rInner, end);
  const large = end - start <= 180 ? 0 : 1;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

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
  let angle = 0;
  const arcs = segments.map((seg, i) => {
    const sweep = (seg.value / total) * 360;
    const path = arcPath(cx, cy, 82, 52, angle, angle + Math.max(sweep, 0.5));
    angle += sweep;
    return { path, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], ...seg };
  });
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Распределение по курсам">
        {arcs.map((a) => (
          <path key={a.label} d={a.path} fill={a.color} />
        ))}
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
        {arcs.map((a) => (
          <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: a.color, flexShrink: 0 }} />
            <span style={{ color: C.ink }}>{a.label}</span>
            <strong style={{ marginLeft: "auto", color: C.dark }}>{fmt(a.value)}</strong>
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
