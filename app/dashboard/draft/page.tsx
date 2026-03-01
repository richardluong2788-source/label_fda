import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LabelDraftBuilder } from '@/components/label-draft-builder'

export default async function DraftPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  return <LabelDraftBuilder />
}
