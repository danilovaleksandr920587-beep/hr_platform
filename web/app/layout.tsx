import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
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
      <body className={`${golos.className} careerlab-site`}>
        <SiteHeader />
        {children}
        <CookieBanner />
        <SpeedInsights />
      </body>
    </html>
  );
}
