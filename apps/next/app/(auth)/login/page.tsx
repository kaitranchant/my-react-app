import { AuthForm } from '@/components/auth/auth-form'

export const metadata = {
  title: 'Sign in — Coaching App',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const redirectTo =
    next?.startsWith('/') && !next.startsWith('//') ? next : undefined

  return <AuthForm mode="login" redirectTo={redirectTo} />
}
