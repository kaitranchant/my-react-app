import { z } from 'zod'

const optionalUuid = z
  .string()
  .uuid()
  .or(z.literal(''))
  .nullable()
  .optional()

export const onboardingAutomationSchema = z.object({
  defaultOnboardingProgramId: optionalUuid,
  onboardingWelcomeTemplateId: optionalUuid,
})

export type OnboardingAutomationValues = z.infer<
  typeof onboardingAutomationSchema
>

export function normalizeOnboardingAutomationValues(
  values: OnboardingAutomationValues
) {
  return {
    defaultOnboardingProgramId:
      values.defaultOnboardingProgramId?.trim() || null,
    onboardingWelcomeTemplateId:
      values.onboardingWelcomeTemplateId?.trim() || null,
  }
}
