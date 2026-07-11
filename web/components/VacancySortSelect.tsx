"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "Сначала новые" },
  { value: "salary_desc", label: "По зарплате ↓" },
  { value: "salary_asc", label: "По зарплате ↑" },
];

export function VacancySortSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      className="sort-select"
      aria-label="Сортировка"
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "new") params.delete("sort");
        else params.set("sort", e.target.value);
        const qs = params.toString();
        router.push(qs ? `/vacancies?${qs}` : "/vacancies", { scroll: false });
      }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
