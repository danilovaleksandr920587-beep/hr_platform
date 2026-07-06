import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/careerlab-ui.css";
import "../styles/cl-topbar.css";
import "../styles/company-portal.css";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";
import { YandexMetrika } from "@/components/YandexMetrika";
import { SiteHeader } from "@/components/SiteHeader";
import { TgStickyBar } from "@/components/TgStickyBar";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  variable: "--font-golos",
  display: "swap",
  // Body font: with display:swap the fallback paints instantly, so there is no
  // need to occupy the critical path with a font preload — leave the preloaded
  // bandwidth for CSS and the Unbounded heading font (the LCP element).
  preload: false,
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "900"],
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
  twitter: {
    card: "summary_large_image",
    site: "@careerlab_ru",
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
      <body className={`${golos.className} careerlab-site`}>
        <YandexMetrika />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "CareerLab",
                url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lab-career.ru",
                logo: {
                  "@type": "ImageObject",
                  url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lab-career.ru"}/icon.png`,
                  width: 512,
                  height: 512,
                },
                sameAs: [],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "CareerLab",
                url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lab-career.ru",
                description: "Стажировки, junior-вакансии и практические гайды по резюме и собеседованиям для студентов и выпускников.",
                inLanguage: "ru-RU",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://lab-career.ru"}/vacancies?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
        <SiteHeader />
        {children}
        <CookieBanner />
        <TgStickyBar />
        <SpeedInsights />
      </body>
    </html>
  );
}
