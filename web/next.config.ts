import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      {
        source: "/vacancies.html",
        destination: "/vacancies",
        permanent: true,
      },
      {
        source: "/knowledge-base.html",
        destination: "/knowledge-base",
        permanent: true,
      },
      { source: "/office.html", destination: "/office", permanent: true },
      {
        source: "/research.html",
        destination: "/research",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
