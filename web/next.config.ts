import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async redirects() {
    return [
      // Legacy HTML pages
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/vacancies.html", destination: "/vacancies", permanent: true },
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
    ];
  },
};

export default nextConfig;
