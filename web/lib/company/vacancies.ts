import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { transliterate } from "@/lib/transliterate";
import { vacancyShapes } from "@/lib/data/vacancy-schema";
import type { CompanyRow } from "./store";
import type { CompanyVacancyStatus } from "./constants";

/**
 * Вакансии компаний живут в контентной таблице vacancies (Supabase).
 * Все записи - через service role; anon видит только is_published = true.
 *
 * Схема vacancies бывает двух форм (см. lib/data/vacancy-schema.ts):
 *   root (прод): employment_type, is_featured, search_vector
 *   web:         type, featured, search_document
 * Колонки для записи/чтения выбираем по первой форме из vacancyShapes().
 *
 * Инварианты статусов:
 *   draft / pending_review / rejected -> is_published = false
 *   published                         -> is_published = true,  is_archived = false
 *   archived                          -> is_published = true,  is_archived = true
 *     (страница живёт для SEO как у парсерных архивных, из листинга скрыта)
 */

function vacShape(): "root" | "web" {
  return vacancyShapes()[0];
}

/** Имя колонки типа занятости в текущей схеме. */
function typeColumn(): string {
  return vacShape() === "web" ? "type" : "employment_type";
}

/**
 * SELECT для карточки вакансии компании. На root-схеме тип отдаём под
 * алиасом type:employment_type, чтобы наверху всегда было поле `type`.
 */
function companyVacancySelect(): string {
  const typeSel = vacShape() === "web" ? "type" : "type:employment_type";
  return `id,slug,title,company,description,sphere,exp,format,${typeSel},salary_min,salary_max,city,skills,apply_mode,apply_url,status,status_reason,is_published,is_archived,published_at,company_id`;
}

/** Поле поиска: web-схема хранит текст в search_document; на root оставляем null
 *  (search_vector - tsvector без триггера; поиск на root идёт по description). */
function searchPatch(text: string): Record<string, unknown> {
  return vacShape() === "web" ? { search_document: text.slice(0, 8000) } : {};
}

const SPHERES = [
  "it", "design", "marketing", "analytics", "product", "sales", "support",
  "hr", "finance", "operations", "security", "devops", "legal",
] as const;
const EXPS = ["none", "lt1", "1-3", "gte3"] as const;
const FORMATS = ["remote", "hybrid", "office"] as const;
const TYPES = ["internship", "project", "parttime"] as const;

export type CompanyVacancyInput = {
  title: string;
  description: string;
  sphere: string;
  exp: string;
  format: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  city: string;
  skills: string[];
  applyMode: "internal" | "external";
  applyUrl: string;
};

export type CompanyVacancyRow = {
  id: string;
  slug: string;
  title: string;
  company: string;
  description: string | null;
  sphere: string;
  exp: string;
  format: string;
  type: string;
  salary_min: number | null;
  salary_max: number | null;
  city: string | null;
  skills: string[] | null;
  apply_mode: "internal" | "external";
  apply_url: string | null;
  status: CompanyVacancyStatus;
  status_reason: string | null;
  is_published: boolean;
  is_archived: boolean;
  published_at: string;
  company_id: string;
};

/** Разбор тела запроса формы вакансии (общий для POST и PATCH). */
export function parseVacancyBody(body: Record<string, unknown>): CompanyVacancyInput {
  const skills = Array.isArray(body.skills)
    ? (body.skills as unknown[]).map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20)
    : [];
  return {
    title: String(body.title ?? "").trim().slice(0, 200),
    description: String(body.description ?? "").trim().slice(0, 20000),
    sphere: String(body.sphere ?? ""),
    exp: String(body.exp ?? "none"),
    format: String(body.format ?? ""),
    type: String(body.type ?? ""),
    salaryMin: body.salaryMin != null && body.salaryMin !== "" ? Number(body.salaryMin) : null,
    salaryMax: body.salaryMax != null && body.salaryMax !== "" ? Number(body.salaryMax) : null,
    city: String(body.city ?? "").trim().slice(0, 100),
    skills,
    applyMode: body.applyMode === "external" ? "external" : "internal",
    applyUrl: String(body.applyUrl ?? "").trim().slice(0, 500),
  };
}

