export type VacancyRow = {
  id: string;
  slug: string;
  title: string;
  company: string;
  description: string | null;
  sphere: string;
  exp: string;
  format: string;
  type: string;
  salary_min: number | null;
  salary_max: number | null;
  search_document: string | null;
  featured: boolean;
  published_at: string;
};

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: string;
  read_time: number;
  excerpt: string;
  body: string;
  is_new: boolean;
  cat_slug: string;
  layout: string | null;
  published_at: string;
};
