import type { SupabaseClient } from '@supabase/supabase-js'

import { getStripeClient } from '@/lib/stripe/config'
import type { Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

export async function getOrCreateStripeCustomer(params: {
  supabase: DbClient
  admin: NonNullable<ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>>
  coachId: string
  email: string
  name?: string | null
}): Promise<string> {
  const { data: profile } = await params.supabase
    .from('profiles')
    .select('stripe_customer_id, full_name, business_name')
    .eq('id', params.coachId)
    .single()

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id
  }

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: params.email,
    name:
      params.name?.trim() ||
      profile?.business_name?.trim() ||
      profile?.full_name?.trim() ||
      undefined,
    metadata: {
      coach_id: params.coachId,
    },
  })

  const { error } = await params.admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', params.coachId)

  if (error) {
    throw error
  }

  return customer.id
}
