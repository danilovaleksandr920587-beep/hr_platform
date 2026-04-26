"use client";

import Link from "next/link";
import { InlineResumeAnalyzer } from "@/components/office/InlineResumeAnalyzer";

export function ResumeAnalyzerPage({ userScope }: { userScope?: string | null }) {
  if (!userScope) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div style={{
            background: "var(--lime)",
            borderRadius: 24,
            padding: "48px 40px",
            textAlign: "center",
            marginTop: 32,
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
            <h1 className="page-title" style={{ marginBottom: 12, fontSize: "clamp(1.4rem,3vw,2rem)" }}>
              AI-разбор резюме
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(13,15,8,0.65)", marginBottom: 32, maxWidth: 380, margin: "0 auto 32px" }}>
              Загрузи резюме — получишь детальный разбор с конкретными рекомендациями.
              Доступно бесплатно после регистрации.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="/login?next=/tools/resume-analyzer"
                style={{
                  background: "var(--dark)",
                  color: "#fff",
                  padding: "14px 28px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Войти или зарегистрироваться
              </a>
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: "rgba(13,15,8,0.4)" }}>
              Уже есть аккаунт?{" "}
              <Link href="/login?next=/tools/resume-analyzer" style={{ color: "rgba(13,15,8,0.6)", fontWeight: 600 }}>
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ paddingTop: 16 }}>
          <div className="section-hdr" style={{ marginBottom: 20 }}>
            <span className="section-hdr-title">AI-разбор резюме</span>
          </div>
          <InlineResumeAnalyzer userScope={userScope} />
        </div>
      </div>
    </div>
  );
}
