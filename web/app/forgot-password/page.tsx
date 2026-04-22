import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  description: "Запрос ссылки для восстановления пароля.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Забыли пароль?</h1>
        <p className="hero-text">
          Укажите email аккаунта. Если он существует, мы отправим ссылку для смены пароля.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}

