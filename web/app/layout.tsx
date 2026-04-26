import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/careerlab-ui.css";
import "../styles/cl-topbar.css";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";
import { SiteHeader } from "@/components/SiteHeader";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-golos",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "CareerLab — стажировки и первая работа",
    template: "%s — CareerLab",
  },
  description:
    "Стажировки, junior-вакансии и практические гайды по резюме и собеседованиям для студентов и выпускников.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "CareerLab",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${golos.variable} ${unbounded.variable}`}
    >
      <head>
        <Script id="yandex-metrika" strategy="beforeInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) { return; }
              }
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=108774421', 'ym');

            ym(108774421, 'init', {
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
      </head>
      <body className={`${golos.className} careerlab-site`}>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108774421"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <SiteHeader />
        {children}
        <CookieBanner />
        <SpeedInsights />
      </body>
    </html>
  );
}
