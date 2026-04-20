import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SalaryCalculatorPage } from "@/components/tools/SalaryCalculatorPage";
import "@/styles/salary-calculator.css";

export const metadata: Metadata = {
  title: "Зарплатный калькулятор",
  description:
    "Интерактивный калькулятор зарплат по направлениям, уровням и городам.",
};

export default function SalaryCalculatorRoutePage() {
  return (
    <>
      <SalaryCalculatorPage />
      <SiteFooter />
    </>
  );
}