export function validateVacancyInput(input: Partial<CompanyVacancyInput>): string | null {
  if (input.title !== undefined && input.title.trim().length < 5) {
    return "Название вакансии - минимум 5 символов.";
  }
  if (input.description !== undefined && input.description.trim().length < 100) {
    return "Описание - минимум 100 символов: расскажите о задачах, требованиях и условиях.";
  }
  if (input.sphere !== undefined && !SPHERES.includes(input.sphere as (typeof SPHERES)[number])) {
    return "Некорректная сфера.";
  }
  if (input.exp !== undefined && !EXPS.includes(input.exp as (typeof EXPS)[number])) {
    return "Некорректный опыт.";
  }
  if (input.format !== undefined && !FORMATS.includes(input.format as (typeof FORMATS)[number])) {
    return "Некорректный формат работы.";
  }
  if (input.type !== undefined && !TYPES.includes(input.type as (typeof TYPES)[number])) {
    return "Некорректный тип занятости.";
  }
  if (
    (input.salaryMin != null && !Number.isFinite(input.salaryMin)) ||
    (input.salaryMax != null && !Number.isFinite(input.salaryMax))
  ) {
    return "Зарплата - число в рублях.";
  }
  if (
    input.salaryMin != null &&
    input.salaryMax != null &&
    input.salaryMin > input.salaryMax
  ) {
    return "Зарплата: нижняя граница больше верхней.";
  }
  if (input.applyMode === "external" && !input.applyUrl?.trim()) {
    return "Для внешнего отклика укажите ссылку.";
  }
  return null;
}

async function uniqueVacancySlug(title: string, companyName: string): Promise<string> {
  const sb = createServiceRoleClient();
  const base = transliterate(`${title} ${companyName}`) || "vacancy";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await sb
      .from("vacancies")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function statusFlags(status: CompanyVacancyStatus) {
  return {
    is_published: status === "published" || status === "archived",
    is_archived: status === "archived",
  };
}

export async function createCompanyVacancy(
  company: CompanyRow,
  input: CompanyVacancyInput,
): Promise<CompanyVacancyRow> {
  const sb = createServiceRoleClient();
  const slug = await uniqueVacancySlug(input.title, company.name);
  const search = `${input.title} ${company.name} ${input.description}`;

  const { data, error } = await sb
    .from("vacancies")
    .insert({
      slug,
      title: input.title.trim(),
      company: company.name,
      description: input.description.trim(),
      sphere: input.sphere,
      exp: input.exp,
      format: input.format,
      [typeColumn()]: input.type,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      city: input.city.trim() || null,
      skills: input.skills,
      is_published: false,
      is_archived: false,
      source: "company",
      company_id: company.id,
      status: "draft",
      apply_mode: input.applyMode,
      apply_url: input.applyMode === "external" ? input.applyUrl.trim() : null,
      company_about: company.description || null,
      company_logo_url: company.logo_url,
      ...searchPatch(search),
    })
    .select(companyVacancySelect())
    .single();

  if (error) throw new Error(`createCompanyVacancy: ${error.message}`);
  return data as unknown as CompanyVacancyRow;
}

export async function listCompanyVacancies(companyId: string): Promise<CompanyVacancyRow[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .select(companyVacancySelect())
    .eq("company_id", companyId)
    .eq("source", "company")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`listCompanyVacancies: ${error.message}`);
  return (data ?? []) as unknown as CompanyVacancyRow[];
}

export async function getCompanyVacancyBySlug(
  companyId: string,
  slug: string,
): Promise<CompanyVacancyRow | null> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .select(companyVacancySelect())
    .eq("company_id", companyId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getCompanyVacancyBySlug: ${error.message}`);
  return (data as unknown as CompanyVacancyRow) ?? null;
}

/** Данные вакансии для приёма отклика (любая компания, публичная страница). */
export async function getVacancyForApply(slug: string): Promise<{
  slug: string;
  title: string;
  company_id: string | null;
  apply_mode: string;
  status: CompanyVacancyStatus;
  is_archived: boolean;
} | null> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .select("slug,title,company_id,apply_mode,status,is_archived")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getVacancyForApply: ${error.message}`);
  return (data as {
    slug: string;
    title: string;
    company_id: string | null;
    apply_mode: string;
    status: CompanyVacancyStatus;
    is_archived: boolean;
  }) ?? null;
}

