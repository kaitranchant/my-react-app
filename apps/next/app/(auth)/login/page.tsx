import { AuthForm } from '@/components/auth/auth-form'
import { login } from '@/app/(auth)/actions'

export const metadata = {
  title: 'Sign in — Coaching App',
}

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />
}
