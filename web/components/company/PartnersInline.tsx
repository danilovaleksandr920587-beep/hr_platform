import Link from "next/link";
import { listPublicCompanies } from "@/lib/company/public";

/**
 * Нативный блок партнёров для контентных поверхностей (разбор резюме и т.п.).
 * Рендерится ТОЛЬКО когда есть verified-компании: пока партнёров нет - ничего
 * не показываем, чтобы не вести на пустой каталог. Сам тянет данные (server
 * component), устойчив к недоступной БД (-> null).
 */
export async function PartnersInline({
  heading = "Компании, готовые смотреть кандидатов без опыта",
  limit = 6,
}: {
  heading?: string;
  limit?: number;
}) {
  const companies = await listPublicCompanies().catch(() => []);
  const partners = companies.slice(0, limit);
  if (partners.length === 0) return null;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="panel partners-inline">
          <p className="partners-inline-head">{heading}</p>
          <div className="partners-inline-items">
            {partners.map((c) => (
              <Link key={c.id} href={`/companies/${c.slug}`} className="partner-chip">
                {c.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="partner-chip-logo" src={c.logo_url} alt={c.name} />
                ) : null}
                <span className="partner-chip-name">{c.name}</span>
              </Link>
            ))}
          </div>
          <Link className="text-link partners-inline-all" href="/companies">
            Все проверенные работодатели →
          </Link>
        </div>
      </div>
    </section>
  );
}
