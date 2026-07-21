import { fetchAssessmentCatalog } from '@/app/(dashboard)/clients/assessment-actions'
import { fetchAssessmentTemplates } from '@/app/(dashboard)/library/assessment-templates/actions'
import { AssessmentTemplateLibrary } from '@/components/assessment-templates/assessment-template-library'

export const metadata = {
  title: 'Assessment templates — Library — Coaching App',
}

export default async function LibraryAssessmentTemplatesPage() {
  const [templates, catalog] = await Promise.all([
    fetchAssessmentTemplates(),
    fetchAssessmentCatalog(),
  ])

  return (
    <AssessmentTemplateLibrary
      initialTemplates={templates}
      catalog={catalog}
    />
  )
}
