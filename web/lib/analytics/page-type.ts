/**
 * Тип страницы и сущность по пути. Общий модуль: одинаково нужен и клиенту
 * (page_view), и серверу (проверка того, что прислал клиент).
 *
 * Внутренние разделы (кабинеты, админка, служебные роуты) сознательно не
 * трекаются: своя работа в дашборде - это шум, а не данные о пользователях.
 */

export type PageContext = {
  pageType: string;
  entityType?: string;
  entityId?: string;
};

const KB_CLUSTERS = new Set(["resume", "interview", "test", "salary", "apply", "career"]);

/**
 * Кабинеты партнёров и админка: их активность видна прямо в таблицах БД,
 * а в потоке событий она только шумит. Личный кабинет студента (/office),
 * наоборот, трекаем - это середина воронки.
 */
const UNTRACKED_PREFIXES = ["/company", "/vuz", "/admin", "/api", "/auth"];

export function isTrackedPath(path: string): boolean {
  return !UNTRACKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}-`));
}

export function pageContextFromPath(rawPath: string): PageContext {
  const path = (rawPath.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);

  if (path === "/") return { pageType: "home" };

  switch (parts[0]) {
    case "vacancies":
      if (parts.length === 1) return { pageType: "vacancies" };
      if (parts[2] === "apply") {
        return { pageType: "vacancy_apply", entityType: "vacancy", entityId: parts[1] };
      }
      return { pageType: "vacancy", entityType: "vacancy", entityId: parts[1] };

    case "knowledge-base":
      if (parts.length === 1) return { pageType: "kb" };
      if (KB_CLUSTERS.has(parts[1])) {
        return { pageType: "kb_hub", entityType: "cluster", entityId: parts[1] };
      }
      return { pageType: "article", entityType: "article", entityId: parts[1] };

    case "tools":
      return { pageType: "tool", entityType: "tool", entityId: parts[1] ?? "unknown" };

    case "companies":
      return parts.length === 1
        ? { pageType: "companies" }
        : { pageType: "company_public", entityType: "company", entityId: parts[1] };

    case "universities":
      return parts.length === 1
        ? { pageType: "universities" }
        : { pageType: "university_public", entityType: "university", entityId: parts[1] };

    case "research":
      return { pageType: "research" };
    case "for-companies":
      return { pageType: "for_companies" };
    case "login":
      return { pageType: "login" };
    case "office":
      return { pageType: parts[1] ? `office_${parts[1].replace(/-/g, "_")}` : "office" };
    default:
      return { pageType: "other" };
  }
}
