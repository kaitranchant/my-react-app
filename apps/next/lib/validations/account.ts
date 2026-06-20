import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export type DeleteAccountFormValues = {
  password: string
  confirmation: string
}

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z
    .string()
    .min(1, 'Type DELETE to confirm')
    .refine((value) => value === 'DELETE', {
      message: 'Type DELETE to confirm',
    }),
})

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>
