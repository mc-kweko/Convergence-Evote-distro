export function slugifySchoolName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function hasSchoolEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  return domain.includes('school') || domain.includes('edu')
}

export function normalizeSchoolSlug(slug: string): string {
  return slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
}