export async function updateCompanyVacancy(
  companyId: string,
  slug: string,
  input: Partial<CompanyVacancyInput>,
  options: { trusted: boolean },
): Promise<CompanyVacancyRow> {
  const existing = await getCompanyVacancyBySlug(companyId, slug);
  if (!existing) throw new Error("Вакансия не найдена");

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.sphere !== undefined) patch.sphere = input.sphere;
  if (input.exp !== undefined) patch.exp = input.exp;
  if (input.format !== undefined) patch.format = input.format;
  if (input.type !== undefined) patch[typeColumn()] = input.type;
  if (input.salaryMin !== undefined) patch.salary_min = input.salaryMin;
  if (input.salaryMax !== undefined) patch.salary_max = input.salaryMax;
  if (input.city !== undefined) patch.city = input.city.trim() || null;
  if (input.skills !== undefined) patch.skills = input.skills;
  if (input.applyMode !== undefined) {
    patch.apply_mode = input.applyMode;
    patch.apply_url = input.applyMode === "external" ? (input.applyUrl ?? "").trim() : null;
  }

  const title = (patch.title as string) ?? existing.title;
  const description = (patch.description as string) ?? existing.description ?? "";
  Object.assign(patch, searchPatch(`${title} ${existing.company} ${description}`));

  // Правка опубликованной вакансии непроверенной компанией - обратно на модерацию
  if (existing.status === "published" && !options.trusted) {
    patch.status = "pending_review";
    Object.assign(patch, statusFlags("pending_review"));
  }
  // Правка отклонённой - в черновик, причину сбрасываем
  if (existing.status === "rejected") {
    patch.status = "draft";
    patch.status_reason = null;
    Object.assign(patch, statusFlags("draft"));
  }

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .update(patch)
    .eq("company_id", companyId)
    .eq("slug", slug)
    .select(companyVacancySelect())
    .single();
  if (error) throw new Error(`updateCompanyVacancy: ${error.message}`);
  return data as unknown as CompanyVacancyRow;
}

export type VacancyStatusAction = "submit" | "archive" | "unarchive";

/**
 * Смена статуса вакансии компанией.
 *   submit:    draft|rejected -> pending_review (или сразу published для trusted)
 *   archive:   published -> archived
 *   unarchive: archived -> pending_review (снова через модерацию)
 */
export async function changeCompanyVacancyStatus(
  companyId: string,
  slug: string,
  action: VacancyStatusAction,
  options: { trusted: boolean },
): Promise<CompanyVacancyRow> {
  const existing = await getCompanyVacancyBySlug(companyId, slug);
  if (!existing) throw new Error("Вакансия не найдена");

  let next: CompanyVacancyStatus;
  if (action === "submit") {
    if (existing.status !== "draft" && existing.status !== "rejected") {
      throw new Error("Отправить на публикацию можно черновик или отклонённую вакансию.");
    }
    next = options.trusted ? "published" : "pending_review";
  } else if (action === "archive") {
    if (existing.status !== "published") {
      throw new Error("В архив можно отправить только опубликованную вакансию.");
    }
    next = "archived";
  } else {
    if (existing.status !== "archived") {
      throw new Error("Вернуть из архива можно только архивную вакансию.");
    }
    next = options.trusted ? "published" : "pending_review";
  }

  const patch: Record<string, unknown> = {
    status: next,
    status_reason: null,
    ...statusFlags(next),
  };
  if (next === "published") patch.published_at = new Date().toISOString();

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .update(patch)
    .eq("company_id", companyId)
    .eq("slug", slug)
    .select(companyVacancySelect())
    .single();
  if (error) throw new Error(`changeCompanyVacancyStatus: ${error.message}`);
  return data as unknown as CompanyVacancyRow;
}

// Модерация (админ платформы) ---------------------------------------------

export async function listVacanciesPendingReview(): Promise<CompanyVacancyRow[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .select(companyVacancySelect())
    .eq("source", "company")
    .eq("status", "pending_review")
    .order("published_at", { ascending: true });
  if (error) throw new Error(`listVacanciesPendingReview: ${error.message}`);
  return (data ?? []) as unknown as CompanyVacancyRow[];
}

export async function reviewVacancy(
  slug: string,
  approve: boolean,
  reason?: string,
): Promise<CompanyVacancyRow> {
  const next: CompanyVacancyStatus = approve ? "published" : "rejected";
  const patch: Record<string, unknown> = {
    status: next,
    status_reason: approve ? null : (reason ?? "Не прошла модерацию"),
    ...statusFlags(next),
  };
  if (approve) patch.published_at = new Date().toISOString();

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from("vacancies")
    .update(patch)
    .eq("slug", slug)
    .eq("source", "company")
    .eq("status", "pending_review")
    .select(companyVacancySelect())
    .single();
  if (error) throw new Error(`reviewVacancy: ${error.message}`);
  return data as unknown as CompanyVacancyRow;
}
