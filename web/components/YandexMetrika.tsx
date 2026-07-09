"use client";

import Script from "next/script";

const METRIKA_ID = 108774421;

/**
 * Яндекс.Метрика. Грузится сразу для всех посетителей: счётчик и
 * поведенческие факторы не должны зависеть от клика по cookie-баннеру.
 * Баннер информационный (см. CookieBanner) - согласие подразумевается
 * продолжением использования сайта, как принято в рунете.
 */
export function YandexMetrika() {
  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`
        (function(m,e,t,r,i,k,a){
          m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {
            if (document.scripts[j].src === r) { return; }
          }
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}', 'ym');

        ym(${METRIKA_ID}, 'init', {
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: 'dataLayer',
          referrer: document.referrer,
          url: location.href,
          accurateTrackBounce: true,
          trackLinks: true
        });
      `}
    </Script>
  );
}
