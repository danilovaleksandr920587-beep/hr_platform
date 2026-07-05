import "server-only";
import { getSql } from "@/lib/db/postgres";

export type NotificationType =
  | "application_new"
  | "application_status"
  | "company_invite"
  | "company_moderation"
  | "vacancy_moderation";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/**
 * Создать in-app уведомление. Никогда не роняет вызывающий код: ошибка
 * (например, notifications ещё не мигрирована) уходит в лог. Уведомления -
 * побочный эффект события, не критичный путь.
 */
export async function pushNotification(
  accountId: string,
  type: NotificationType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      insert into notifications (account_id, type, payload)
      values (${accountId}, ${type}, ${sql.json(payload as never)})
    `;
  } catch (e) {
    console.error("pushNotification failed:", e);
  }
}

/** Разослать одно уведомление нескольким аккаунтам (одним запросом). */
export async function pushNotificationMany(
  accountIds: string[],
  type: NotificationType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const ids = [...new Set(accountIds.filter(Boolean))];
  if (!ids.length) return;
  try {
    const sql = getSql();
    await sql`
      insert into notifications (account_id, type, payload)
      select unnest(${ids}::uuid[]), ${type}, ${sql.json(payload as never)}
    `;
  } catch (e) {
    console.error("pushNotificationMany failed:", e);
  }
}

export async function listNotifications(
  accountId: string,
  limit = 30,
): Promise<{ items: NotificationRow[]; unread: number }> {
  const sql = getSql();
  const items = (await sql`
    select id, type, payload, read_at, created_at
    from notifications
    where account_id = ${accountId}
    order by created_at desc
    limit ${limit}
  `) as NotificationRow[];
  const unreadRows = (await sql`
    select count(*)::int as n
    from notifications
    where account_id = ${accountId} and read_at is null
  `) as { n: number }[];
  return { items, unread: unreadRows[0]?.n ?? 0 };
}

export async function unreadCount(accountId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    select count(*)::int as n
    from notifications
    where account_id = ${accountId} and read_at is null
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

/** Отметить прочитанными: все, либо конкретные id. */
export async function markRead(accountId: string, ids?: string[]): Promise<void> {
  const sql = getSql();
  if (ids && ids.length) {
    await sql`
      update notifications set read_at = now()
      where account_id = ${accountId} and read_at is null and id = any(${ids}::bigint[])
    `;
  } else {
    await sql`
      update notifications set read_at = now()
      where account_id = ${accountId} and read_at is null
    `;
  }
}

// Настройки email-уведомлений по типам --------------------------------------

/** Email-уведомление типа type включено? По умолчанию (нет строки) - да. */
export async function isEmailEnabled(accountId: string, type: NotificationType): Promise<boolean> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select email_prefs from notification_prefs where account_id = ${accountId} limit 1
    `) as { email_prefs: Record<string, boolean> }[];
    const prefs = rows[0]?.email_prefs;
    if (!prefs || prefs[type] === undefined) return true;
    return prefs[type] !== false;
  } catch {
    return true;
  }
}

export async function getEmailPrefs(accountId: string): Promise<Record<string, boolean>> {
  const sql = getSql();
  const rows = (await sql`
    select email_prefs from notification_prefs where account_id = ${accountId} limit 1
  `) as { email_prefs: Record<string, boolean> }[];
  return rows[0]?.email_prefs ?? {};
}

export async function setEmailPrefs(
  accountId: string,
  prefs: Record<string, boolean>,
): Promise<void> {
  const sql = getSql();
  await sql`
    insert into notification_prefs (account_id, email_prefs, updated_at)
    values (${accountId}, ${sql.json(prefs)}, now())
    on conflict (account_id) do update set
      email_prefs = ${sql.json(prefs)},
      updated_at = now()
  `;
}
