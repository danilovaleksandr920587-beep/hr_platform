import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // Inline page CSS into HTML instead of render-blocking <link> tags (mobile perf).
  experimental: {
    inlineCss: true,
  },
  async redirects() {
    return [
      // Legacy HTML pages
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/vacancies.html", destination: "/vacancies", permanent: true },
      { source: "/jobs", destination: "/vacancies", permanent: true },
      { source: "/knowledge-base.html", destination: "/knowledge-base", permanent: true },
      { source: "/office.html", destination: "/office", permanent: true },
      { source: "/research.html", destination: "/research", permanent: true },
      // Article slug migrations (old kb-XX codes → transliterated slugs)
      { source: "/knowledge-base/kb-c1", destination: "/knowledge-base/soprovoditelnoe-pismo-k-rezyume-primery-i-shablony-dlya-lyuboj-situatsii", permanent: true },
      { source: "/knowledge-base/kb-i3", destination: "/knowledge-base/rasskazhite-o-sebe-na-sobesedovanii-struktura-otveta-i-3-gotovykh-skripta", permanent: true },
      { source: "/knowledge-base/kb-i4", destination: "/knowledge-base/voprosy-rabotodatelyu-na-sobesedovanii-20-rabochikh-voprosov-i-5-kotorye-luchshe", permanent: true },
      { source: "/knowledge-base/kb-r3", destination: "/knowledge-base/rezyume-bez-opyta-raboty-chto-pisat-chtoby-ne-vyglyadet-pustym-listom", permanent: true },
      { source: "/knowledge-base/kb-r4", destination: "/knowledge-base/rezyume-studenta-kak-opisat-proekty-i-praktiku-chtoby-rekruter-ne-zakryl-vkladku", permanent: true },
      { source: "/knowledge-base/kb-i5", destination: "/knowledge-base/kak-projti-sobesedovanie-na-rabotu-chek-list-do-vo-vremya-i-posle", permanent: true },
      { source: "/knowledge-base/kb-z3", destination: "/knowledge-base/zarplata-na-sobesedovanii-kak-nazvat-tsifru-i-ne-progadat", permanent: true },
      { source: "/knowledge-base/kb-i6", destination: "/knowledge-base/metod-star-na-sobesedovanii-kak-otvechat-na-povedencheskie-voprosy", permanent: true },
      { source: "/knowledge-base/kb-i7", destination: "/knowledge-base/10-glavnykh-voprosov-na-sobesedovanii-chto-sprashivayut-i-kak-otvechat", permanent: true },
      { source: "/knowledge-base/kb-t3", destination: "/knowledge-base/testovoe-zadanie-kak-vypolnit-oformit-i-ne-oblazhatsya", permanent: true },
      // Typo fix: perehodit → perekhodit
      { source: "/knowledge-base/junior-middle-kogda-perehodit-i-kak-uskorit-rost", destination: "/knowledge-base/junior-middle-kogda-perekhodit-i-kak-uskorit-rost", permanent: true },
      // Article slug renames (2026 SEO migrations)
      { source: "/knowledge-base/roadmap-backend", destination: "/knowledge-base/roadmap-backend-razrabotchika-2026-put-ot-novichka-do-junior", permanent: true },
      { source: "/knowledge-base/roadmap-frontend", destination: "/knowledge-base/roadmap-frontend-razrabotchika-2026-s-nulya-do-pervogo-offera", permanent: true },
      { source: "/knowledge-base/roadmap-qa", destination: "/knowledge-base/roadmap-qa-inzhenera-2026-ot-nulya-do-pervoj-raboty", permanent: true },
      { source: "/knowledge-base/roadmap-data-analyst", destination: "/knowledge-base/roadmap-data-analyst-2026-kak-vojti-v-analitiku-dannykh", permanent: true },
      { source: "/knowledge-base/nazvat-zarplatu", destination: "/knowledge-base/kak-nazvat-zhelaemuyu-zarplatu-na-sobesedovanii", permanent: true },
      { source: "/knowledge-base/istoriya-pervaya-rabota", destination: "/knowledge-base/istoriya-nashyol-pervuyu-rabotu-v-it-za-6-nedel", permanent: true },
      { source: "/knowledge-base/kak-popast-v-yandex", destination: "/knowledge-base/kak-popast-na-stazhirovku-v-yandeks-bez-profilnogo-obrazovaniya", permanent: true },
      { source: "/knowledge-base/stazhirovka-vs-rabota", destination: "/knowledge-base/stazhirovka-vs-pervaya-rabota-chto-vybrat-i-pochemu", permanent: true },
      { source: "/knowledge-base/stazhirovka-v-it-bez-opyta-realno-li", destination: "/knowledge-base/stazhirovka-v-it-bez-opyta-realno-li-i-kak-eto-sdelat", permanent: true },
      { source: "/knowledge-base/ucheba-i-stazhirovka", destination: "/knowledge-base/kak-sovmeshchat-stazhirovku-s-uchyoboj-sovety-ot-tekh-kto-proshyol", permanent: true },
      { source: "/knowledge-base/skolko-dlitsya-stazhirovka-sroki-i-realnost", destination: "/knowledge-base/skolko-dlitsya-stazhirovka-minimalnyj-srok-i-realnye-dannye", permanent: true },
      { source: "/knowledge-base/pet-proekt-dlya-portfolio-idei-i-sovety-dlya-nachinayushchikh", destination: "/knowledge-base/pet-project-dlya-portfolio-idei-i-sovety-dlya-nachinayushchikh", permanent: true },
      { source: "/knowledge-base/programma-yandeks-yang-kak-popast-i-chego-ozhidat", destination: "/knowledge-base/programma-yandeks-young-kak-popast-i-chego-ozhidat", permanent: true },
      { source: "/knowledge-base/github-rezyume", destination: "/knowledge-base/kak-oformit-github-dlya-rezyume-prakticheskij-gajd", permanent: true },
      { source: "/knowledge-base/kak-nayti-stazhirovku-poshagoviy-gid-dlya-studentov", destination: "/knowledge-base/kak-najti-stazhirovku-poshagovyj-gid-dlya-studentov", permanent: true },
    ];
  },
};

export default nextConfig;
