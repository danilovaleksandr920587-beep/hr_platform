/**
 * Нормализация поискового запроса перед походом в базу.
 *
 * Задача - закрыть разрыв между тем, как пишет пользователь, и тем, как
 * называется вакансия: «фронтенд» против «frontend», «тестировщик» против
 * «QA», забытая раскладка. Замеры разрыва - docs/SEARCH_AUDIT.md.
 *
 * Варианты не заменяют исходный запрос, а добавляются к нему: в SQL они
 * склеиваются через OR (public.combine_tsqueries), поэтому расширение только
 * добавляет находки и не может отобрать те, что были.
 */

/** Сколько альтернатив максимум отдаём в SQL. Каждая - отдельный tsquery. */
const MAX_ALTS = 6;

/**
 * Группы взаимозаменяемых терминов. Внутри группы каждый термин
 * взаимозаменяем с каждым.
 *
 * Намеренно НЕ включены короткие двусмысленные токены (go, ds, ts, ui) -
 * они дают больше мусора, чем находок. Морфология («аналитик» / «аналитика»)
 * тоже не нужна: её уже закрывает русский словарь в to_tsvector.
 */
const ALIAS_GROUPS: string[][] = [
  ["frontend", "фронтенд", "фронтэнд", "фронт"],
  ["backend", "бэкенд", "бекенд", "бэк"],
  ["fullstack", "фулстек", "фуллстек"],
  ["qa", "тестировщик", "тестирование", "автотест", "автотестирование"],
  ["devops", "девопс"],
  ["analyst", "аналитик"],
  ["data scientist", "дата-сайентист", "датасаентист"],
  ["data engineer", "дата-инженер"],
  ["machine learning", "машинное обучение", "ml"],
  ["python", "питон", "пайтон"],
  ["java", "джава"],
  ["javascript", "джаваскрипт"],
  ["1c", "1с"],
  ["c++", "cpp", "си++"],
  ["product manager", "продакт", "продакт-менеджер", "продуктовый менеджер"],
  ["project manager", "проджект", "проджект-менеджер", "менеджер проектов"],
  ["designer", "дизайнер"],
  ["marketing", "маркетинг", "маркетолог"],
  ["hr", "эйчар", "рекрутер", "recruiter"],
  ["sales", "продажи", "менеджер по продажам"],
  ["support", "поддержка", "техподдержка"],
  ["intern", "internship", "стажер", "стажёр", "стажировка"],
  ["junior", "джуниор", "джун"],
  ["sysadmin", "системный администратор", "сисадмин"],
  ["android", "андроид"],
  ["ios", "айос"],
  ["developer", "разработчик", "программист"],
  ["security", "безопасность", "информационная безопасность", "иб"],
];

const RU_LAYOUT = "йцукенгшщзхъфывапролджэячсмитьбю.ёйЙ";
const EN_LAYOUT = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`qQ";

function buildLayoutMap(from: string, to: string): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < from.length && i < to.length; i += 1) {
    map.set(from[i], to[i]);
    map.set(from[i].toUpperCase(), to[i]);
  }
  return map;
}

const RU_TO_EN = buildLayoutMap(RU_LAYOUT, EN_LAYOUT);
const EN_TO_RU = buildLayoutMap(EN_LAYOUT, RU_LAYOUT);

function switchLayout(text: string, map: Map<string, string>): string {
  let out = "";
  let changed = false;
  for (const ch of text) {
    const mapped = map.get(ch);
    if (mapped != null) {
      out += mapped;
      changed = true;
    } else {
      out += ch;
    }
  }
  return changed ? out : "";
}

/** Символы, считающиеся частью слова - для границ при подстановке алиасов.
    \b из JS работает только по ASCII, поэтому границы задаём явно. */
const WORD_CHAR = "[0-9A-Za-zА-Яа-яЁё+#]";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termPattern(term: string): RegExp {
  return new RegExp(
    `(?<!${WORD_CHAR})${escapeRegExp(term)}(?!${WORD_CHAR})`,
    "gi",
  );
}

/** Приводит запрос к виду, пригодному для поиска: без лишних пробелов, в
    нижнем регистре. Схлопывание пробелов важно: «python   junior» и
    «python junior» должны быть одним запросом (и одним ключом кеша). */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Альтернативные формулировки запроса. Исходный запрос в результат НЕ входит -
 * он передаётся в SQL отдельным параметром.
 */
export function expandQuery(raw: string): string[] {
  const base = normalizeQuery(raw);
  if (!base) return [];

  const seen = new Set<string>([base]);
  const alts: string[] = [];

  const add = (candidate: string) => {
    const value = normalizeQuery(candidate);
    if (!value || seen.has(value)) return;
    seen.add(value);
    alts.push(value);
  };

  // Алиасы. Подстановки накапливаются: «фронтенд разработчик» даст и
  // «frontend разработчик», и «frontend developer».
  for (const group of ALIAS_GROUPS) {
    if (alts.length >= MAX_ALTS) break;
    // Самый длинный совпавший термин: в «продакт-менеджер» должен сработать
    // «продакт-менеджер», а не «продакт».
    const hit = group
      .filter((term) => termPattern(term).test(base))
      .sort((a, b) => b.length - a.length)[0];
    if (!hit) continue;

    for (const source of [base, ...alts]) {
      if (alts.length >= MAX_ALTS) break;
      if (!termPattern(hit).test(source)) continue;
      for (const term of group) {
        if (term === hit || alts.length >= MAX_ALTS) continue;
        add(source.replace(termPattern(hit), term));
      }
    }
  }

  // Раскладка - в конце, по остаточному принципу. Если сработали алиасы,
  // значит запрос осмысленный и забытая раскладка ему не нужна; а на
  // абракадабре ни один алиас не сработает, и место точно останется.
  // Отдельного запроса это не стоит: всё уходит одним OR.
  add(switchLayout(base, RU_TO_EN));
  add(switchLayout(base, EN_TO_RU));

  return alts.slice(0, MAX_ALTS);
}
