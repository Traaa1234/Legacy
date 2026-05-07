export const CHAPTERS = [
  { slug: 'early_childhood',    label: 'Early Childhood' },
  { slug: 'school_years',       label: 'School Years' },
  { slug: 'young_adulthood',    label: 'Young Adulthood' },
  { slug: 'building_a_family',  label: 'Building a Family' },
  { slug: 'career_and_work',    label: 'Career & Work' },
  { slug: 'reflections_wisdom', label: 'Reflections & Wisdom' },
  { slug: 'memorable_stories',  label: 'Memorable Stories on Your Mind' },
  { slug: 'practical_skills',   label: 'Information, Knowledge & Practical Skills' },
] as const;

export type ChapterSlug = (typeof CHAPTERS)[number]['slug'];

const SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  CHAPTERS.map((c) => [c.slug, c.label]),
);

export function getChapterLabel(slug: string): string {
  const label = SLUG_TO_LABEL[slug];
  if (!label) throw new Error(`Unknown chapter slug: ${slug}`);
  return label;
}

export function isValidChapterSlug(slug: string): slug is ChapterSlug {
  return slug in SLUG_TO_LABEL;
}
