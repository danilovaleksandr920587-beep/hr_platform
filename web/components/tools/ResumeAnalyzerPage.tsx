"use client";

import Link from "next/link";
import { InlineResumeAnalyzer } from "@/components/office/InlineResumeAnalyzer";

function DocIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function ResumeAnalyzerPage({ userScope }: { userScope?: string | null }) {
  if (!userScope) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="ra-gate">
            <div className="ra-gate-icon">
              <DocIcon />
            </div>
            <h1 className="ra-gate-title">AI-разбор резюме</h1>
            <p className="ra-gate-text">
              Загрузи резюме - получишь детальный разбор с конкретными рекомендациями.
              Доступно бесплатно после регистрации.
            </p>
            <a className="btn-dark" href="/login?next=/tools/resume-analyzer">
              Войти или зарегистрироваться
            </a>
            <p className="ra-gate-note">
              Уже есть аккаунт?{" "}
              <Link href="/login?next=/tools/resume-analyzer">Войти</Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="ra-standalone-head">
          <h1 className="ra-standalone-title">AI-разбор резюме</h1>
          <p className="ra-standalone-sub">
            Загрузи PDF или вставь текст - получишь оценку и конкретные рекомендации.
          </p>
        </div>
        <InlineResumeAnalyzer userScope={userScope} />
      </div>
    </main>
  );
}
