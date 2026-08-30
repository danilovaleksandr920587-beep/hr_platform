import type { Metadata } from "next";
import { AnalyticsTabs } from "@/components/admin/analytics/Tabs";
import "@/styles/analytics-dashboard.css";

export const metadata: Metadata = {
  title: "Аналитика CareerLab",
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="an-wrap">
      <AnalyticsTabs />
      {children}
    </main>
  );
}
