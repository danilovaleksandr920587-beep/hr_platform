"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_EVENT } from "@/lib/client/cookie-consent";

const METRIKA_ID = 108774421;

/**
 * Грузит Яндекс.Метрику только после явного согласия на cookie (B-8).
 * До этого - и при выборе "Отклонить" - счётчик не подключается.
 * Слушает событие от CookieBanner, чтобы включиться сразу после клика.
 */
export function YandexMetrika() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        if (localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted") setConsented(true);
      } catch {
        /* localStorage недоступен - метрику не грузим */
      }
    };
    check();
    window.addEventListener(COOKIE_CONSENT_EVENT, check);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, check);
  }, []);

  if (!consented) return null;

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
