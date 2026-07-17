/**
 * Аватар вуза для витрины. Есть логотип - показываем его; нет (обычный
 * случай для вузов) - лаймовая плитка с монограммой (короткая аббревиатура
 * или первые буквы). В отличие от CompanyLogo не оставляет пустое место.
 */
function monogram(name: string): string {
  const clean = name.replace(/["'«»]/g, "").trim();
  // Короткая аббревиатура целиком (ИТМО, УрФУ, МГУ), иначе первые 2 буквы.
  if (clean.length <= 4) return clean.toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function VuzMonogram({
  src,
  name,
  size = 56,
  radius = 14,
  eager = false,
}: {
  src?: string | null;
  name: string;
  size?: number;
  radius?: number;
  eager?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="vuz-mono"
      aria-hidden
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.34) }}
    >
      {monogram(name)}
    </div>
  );
}
