/**
 * Отсечение ботов на входе в трекинг.
 *
 * Зачем: vacancy_stats сейчас считает всех подряд, и просмотры вакансий там
 * завышены краулерами. Список намеренно грубый - цель не поймать всех, а убрать
 * очевидный шум поисковых и SEO-роботов, которые ходят по сайту тысячами.
 */
const BOT_RE =
  /(bot|crawler|spider|crawling|slurp|yandex(?!bot-mobile-test)|googlebot|bingpreview|mediapartners|ahrefs|semrush|mj12|dotbot|petalbot|facebookexternalhit|whatsapp|telegrambot|headlesschrome|phantomjs|python-requests|curl\/|wget|scrapy|go-http-client|node-fetch|axios\/|lighthouse|pagespeed|gtmetrix|uptime|monitor)/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true; // запрос без User-Agent - точно не человек
  return BOT_RE.test(ua);
}

export function deviceFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return "unknown";
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}
