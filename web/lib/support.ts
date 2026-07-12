/**
 * Email поддержки платформы. NEXT_PUBLIC_ - инлайнится в бандл на сборке,
 * поэтому значение можно использовать и в серверных, и в клиентских компонентах.
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@lab-career.ru";
