import { redirect } from 'next/navigation'

export default async function SchoolPortalPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>
}) {
  const { schoolSlug } = await params
  redirect(`/voting?school=${encodeURIComponent(schoolSlug)}`)
}
