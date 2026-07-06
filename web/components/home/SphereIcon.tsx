// Линейные SVG-иконки сфер для бенто-сетки главной. Заменяют системные
// эмодзи, которые выбивались из айдентики. Цвет наследуется через
// currentColor - на тёмных карточках лайм, на featured-карточке тёмный.

const PATHS: Record<string, React.ReactNode> = {
  it: (
    <>
      <polyline points="7 8 3 12 7 16" />
      <polyline points="17 8 21 12 17 16" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </>
  ),
  analytics: (
    <>
      <line x1="4" y1="20" x2="4" y2="11" />
      <line x1="10" y1="20" x2="10" y2="4" />
      <line x1="16" y1="20" x2="16" y2="14" />
      <line x1="21" y1="20" x2="3" y2="20" />
    </>
  ),
  finance: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21v-11" />
      <path d="M19 21v-11" />
      <path d="M4 10l8-6 8 6" />
      <path d="M9 21v-4h6v4" />
    </>
  ),
  marketing: (
    <>
      <path d="M18 8a3 3 0 0 1 0 6" />
      <path d="M10 8v11a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-5" />
      <path d="M12 8h0l4.5-3.8a.9.9 0 0 1 1.5.7v12.2a.9.9 0 0 1-1.5.7L12 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h8" />
    </>
  ),
  design: (
    <>
      <path d="M3 21v-4a4 4 0 1 1 4 4h-4" />
      <path d="M21 3a16 16 0 0 0-12.8 10.2" />
      <path d="M21 3a16 16 0 0 1-10.2 12.8" />
      <path d="M10.6 9a9 9 0 0 1 4.4 4.4" />
    </>
  ),
  product: (
    <>
      <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3" />
      <line x1="12" y1="12" x2="20" y2="7.5" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <line x1="12" y1="12" x2="4" y2="7.5" />
    </>
  ),
  devops: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <line x1="7" y1="7.5" x2="7" y2="7.51" />
      <line x1="7" y1="16.5" x2="7" y2="16.51" />
    </>
  ),
  hr: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M16 3.9a3 3 0 0 1 0 6.2" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.9" />
    </>
  ),
  sales: (
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </>
  ),
  support: (
    <>
      <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="2" />
      <rect x="17" y="14" width="4" height="6" rx="2" />
    </>
  ),
  operations: (
    <>
      <circle cx="6" cy="7" r="2" />
      <line x1="6" y1="9" x2="6" y2="20" />
      <line x1="6" y1="4" x2="6" y2="5" />
      <circle cx="12" cy="16" r="2" />
      <line x1="12" y1="4" x2="12" y2="14" />
      <line x1="12" y1="18" x2="12" y2="20" />
      <circle cx="18" cy="9" r="2" />
      <line x1="18" y1="4" x2="18" y2="7" />
      <line x1="18" y1="11" x2="18" y2="20" />
    </>
  ),
  security: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
    </>
  ),
  legal: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M9 21h6" />
      <path d="M4 7h16" />
      <path d="M7 7l-3 6a3 3 0 0 0 6 0z" />
      <path d="M17 7l-3 6a3 3 0 0 0 6 0z" />
    </>
  ),
};

const FALLBACK = (
  <>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>
);

export function SphereIcon({ sphere }: { sphere: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[sphere] ?? FALLBACK}
    </svg>
  );
}
