'use client'

import * as React from 'react'
import { ClipboardList } from 'lucide-react'

import { AddAssessmentTemplateButton } from '@/components/assessment-templates/assessment-template-form-dialog'
import { AssessmentTemplateRowActions } from '@/components/assessment-templates/assessment-template-row-actions'
import { Card, CardContent } from '@/components/ui/card'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
} from 'app/types/database'

export function AssessmentTemplateLibrary({
  initialTemplates,
  catalog,
}: {
  initialTemplates: AssessmentTemplateWithItems[]
  catalog: AssessmentItem[]
}) {
  const [templates, setTemplates] = React.useState(initialTemplates)

  function upsertTemplate(template: AssessmentTemplateWithItems) {
    setTemplates((current) =>
      [...current.filter((row) => row.id !== template.id), template].sort(
        (a, b) => a.name.localeCompare(b.name)
      )
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Build reusable test lists for initial assessments, re-tests, or
          sport-specific screens. Coaches can still adjust the tests before
          scoring a client.
        </p>
        <AddAssessmentTemplateButton
          catalog={catalog}
          onSaved={upsertTemplate}
        />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-20 text-center">
            <div className="empty-state-icon">
              <ClipboardList className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No assessment templates yet</p>
              <p className="text-muted-foreground max-w-md text-sm">
                Create a template once, then apply its test list whenever you
                start an assessment.
              </p>
            </div>
            <div className="pt-2">
              <AddAssessmentTemplateButton
                catalog={catalog}
                onSaved={upsertTemplate}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const availableItems = template.items
              .map((row) => row.assessment_item)
              .filter((item): item is AssessmentItem => Boolean(item))
            return (
              <Card key={template.id} className="py-0">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-medium">{template.name}</h2>
                      {template.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {template.description}
                        </p>
                      ) : null}
                    </div>
                    <AssessmentTemplateRowActions
                      template={template}
                      catalog={catalog}
                      onUpdated={upsertTemplate}
                      onDeleted={(templateId) =>
                        setTemplates((current) =>
                          current.filter((row) => row.id !== templateId)
                        )
                      }
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                      {availableItems.length} test
                      {availableItems.length === 1 ? '' : 's'}
                    </p>
                    <ol className="grid gap-1">
                      {availableItems.map((item, index) => (
                        <li key={item.id} className="text-sm">
                          <span className="text-muted-foreground mr-2">
                            {index + 1}.
                          </span>
                          {item.name}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
