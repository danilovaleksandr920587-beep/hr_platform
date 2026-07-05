// Проверяет, что docs/PAGES.md и docs/API.md соответствуют реальным роутам в app/.
// Запуск: npm run docs:check
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const APP = "app";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name === "page.tsx" || entry.name === "route.ts") acc.push(p);
  }
  return acc;
}

function toUrl(file) {
  const path = file
    .replace(/^app\//, "")
    .replace(/(^|\/)(page\.tsx|route\.ts)$/, "")
    .replace(/\(.+?\)\//g, "")
    .replace(/\/$/, "");
  return "/" + path;
}

const routes = walk(APP).map((f) => ({ file: f, url: toUrl(f) }));
const docs =
  readFileSync("docs/PAGES.md", "utf8") + readFileSync("docs/API.md", "utf8");

const missing = routes.filter((r) => !docs.includes("`" + r.url + "`"));

// Обратная проверка: задокументированные URL, которых больше нет в app/
const documented = [...docs.matchAll(/^\| `(\/[^`]*)`/gm)].map((m) => m[1]);
const urls = new Set(routes.map((r) => r.url));
const stale = documented.filter((u) => !urls.has(u));

if (missing.length) {
  console.log("НЕ ЗАДОКУМЕНТИРОВАНЫ (добавь в docs/PAGES.md или docs/API.md):");
  for (const r of missing) console.log(`  ${r.url}  <- ${r.file}`);
}
if (stale.length) {
  console.log("УСТАРЕЛИ В ДОКАХ (роута больше нет):");
  for (const u of stale) console.log(`  ${u}`);
}
if (!missing.length && !stale.length) console.log("OK: docs/ соответствуют app/");
process.exit(missing.length || stale.length ? 1 : 0);
