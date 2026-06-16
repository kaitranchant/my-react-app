import { AuthForm } from '@/components/auth/auth-form'
import { signup } from '@/app/(auth)/actions'

export const metadata = {
  title: 'Sign up — Coaching App',
}

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />
}
