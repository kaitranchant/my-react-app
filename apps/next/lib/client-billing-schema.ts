import { isMissingTableError } from '@/components/library/schema-setup-notice'

export const CLIENT_BILLING_SQL_FILE = 'apply-client-billing.sql'

export const CLIENT_BILLING_SCHEMA_TABLES = [
  'profiles (Stripe Connect columns)',
  'clients (stripe_customer_id)',
  'client_invoices',
  'client_billing_subscriptions',
]

export function isClientBillingSchemaError(message: string): boolean {
  const normalized = message.toLowerCase()

  if (isMissingTableError(message)) {
    return (
      normalized.includes('client_invoices') ||
      normalized.includes('client_billing_subscriptions')
    )
  }

  return (
    normalized.includes('stripe_connect_account_id') ||
    normalized.includes('stripe_connect_charges_enabled') ||
    normalized.includes('client_invoice_status') ||
    normalized.includes('client_subscription_status') ||
    normalized.includes('client_billing_interval') ||
    normalized.includes('42703') ||
    normalized.includes('pgrst204')
  )
}

export function findClientBillingSchemaError(
  errors: Array<{ message: string } | null | undefined>
): string | null {
  for (const error of errors) {
    if (error && isClientBillingSchemaError(error.message)) {
      return error.message
    }
  }
  return null
}
