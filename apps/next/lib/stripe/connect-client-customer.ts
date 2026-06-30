import { getStripeClient } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

export async function getOrCreateConnectClientCustomer(params: {
  supabase: DbClient
  connectAccountId: string
  clientId: string
  email: string
  name?: string | null
}): Promise<string> {
  const { data: client } = await params.supabase
    .from('clients')
    .select('stripe_customer_id, full_name, email')
    .eq('id', params.clientId)
    .single()

  if (client?.stripe_customer_id) {
    return client.stripe_customer_id
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const stripe = getStripeClient()
  const customer = await stripe.customers.create(
    {
      email: params.email.trim() || client?.email?.trim() || undefined,
      name: params.name?.trim() || client?.full_name?.trim() || undefined,
      metadata: {
        client_id: params.clientId,
        billing_scope: 'client',
      },
    },
    { stripeAccount: params.connectAccountId }
  )

  const { error } = await admin
    .from('clients')
    .update({ stripe_customer_id: customer.id })
    .eq('id', params.clientId)

  if (error) {
    throw error
  }

  return customer.id
}
