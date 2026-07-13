"use client";

import { useState } from "react";

/**
 * Логотип компании. Если logo_url нет или картинка не загрузилась -
 * не рендерим ничего: пустые рамки и буквы-заглушки выглядят хуже,
 * чем отсутствие логотипа.
 */
export function CompanyLogo({
  src,
  name,
  size = 40,
  radius = 10,
  className,
  eager = false,
}: {
  src?: string | null;
  name: string;
  size?: number;
  radius?: number;
  className?: string;
  /** Логотип над сгибом (герой профиля) - грузим сразу, иначе на мобилке
   *  ленивая загрузка даёт вспышку пустой белой плашки до отрисовки. */
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`co-logo${className ? ` ${className}` : ""}`}
      src={src}
      alt={name}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "sync" : "async"}
      style={{ width: size, height: size, borderRadius: radius }}
      onError={() => setBroken(true)}
    />
  );
}
