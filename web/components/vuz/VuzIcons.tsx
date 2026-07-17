/**
 * Набор линейных SVG-иконок для витрины вуза. stroke=currentColor -
 * цвет задаётся через CSS родителя. Единый стиль: 24x24, толщина 1.8,
 * скруглённые концы.
 */
type IconProps = { className?: string; size?: number };

function base(size = 24, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function IconInternship({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12.5h18" />
      <path d="M12 12v1.5" />
    </svg>
  );
}

export function IconResume({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 14.5l2 2 4-4.5" />
    </svg>
  );
}

export function IconKnowledge({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v4.5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5V12" />
      <path d="M22 10v5" />
    </svg>
  );
}

export function IconSalary({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="3 16.5 9 10.5 13 14.5 21 6.5" />
      <polyline points="15 6.5 21 6.5 21 12.5" />
    </svg>
  );
}

export function IconArrow({ className, size }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 12h13" />
      <path d="M12.5 6l6 6-6 6" />
    </svg>
  );
}
