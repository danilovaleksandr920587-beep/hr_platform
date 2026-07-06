import "server-only";
import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!sql) {
    // max: 10 - при max: 1 все SQL-запросы процесса шли через одно
    // соединение и под параллельными пользователями вставали в очередь.
    // idle_timeout закрывает простаивающие соединения.
    sql = postgres(url, { max: 10, idle_timeout: 30 });
  }
  return sql;
}
