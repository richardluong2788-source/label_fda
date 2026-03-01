import { redirect } from 'next/navigation'

export default function ManualEntryPage() {
  // This route is deprecated - redirect to the correct draft page
  redirect('/dashboard/draft')
}
