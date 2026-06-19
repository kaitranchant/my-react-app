type PostgrestError = {
  message: string
  code?: string
}

export function formatSupabaseError(error: PostgrestError): string {
  if (
    error.code === 'PGRST205' &&
    error.message.includes('client_check_ins')
  ) {
    return 'Check-ins are not set up on this database yet. Run supabase/apply-client-check-ins.sql and supabase/apply-check-in-fields.sql in the Supabase SQL editor, then try again.'
  }

  return error.message
}
