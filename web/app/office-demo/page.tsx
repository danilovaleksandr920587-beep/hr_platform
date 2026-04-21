import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { OfficeDashboard } from "@/components/office/OfficeDashboard";
import "@/styles/office-mockup.css";

export const metadata: Metadata = {
  title: "Личный кабинет (демо)",
  description: "Тестовый просмотр макета кабинета без входа.",
  robots: { index: false, follow: false },
};

export default function OfficeDemoPage() {
  return (
    <>
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div
            className="panel"
            style={{
              marginBottom: "0.75rem",
              padding: "0.65rem 1rem",
              fontSize: "0.95rem",
              color: "var(--muted)",
            }}
          >
            <strong style={{ color: "var(--dark)" }}>Демо без регистрации</strong>
            {" — "}
            тот же интерфейс, что в{" "}
            <Link href="/office" className="text-link">
              кабинете после входа
            </Link>
            . Данные и действия здесь условные.
          </div>
        </div>
      </div>
      <OfficeDashboard email="demo@careerlab.local" displayName="Тестовый пользователь" />
      <SiteFooter />
    </>
  );
}
