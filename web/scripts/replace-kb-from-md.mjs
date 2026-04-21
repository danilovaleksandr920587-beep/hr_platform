#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SOURCE_DIR =
  "/Users/user/Library/Application Support/Claude/local-agent-mode-sessions/c2ba9022-b305-42f0-9871-0b1385dc8873/543a70ce-94c5-400c-a9f8-8dbe81f5b36b/local_10c23ec4-d9ea-46c1-8fe8-b0e19d6dd2eb/outputs";

const files = [
  "article-1-cover-letter.md",
  "article-2-tell-about-yourself.md",
  "article-3-questions-for-employer.md",
  "article-4-resume-no-experience.md",
  "article-5-student-resume.md",
  "article-6-first-interview.md",
  "article-7-salary-negotiation.md",
  "article-8-star-method.md",
  "article-9-interview-questions-answers.md",
  "article-10-test-assignment.md",
];

const catSlugMap = {
  "Резюме": "resume",
  "Собеседование": "interview",
  "Тестовые": "test",
  "Зарплата": "salary",
  "Отклики": "apply",
  "Карьера и рост": "career",
};

function parseFrontmatter(source, fileName) {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`No frontmatter in ${fileName}`);
  const yaml = m[1];
  const body = source.slice(m[0].length).trim();
  const data = {};
  for (const line of yaml.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body };
}

function normalizeCategory(category) {
  if (category === "Отклики") return "Отклики";
  return category;
}

async function main() {
  const sourceDir = process.argv[2] || DEFAULT_SOURCE_DIR;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const rows = files.map((fileName, idx) => {
    const fullPath = path.join(sourceDir, fileName);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    const raw = fs.readFileSync(fullPath, "utf8");
    const { data, body } = parseFrontmatter(raw, fileName);
    const category = normalizeCategory(data.category);
    const cat_slug = catSlugMap[category];
    if (!cat_slug) {
      throw new Error(`Unsupported category "${String(category)}" in ${fileName}`);
    }

    return {
      slug: String(data.slug).trim(),
      title: String(data.title).trim(),
      category,
      level: String(data.level || "Новичок").trim(),
      read_time: Number(data.read_time || 8),
      excerpt: String(data.excerpt || "").trim(),
      body,
      is_new: idx < 3,
      cat_slug,
      layout: null,
      is_published: true,
    };
  });

  const { error: delErr } = await supabase
    .from("articles")
    .delete()
    .neq("slug", "__never__");
  if (delErr) throw delErr;

  const { error: insertErr } = await supabase.from("articles").insert(rows);
  if (insertErr) throw insertErr;

  console.log(`Replaced knowledge base with ${rows.length} articles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
